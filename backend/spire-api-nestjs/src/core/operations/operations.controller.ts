import {
  All, Body, Controller, HttpStatus, Post, Query, Req, Res,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  IOperation, IStreamOperation, OpMeta,
  OperationBaseCore, OperationContext,
} from './operation.contracts';
import { OperationRegistry, StreamAbortRegistry } from './operation.registry';

const OPS_BASE = '/ops'; // HTTP base for all operation endpoints

function wantsSse(req: Request) {
  return (req.headers['accept'] || '').toString().includes('text/event-stream');
}

@Controller('ops') // all ops live under /ops/**
export class OperationsController {
  constructor(
    private readonly reg: OperationRegistry,
    private readonly aborts: StreamAbortRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

  // POST /ops/streams/cancel
  @Post('streams/cancel')
  async cancel(@Res() res: Response, @Body() body: { requestId?: string }) {
    if (!body?.requestId) {
      res.status(HttpStatus.BAD_REQUEST).json({ cancelled: false, message: 'RequestId is required.' });
      return;
    }
    const ok = this.aborts.cancel(body.requestId);
    res.status(HttpStatus.ACCEPTED).json(
      ok
        ? { cancelled: true, message: 'Cancellation requested.' }
        : { cancelled: false, message: 'No active stream with that RequestId.' },
    );
  }

  // v6-compliant wildcard: "*path" (NOT ":rest(*)")
  @All('*path')
  async handle(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Query() query: any,
  ) {
    // Build the absolute URL path, then normalize:
    // e.g. "/ops/hello/say" -> "/hello/say" to match registry entries
    const full = (req.originalUrl || '').split('?')[0] || `${req.baseUrl || ''}${req.path || ''}`;
    const method = req.method.toUpperCase();
    const opPath = full.startsWith(OPS_BASE) ? (full.slice(OPS_BASE.length) || '/') : full;

    const entry =
      this.reg.all.find(e => e.route.toLowerCase() === opPath.toLowerCase() && e.method === method) ||
      this.reg.all.find(e => e.route.toLowerCase() === opPath.toLowerCase());

    if (!entry) {
      res.status(HttpStatus.NOT_FOUND).json({ message: `No operation for ${method} ${full}` });
      return;
    }

    // Resolve provider
    let op: any = this.moduleRef.get(entry.ctor, { strict: false });
    if (!op) op = await this.moduleRef.create(entry.ctor as any);
    if (!op) {
      res.status(HttpStatus.NOT_FOUND).json({ message: `Operation provider not found for ${entry.ctor.name}` });
      return;
    }

    // DTO selection
    const reqDto = (method === 'GET' || method === 'DELETE') ? query : body;

    // Tracking & context
    const requestId = (req.header('X-Client-Request-Id') || '').trim() || crypto.randomUUID();
    res.setHeader('X-Request-Id', requestId);

    const ctx: OperationContext = { userId: (req as any).user?.sub ?? null, requestId };

    try {
      if (op instanceof OperationBaseCore) {
        op.setUser(ctx.userId);
        op.setOperationContext(ctx);
        const ok = await op._authorize(reqDto);
        if (!ok) {
          res.status(HttpStatus.FORBIDDEN).json({ message: 'Forbidden' });
          return;
        }
        const errors = await op._validate(reqDto);
        if (errors && errors.length) {
          res.status(HttpStatus.BAD_REQUEST).json({ errors });
          return;
        }
        await op._onBefore(reqDto);
      }

      const isStream = entry.isStream && (op.executeStream instanceof Function);
      if (!isStream) {
        const result = await (op as IOperation<any, any>).execute(reqDto, ctx);
        if (op instanceof OperationBaseCore) await op._onAfter(reqDto);
        res.status(HttpStatus.OK).json(result);
        return;
      }

      // STREAM
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
          return;
        } else {
          res.setHeader('Content-Type', 'application/x-ndjson');
          for await (const frame of iter) {
            if (ac.signal.aborted) break;
            res.write(JSON.stringify(frame) + '\n');
          }
          res.end();
          return;
        }
      } finally {
        this.aborts.remove(requestId);
        if (op instanceof OperationBaseCore) await op._onAfter(reqDto);
      }
    } catch (err: any) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal error', error: err?.message ?? String(err) });
    }
  }
}
