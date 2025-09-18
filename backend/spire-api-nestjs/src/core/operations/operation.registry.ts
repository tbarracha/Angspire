import { Injectable, Type } from '@nestjs/common';
import { HttpMethod, OpMeta } from './operation.contracts';

export interface HttpRegistration {
  route: string;
  method: HttpMethod;
  policy: string; // throttling policy
  auth?: string|boolean;
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
  get all() { return this.http.slice(); }

  registerHttp(ctor: Type<any>, fallbackGroup: string) {
    const group = OpMeta.group(ctor)?.name ?? fallbackGroup;
    const name = ctor.name.replace(/Operation$/, '').toLowerCase();
    const route = OpMeta.route(ctor) ?? `${group.toLowerCase()}/${name}`;
    const method = OpMeta.method(ctor) ?? 'POST';
    const policy = OpMeta.throttle(ctor) ?? 'ops-default';
    const auth = OpMeta.auth(ctor);
    const isStream = !!OpMeta.stream(ctor);

    this.http.push({
      route: `/api/${route}`,
      method, policy, auth, ctor, isStream,
    });
  }
}
