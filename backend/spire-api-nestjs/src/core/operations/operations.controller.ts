import {
  All, Body, Controller, ForbiddenException, HttpCode, HttpStatus,
  NotFoundException, Post, Query, Req, Res, Param,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Request, Response } from 'express';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import {
  IOperation,
  IStreamOperation,
  OpMeta,
  OperationBaseCore,
  OperationContext,
} from './operation.contracts';
import { OperationRegistry, StreamAbortRegistry } from './operation.registry';

function wantsSse(req: Request) {
  return (req.headers['accept'] || '').toString().includes('text/event-stream');
}

@Controller()
export class OperationsController {
  constructor(
    private readonly reg: OperationRegistry,
    private readonly aborts: StreamAbortRegistry,
    private readonly moduleRef: ModuleRef, // reliable DI resolution
  ) {}

  @Post('/api/streams/cancel')
  @HttpCode(HttpStatus.ACCEPTED)
  cancel(@Body() body: { requestId?: string }) {
    if (!body?.requestId) return { cancelled: false, message: 'RequestId is required.' };
    const ok = this.aborts.cancel(body.requestId);
    return ok
      ? { cancelled: true, message: 'Cancellation requested.' }
      : { cancelled: false, message: 'No active stream with that RequestId.' };
  }

  // Keep the generic dispatcher OUT of Swagger, and use the new path-to-regexp syntax
  @ApiExcludeEndpoint()
  @All('/api/*path') // named wildcard param per path-to-regexp v6+
  async handle(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Query() query: any,
    @Param('path') _wild: string, // consume the wildcard
  ) {
    const route = req.path;                  // e.g., "/api/hello/say"
    const method = req.method.toUpperCase(); // e.g., "POST"

    const entry =
      this.reg.all.find(e => e.route.toLowerCase() === route.toLowerCase() && e.method === method) ||
      this.reg.all.find(e => e.route.toLowerCase() === route.toLowerCase());

    if (!entry) throw new NotFoundException(`No operation for ${method} ${route}`);

    // Resolve the operation instance from DI; fallback to create if not registered (edge cases)
    let op: any = this.moduleRef.get(entry.ctor, { strict: false });
    if (!op) op = await this.moduleRef.create(entry.ctor as any);
    if (!op) throw new NotFoundException(`Operation provider not found for ${entry.ctor.name}`);

    const reqDto = (method === 'GET' || method === 'DELETE') ? query : body;

    const requestId = (req.header('X-Client-Request-Id') || '').trim() || crypto.randomUUID();
    res.setHeader('X-Request-Id', requestId);

    const ctx: OperationContext = { userId: (req as any).user?.sub ?? null, requestId };

    if (op instanceof OperationBaseCore) {
      op.setUser(ctx.userId);
      op.setOperationContext(ctx);
      const ok = await op._authorize(reqDto);
      if (!ok) throw new ForbiddenException();
      const errors = await op._validate(reqDto);
      if (errors && errors.length) return res.status(400).json({ errors });
      await op._onBefore(reqDto);
    }

    const isStream = entry.isStream && (op.executeStream instanceof Function);
    if (!isStream) {
      const result = await (op as IOperation<any, any>).execute(reqDto, ctx);
      if (op instanceof OperationBaseCore) await op._onAfter(reqDto);
      return res.json(result);
    }

    const format = OpMeta.stream(entry.ctor) || (wantsSse(req) ? 'sse' : 'ndjson');
    const ac = new AbortController();
    this.aborts.tryRegister(requestId, ac);

    try {
      const iter = (op as IStreamOperation<any, any>).executeStream(reqDto, ctx);
      if (format === 'sse') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        for await (const frame of iter) {
          if (ac.signal.aborted) break;
          res.write('event: message\n');
          res.write(`data: ${JSON.stringify(frame)}\n\n`);
        }
        res.end();
      } else {
        res.setHeader('Content-Type', 'application/x-ndjson');
        for await (const frame of iter) {
          if (ac.signal.aborted) break;
          res.write(JSON.stringify(frame) + '\n');
        }
        res.end();
      }
    } finally {
      this.aborts.remove(requestId);
      if (op instanceof OperationBaseCore) await op._onAfter(reqDto);
    }
  }
}
