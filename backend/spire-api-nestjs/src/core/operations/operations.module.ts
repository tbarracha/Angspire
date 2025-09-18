/* eslint-disable @typescript-eslint/no-var-requires */
// operations.module.ts
import 'reflect-metadata';
import {
  All, Body, Controller, HttpStatus, Injectable, Logger, Module, OnModuleInit, Post, Query, Req, Res, Type,
} from '@nestjs/common';
import { DiscoveryModule, DiscoveryService, ModuleRef, Reflector } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import fg from 'fast-glob';

import {
  IOperation, IStreamOperation, OpMeta, OperationBaseCore,
  HttpMethod, OperationContext,
} from './operations.contracts';

// Swagger helpers
import { SwaggerModule, DocumentBuilder, OpenAPIObject, getSchemaPath, ApiExcludeController } from '@nestjs/swagger';

// ==========================
// Utility: pick op classes from a module
// ==========================
function pickOperationClasses(mod: any): any[] {
  const out: any[] = [];
  for (const key of Object.keys(mod)) {
    const val = (mod as any)[key];
    if (typeof val === 'function' && val.prototype) {
      const proto = val.prototype;
      if (typeof proto.execute === 'function' || typeof proto.executeStream === 'function') out.push(val);
    }
  }
  return out;
}
function toPosix(p: string) { return p.replace(/\\/g, '/'); }
function distRoot() { return path.resolve(__dirname, '..', '..'); }

// ==========================
// Registries
// ==========================
export interface HttpRegistration {
  route: string;
  method: HttpMethod;
  policy: string;
  auth?: string | boolean;
  ctor: Type<any>;
  isStream?: boolean;
}

@Injectable()
export class StreamAbortRegistry {
  private map = new Map<string, AbortController>();
  tryRegister(key: string, c: AbortController) {
    if (this.map.has(key)) return false;
    this.map.set(key, c);
    return true;
  }
  cancel(key: string) {
    const c = this.map.get(key);
    if (!c) return false;
    c.abort();
    this.map.delete(key);
    return true;
  }
  remove(key: string) { this.map.delete(key); }
}

@Injectable()
export class OperationRegistry {
  private http: HttpRegistration[] = [];
  private dtoSet = new Set<Type<any>>();

  get all() { return this.http.slice(); }
  get allDtos() { return Array.from(this.dtoSet); }

  registerHttp(ctor: Type<any>, fallbackGroup: string) {
    const group = OpMeta.group(ctor)?.name ?? fallbackGroup;
    const name = ctor.name.replace(/Operation$/, '').toLowerCase();
    const route = `/${OpMeta.route(ctor) ?? `${group.toLowerCase()}/${name}`}`.replace(/\/+/g, '/');
    const method = OpMeta.method(ctor) ?? 'POST';
    const policy = OpMeta.throttle(ctor) ?? 'ops-default';
    const auth = OpMeta.auth(ctor);
    const isStream = !!OpMeta.stream(ctor);

    const key = `${method} ${route}`.toLowerCase();
    if (this.http.some(e => `${e.method} ${e.route}`.toLowerCase() === key)) return;

    // collect DTOs for swagger
    const dtos = OpMeta.dtos(ctor);
    if (dtos?.request) this.dtoSet.add(dtos.request);
    if (dtos?.response) this.dtoSet.add(dtos.response);

    this.http.push({ route, method, policy, auth, ctor, isStream });
  }
}

// ==========================
// Controller (single entry) – excluded from Swagger
// ==========================
const OPS_BASE = '/ops';
function wantsSse(req: Request) {
  return (req.headers['accept'] || '').toString().includes('text/event-stream');
}

