import 'reflect-metadata';

export type HttpMethod = 'GET'|'POST'|'PUT'|'DELETE';
export type StreamFormat = 'ndjson'|'sse';

export interface OperationContext {
  userId?: string | null;
  requestId?: string;
}

export abstract class OperationBaseCore<TRequest> {
  protected userId?: string | null;
  setUser(userId?: string | null) { this.userId = userId ?? null; }
  setOperationContext(_ctx: OperationContext) {}

  protected async onBefore(_req: TRequest): Promise<void> {}
  protected async authorize(_req: TRequest): Promise<boolean> { return true; }
  protected async validate(_req: TRequest): Promise<string[] | null> { return null; }
  protected async onAfter(_req: TRequest): Promise<void> {}

  // helpers for adapters
  async _onBefore(req: TRequest) { await this.onBefore(req); }
  async _authorize(req: TRequest) { return this.authorize(req); }
  async _validate(req: TRequest) { return this.validate(req); }
  async _onAfter(req: TRequest) { await this.onAfter(req); }
}

export interface IOperation<TReq, TRes> {
  execute(req: TReq, ctx: OperationContext): Promise<TRes>;
}

export interface IStreamOperation<TReq, TFrame> {
  executeStream(req: TReq, ctx: OperationContext): AsyncIterable<TFrame>;
}

export interface IHubOperation<TStart> {
  onConnect(start: TStart, ctx: OperationContext): Promise<void>;
}

// ---------- metadata keys + decorators ----------
const META = {
  GROUP: 'op:group',
  ROUTE: 'op:route',
  METHOD: 'op:method',
  AUTH: 'op:auth',
  THROTTLE: 'op:throttle',
  STREAM: 'op:stream',
};

export function Operation(opts: {
  group?: string;             // e.g., 'hello'
  pinned?: boolean;           // keep group pinned in listings
  route?: string;             // e.g., 'hello/say' (maps to /api/hello/say)
  method?: HttpMethod;        // 'GET' | 'POST' | 'PUT' | 'DELETE'
  authorize?: string | boolean;        // policy name or true
  throttle?: 'ops-default' | 'ops-strict' | 'ops-stream';
  stream?: StreamFormat;      // 'ndjson' | 'sse' (for stream ops)
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

export function OperationGroup(name: string, pinned = false) {
  return (target: any) => Reflect.defineMetadata(META.GROUP, { name, pinned }, target);
}
export function OperationRoute(route: string) {
  return (target: any) => Reflect.defineMetadata(META.ROUTE, route, target);
}
export function OperationMethod(method: HttpMethod) {
  return (target: any) => Reflect.defineMetadata(META.METHOD, method, target);
}
export function OperationAuthorize(policy?: string) {
  return (target: any) => Reflect.defineMetadata(META.AUTH, policy ?? true, target);
}
export function OperationThrottle(policyName: 'ops-default'|'ops-strict'|'ops-stream' = 'ops-default') {
  return (target: any) => Reflect.defineMetadata(META.THROTTLE, policyName, target);
}
export function OperationStream(format: StreamFormat = 'ndjson') {
  return (target: any) => Reflect.defineMetadata(META.STREAM, format, target);
}

// getters
export const OpMeta = {
  group: (t: any) => Reflect.getMetadata(META.GROUP, t) as {name:string;pinned:boolean} | undefined,
  route: (t: any) => Reflect.getMetadata(META.ROUTE, t) as string | undefined,
  method: (t: any) => Reflect.getMetadata(META.METHOD, t) as HttpMethod | undefined,
  auth: (t: any) => Reflect.getMetadata(META.AUTH, t) as (string|boolean|undefined),
  throttle: (t: any) => Reflect.getMetadata(META.THROTTLE, t) as string | undefined,
  stream: (t: any) => Reflect.getMetadata(META.STREAM, t) as StreamFormat | undefined,
};
