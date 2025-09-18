// operations.contracts.ts
import 'reflect-metadata';
import type { Type } from '@nestjs/common';

// ---------- Types ----------
export type HttpMethod = 'GET'|'POST'|'PUT'|'DELETE';
export type StreamFormat = 'ndjson'|'sse';

export interface OperationContext {
  userId?: string | null;
  requestId?: string;
}

// ---------- Base class ----------
export abstract class OperationBaseCore<TRequest> {
  protected userId?: string | null;
  setUser(userId?: string | null) { this.userId = userId ?? null; }
  setOperationContext(_ctx: OperationContext) {}

  protected async onBefore(_req: TRequest): Promise<void> {}
  protected async authorize(_req: TRequest): Promise<boolean> { return true; }
  protected async validate(_req: TRequest): Promise<string[] | null> { return null; }
  protected async onAfter(_req: TRequest): Promise<void> {}

  async _onBefore(req: TRequest) { await this.onBefore(req); }
  async _authorize(req: TRequest) { return this.authorize(req); }
  async _validate(req: TRequest) { return this.validate(req); }
  async _onAfter(req: TRequest) { await this.onAfter(req); }
}

// ---------- Operation interfaces ----------
export interface IOperation<TReq, TRes> {
  execute(req: TReq, ctx: OperationContext): Promise<TRes>;
}

export interface IStreamOperation<TReq, TFrame> {
  executeStream(req: TReq, ctx: OperationContext): AsyncIterable<TFrame>;
}

// ---------- Metadata keys ----------
const META = {
  GROUP: 'op:group',
  ROUTE: 'op:route',
  METHOD: 'op:method',
  AUTH: 'op:auth',
  THROTTLE: 'op:throttle',
  STREAM: 'op:stream',
  DTOS: 'op:dtos',
};

// ---------- Decorators ----------
export function Operation(opts: {
  group?: string; pinned?: boolean;
  route?: string; method?: HttpMethod;
  authorize?: string | boolean;
  throttle?: 'ops-default'|'ops-strict'|'ops-stream';
  stream?: StreamFormat;
}) {
  return (target: any) => {
    if (opts.group) Reflect.defineMetadata(META.GROUP, { name: opts.group, pinned: !!opts.pinned }, target);
    if (opts.route) Reflect.defineMetadata(META.ROUTE, opts.route, target);
    if (opts.method) Reflect.defineMetadata(META.METHOD, opts.method, target);
    if (opts.authorize !== undefined) Reflect.defineMetadata(META.AUTH, opts.authorize, target);
    if (opts.throttle) Reflect.defineMetadata(META.THROTTLE, opts.throttle, target);
    if (opts.stream) Reflect.defineMetadata(META.STREAM, opts.stream, target);
  };
}

export const OperationGroup = (name: string, pinned = false) =>
  (target: any) => Reflect.defineMetadata(META.GROUP, { name, pinned }, target);

export const OperationRoute = (route: string) =>
  (target: any) => Reflect.defineMetadata(META.ROUTE, route, target);

export const OperationMethod = (method: HttpMethod) =>
  (target: any) => Reflect.defineMetadata(META.METHOD, method, target);

export const OperationAuthorize = (policy?: string) =>
  (target: any) => Reflect.defineMetadata(META.AUTH, policy ?? true, target);

export const OperationThrottle = (policy: 'ops-default'|'ops-strict'|'ops-stream' = 'ops-default') =>
  (target: any) => Reflect.defineMetadata(META.THROTTLE, policy, target);

export const OperationStream = (format: StreamFormat = 'ndjson') =>
  (target: any) => Reflect.defineMetadata(META.STREAM, format, target);

// Optional DTO mapping for Swagger
export function OperationDto(opts: { request?: Type<any>; response?: Type<any> }) {
  return (target: any) => Reflect.defineMetadata(META.DTOS, opts, target);
}

// ---------- Getters ----------
export const OpMeta = {
  group: (t: any) => Reflect.getMetadata(META.GROUP, t) as {name:string;pinned:boolean} | undefined,
  route: (t: any) => Reflect.getMetadata(META.ROUTE, t) as string | undefined,
  method: (t: any) => Reflect.getMetadata(META.METHOD, t) as HttpMethod | undefined,
  auth: (t: any) => Reflect.getMetadata(META.AUTH, t) as (string|boolean|undefined),
  throttle: (t: any) => Reflect.getMetadata(META.THROTTLE, t) as string | undefined,
  stream: (t: any) => Reflect.getMetadata(META.STREAM, t) as StreamFormat | undefined,
  dtos: (t: any) => Reflect.getMetadata(META.DTOS, t) as {request?: Type<any>; response?: Type<any>} | undefined,
};