@ApiExcludeController()
@Controller('ops')
export class OperationsController {
  constructor(
    private readonly reg: OperationRegistry,
    private readonly aborts: StreamAbortRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

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

  @All('*path')
  async handle(@Req() req: Request, @Res() res: Response, @Body() body: any, @Query() query: any) {
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

    let op: any = this.moduleRef.get(entry.ctor, { strict: false });
    if (!op) op = await this.moduleRef.create(entry.ctor as any);
    if (!op) {
      res.status(HttpStatus.NOT_FOUND).json({ message: `Operation provider not found for ${entry.ctor.name}` });
      return;
    }

    const reqDto = (method === 'GET' || method === 'DELETE') ? query : body;
    const requestId = (req.header('X-Client-Request-Id') || '').trim() || crypto.randomUUID();
    res.setHeader('X-Request-Id', requestId);

    const ctx: OperationContext = { userId: (req as any).user?.sub ?? null, requestId };

    try {
      if (op instanceof OperationBaseCore) {
        op.setUser(ctx.userId);
        op.setOperationContext(ctx);
        const ok = await op._authorize(reqDto);
        if (!ok) { res.status(HttpStatus.FORBIDDEN).json({ message: 'Forbidden' }); return; }
        const errors = await op._validate(reqDto);
        if (errors?.length) { res.status(HttpStatus.BAD_REQUEST).json({ errors }); return; }
        await op._onBefore(reqDto);
      }

      const isStream = entry.isStream && (op.executeStream instanceof Function);
      if (!isStream) {
        const result = await (op as IOperation<any, any>).execute(reqDto, ctx);
        if (op instanceof OperationBaseCore) await op._onAfter(reqDto);
        res.status(HttpStatus.OK).json(result);
        return;
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
    } catch (err: any) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal error', error: err?.message ?? String(err) });
    }
  }
}

// ==========================
// Mapper (discovery → registry)
// ==========================
@Injectable()
class OperationMapper implements OnModuleInit {
  private readonly logger = new Logger('OperationMapper');
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly reg: OperationRegistry,
  ) {}

  onModuleInit() {
    const providers = this.discovery.getProviders();
    let candidates = 0;
    let registered = 0;

    for (const p of providers) {
      const target = p.metatype as any;
      if (!target || typeof target !== 'function') continue;

      const proto = target.prototype;
      const hasExec = proto?.execute instanceof Function;
      const hasStream = proto?.executeStream instanceof Function;
      if (!hasExec && !hasStream) continue;

      candidates++;
      const group = OpMeta.group(target)?.name ?? 'operations';
      this.reg.registerHttp(target, group);
      registered++;
    }

    const endpoints = this.reg.all;
    this.logger.log(`Operation candidates: ${candidates}; registered: ${registered}`);
    if (endpoints.length === 0) {
      this.logger.warn('No HTTP operations registered. Check auto-discovery patterns and build outputs.');
    } else {
      this.logger.log(`Discovered endpoints (${endpoints.length}):`);
      for (const e of endpoints) {
        const flags = [
          e.isStream ? 'stream' : 'classic',
          e.policy,
          e.auth ? `auth:${e.auth === true ? 'required' : e.auth}` : 'anon',
        ].join(', ');
        this.logger.log(` - [${e.method}] ${e.route}  (${flags})  <- ${e.ctor.name}`);
      }
    }
  }
}

// ==========================
// Auto-register providers from dist
// ==========================
function scanOperationFiles(logger = new Logger('AutoOps')): Type<any>[] {
  const dist = distRoot();
  const distCwd = path.resolve(process.cwd(), 'dist');
  const roots = Array.from(new Set([dist, distCwd]));
  const patterns: string[] = [];
  for (const r0 of roots) {
    const r = toPosix(r0);
    patterns.push(
      `${r}/**/*-operation.js`,
      `${r}/**/*.operation.js`,
      `${r}/src/**/*-operation.js`,
      `${r}/src/**/*.operation.js`,
    );
  }

  const files = Array.from(new Set(
    fg.sync(patterns, {
      absolute: true,
      dot: false,
      onlyFiles: true,
      ignore: ['**/*.spec.js','**/*.test.js','**/__mocks__/**','**/node_modules/**'],
    }),
  ));

  logger.log(`Matched operation files: ${files.length}`);
  const classes: Type<any>[] = [];
  const seen = new Set<any>();

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const mod = require(file);
    const picked = pickOperationClasses(mod);
    for (const c of picked) {
      if (seen.has(c)) continue;
      classes.push(c);
      seen.add(c);
      logger.debug(`   + op provider: ${c.name}`);
    }
  }
  if (classes.length === 0) {
    logger.warn('No operations found. Ensure build artifacts exist and filenames end with ".operation.ts" or "-operation.ts".');
  }
  return classes;
}

// ==========================
// Module + Public API
// ==========================
@Module({
  imports: [
    DiscoveryModule,
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 60, name: 'ops-default' },
      { ttl: 30_000, limit: 10, name: 'ops-strict' },
      { ttl: 1_000, limit: 3, name: 'ops-stream' },
    ]),
  ],
  controllers: [OperationsController],
  providers: [OperationRegistry, StreamAbortRegistry, OperationMapper],
  exports: [OperationRegistry],
})
export class OperationsModule {
  /** Adds discovered operation classes as providers/exports. Use in AppModule. */
  static registerAutoProviders(): { module: Type<any>, providers: any[], exports: any[] } {
    const logger = new Logger('OperationsModule.registerAutoProviders');
    const ops = scanOperationFiles(logger);
    return { module: OperationsModule, providers: ops, exports: ops };
  }
}

