// src/core/operations/operations.di.ts
// di = dependency injection
import 'reflect-metadata';
import type { Type } from '@nestjs/common';
import { OpMeta } from './operations.contracts';

// Heuristics to avoid primitive/builtin types being treated as DTOs
const NON_DTO_NAMES = new Set(['Object', 'Array', 'Promise', 'String', 'Number', 'Boolean', 'Map', 'Set', 'Date']);
const isCtor = (v: any) => typeof v === 'function' && v.prototype && v.name;

export type InferredDtos = { request?: Type<any>; response?: Type<any> };

export function inferDtos(ctor: Type<any>): InferredDtos {
  // 1) explicit decorator still takes precedence
  const explicit = OpMeta.dtos(ctor);
  const out: InferredDtos = { ...explicit };

  // 2) CONVENTION: static RequestDto / ResponseDto / aliases
  const statics = {
    request:
      (ctor as any).RequestDto ||
      (ctor as any).InputDto ||
      (ctor as any).Request ||
      (ctor as any).ReqDto,
    response:
      (ctor as any).ResponseDto ||
      (ctor as any).OutputDto ||
      (ctor as any).Response ||
      (ctor as any).ResDto ||
      (ctor as any).ResultDto,
  };
  if (!out.request && isCtor(statics.request) && !NON_DTO_NAMES.has(statics.request.name)) {
    out.request = statics.request;
  }
  if (!out.response && isCtor(statics.response) && !NON_DTO_NAMES.has(statics.response.name)) {
    out.response = statics.response;
  }

  // 3) BEST-EFFORT: infer request via design:paramtypes for execute/executeStream
  if (!out.request) {
    try {
      const proto = ctor.prototype;
      const key = (proto.execute instanceof Function) ? 'execute'
        : (proto.executeStream instanceof Function) ? 'executeStream'
          : undefined;
      if (key) {
        const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', proto, key) || [];
        const candidate = paramTypes[0];
        if (isCtor(candidate) && !NON_DTO_NAMES.has(candidate.name)) {
          out.request = candidate;
        }
      }
    } catch { /* ignore */ }
  }

  return out;
}

// ==========================
// DI-friendly providers (no module imports here)
// ==========================
export type HttpMethod = 'GET'|'POST'|'PUT'|'DELETE';
export interface HttpRegistration {
  route: string;
  method: HttpMethod;
  policy: string;
  auth?: string | boolean;
  ctor: Type<any>;
  isStream?: boolean;
}

export class OperationRegistry {
  private http: HttpRegistration[] = [];
  private dtoSet = new Set<Type<any>>();

  get all() { return this.http.slice(); }
  get allDtos() { return Array.from(this.dtoSet); }

  registerHttp(ctor: Type<any>, fallbackGroup: string) {
    const group = OpMeta.group(ctor)?.name ?? fallbackGroup;
    const name = ctor.name.replace(/Operation$/, '').toLowerCase();
    const route = `/${OpMeta.route(ctor) ?? `${group.toLowerCase()}/${name}`}`.replace(/\/+/g, '/');
    const method: HttpMethod = OpMeta.method(ctor) ?? 'POST';
    const policy = OpMeta.throttle(ctor) ?? 'ops-default';
    const auth = OpMeta.auth(ctor);
    const isStream = !!OpMeta.stream(ctor);

    const key = `${method} ${route}`.toLowerCase();
    if (this.http.some(e => `${e.method} ${e.route}`.toLowerCase() === key)) return;

    const dtos = inferDtos(ctor);
    if (dtos.request) this.dtoSet.add(dtos.request);
    if (dtos.response) this.dtoSet.add(dtos.response);

    this.http.push({ route, method, policy, auth, ctor, isStream });
  }
}

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