// ==========================
// Swagger setup (single entry)
// ==========================
export type SwaggerSetupOpts = {
  includeOperations?: boolean;
  opsBase?: string;            // default '/ops'
  title?: string;
  description?: string;
  version?: string;
  path?: string;               // default 'swagger'
};

function extendOpenApiWithOperations(
  _app: INestApplication,
  doc: OpenAPIObject,
  reg: OperationRegistry,
  opsBase: string,
  logger = new Logger('Swagger'),
) {
  doc.paths ||= {};
  doc.tags ||= [];

  // Explicit cancel endpoint (since controller is excluded)
  const cancelPath = `${opsBase}/streams/cancel`.replace(/\/{2,}/g, '/');
  if (!doc.paths[cancelPath]?.post) {
    doc.paths[cancelPath] = doc.paths[cancelPath] || {};
    doc.paths[cancelPath].post = {
      tags: ['Operations'],
      summary: 'Cancel stream (by requestId)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { requestId: { type: 'string' } },
              required: ['requestId'],
            },
          },
        },
      },
      responses: {
        '202': { description: 'Cancellation requested' },
        '400': { description: 'Bad Request' },
      },
    } as any;
  }

  // Concrete operation endpoints
  let added = 0;
  for (const e of reg.all) {
    const pathKey = `${opsBase}${e.route}`.replace(/\/{2,}/g, '/');
    const method = String(e.method || 'POST').toLowerCase() as 'get'|'post'|'put'|'delete';
    const group = OpMeta.group(e.ctor)?.name ?? 'Operations';

    if (!doc.tags.find(t => t.name === group)) doc.tags.push({ name: group });

    const dtos = OpMeta.dtos(e.ctor);
    const reqSchema = dtos?.request ? { $ref: getSchemaPath(dtos.request) } : { type: 'object' };
    const resSchema = dtos?.response ? { $ref: getSchemaPath(dtos.response) } : { type: 'object' };

    doc.paths[pathKey] ||= {};
    if (!doc.paths[pathKey][method]) {
      doc.paths[pathKey][method] = {
        tags: [group],
        summary: e.ctor?.name?.replace?.(/Operation$/, '') ?? 'Operation',
        description: e.isStream ? 'Streaming endpoint (NDJSON/SSE, cancelable)' : 'Operation endpoint',
        requestBody: (method === 'get' || method === 'delete') ? undefined : {
          required: true,
          content: { 'application/json': { schema: reqSchema } },
        },
        responses: {
          '200': {
            description: e.isStream ? 'OK (stream)' : 'OK',
            content: { 'application/json': { schema: resSchema } },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Too Many Requests' },
        },
      } as any;
      added++;
    } else {
      logger.warn(`OpenAPI duplicate ${method.toUpperCase()} ${pathKey} skipped.`);
    }
  }

  logger.log(`OpenAPI: added ${added} operation entr${added === 1 ? 'y' : 'ies'}.`);
}

export class OperationsSwagger {
  /** Mount Swagger (call once in main.ts) */
  static setup(app: INestApplication, opts: SwaggerSetupOpts = {}) {
    const logger = new Logger('Swagger');
    const includeOperations = !!opts.includeOperations;
    const opsBase = opts.opsBase ?? '/ops';

    const config = new DocumentBuilder()
      .setTitle(opts.title ?? 'Spire API (NestJS)')
      .setDescription(opts.description ?? (includeOperations ? 'API + Operational DDD endpoints' : 'API (operations disabled)'))
      .setVersion(opts.version ?? '1.0')
      .addBearerAuth()
      .build();

    const reg = app.get(OperationRegistry, { strict: false });
    const extraModels = includeOperations && reg ? reg.allDtos : [];

    const documentFactory = () => {
      const doc = SwaggerModule.createDocument(app, config, {
        deepScanRoutes: true,
        ignoreGlobalPrefix: true,
        extraModels,
      });
      if (includeOperations && reg) {
        extendOpenApiWithOperations(app, doc, reg, opsBase, logger);
      } else {
        logger.log('Operations excluded from Swagger.');
      }
      return doc;
    };

    const path = opts.path ?? 'swagger';
    SwaggerModule.setup(path, app, documentFactory, {
      useGlobalPrefix: false,
      customSiteTitle: 'Spire API Docs',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    });
    logger.log(`Mounted Swagger at /${path}`);
  }
}
