// operations-client.ts

// --- at top of file (near imports) you can place these helpers ---
const TRACE_WS = false; // set to true to enable verbose WS logging
function wsLog(level: 'debug' | 'info' | 'warn' | 'error', msg: string, data?: any) {
  if (!TRACE_WS && level === 'debug') return;
  const prefix = `[WS][ops-client] ${msg}`;
  try {
    switch (level) {
      case 'debug': console.log("[DEBUG]", prefix, data ?? ''); break;
      case 'info': console.log("[INFO]", prefix, data ?? ''); break;
      case 'warn': console.warn("[WARN]", prefix, data ?? ''); break;
      case 'error': console.error("[ERROR]", prefix, data ?? ''); break;
    }
    window.dispatchEvent(new CustomEvent('ops-ws-log', { detail: { level, msg, data, ts: new Date().toISOString() } }));
  } catch { /* never throw from logger */ }
}

(function attachWindowDiagnostics() {
  let attached = (window as any).__opsWsDiagAttached as boolean;
  if (attached) return;
  (window as any).__opsWsDiagAttached = true;

  window.addEventListener('focus', () => wsLog('debug', 'window focus'));
  window.addEventListener('blur', () => wsLog('debug', 'window blur'));
  document.addEventListener('visibilitychange', () => wsLog('debug', 'visibility', { hidden: document.hidden }));
  window.addEventListener('online', () => wsLog('info', 'navigator online'));
  window.addEventListener('offline', () => wsLog('warn', 'navigator offline'));
})();

import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpContext,
  HttpHeaders,
  HttpParams,
  HttpDownloadProgressEvent,
  HttpEvent,
  HttpEventType,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, Subject, filter, map, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import * as signalR from '@microsoft/signalr';

/** Matches backend streamed envelope fields for HTTP NDJSON. */
export interface StreamedDtoBase {
  requestId?: string | null;
  sequence?: number | null;
  isFinished?: boolean | null;
  finishReason?: string | null;
}

export interface OpRequestOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  context?: HttpContext;
}

export interface StartStreamOptions<TReq, TFrame> {
  url: string;
  cancelUrl?: string;
  request: TReq;
  headers?: HttpHeaders | { [header: string]: string | string[] };
  mapLine?: (json: unknown) => TFrame | null;
}

export interface StartedStream<TFrame> {
  stream$: Observable<TFrame>;

  /** For WS, can accept a requestId; HTTP ignores the argument. */
  cancel: (requestId?: string) => void;

  /** HTTP streams implement this; WS may implement it too. */
  serverCancel?: (requestId?: string) => Observable<void>;

  /** Emitted when the backend assigns/discloses the logical request id. */
  requestId$: Observable<string | undefined>;

  /** WS-only: re-bind the stream to a different group (e.g., session:<id>). */
  rescope?: (args: RescopeArgs) => Promise<void>;
}

export interface WsEnvelope<T = unknown> {
  /** backend: WsEnvelope.Type */
  type?: string | null;

  /** backend: WsEnvelope.RequestId */
  requestId?: string | null;

  /** backend: WsEnvelope.Payload (deserialized client-side) */
  payload?: T;

  /** backend: WsEnvelope.AuthToken */
  authToken?: string | null;

  /** backend: WsEnvelope.ClientRequestId */
  clientRequestId?: string | null;

  /** backend: WsEnvelope.Close */
  close?: boolean | null;

  /** Extra keys (backend keeps them in JsonExtensionData) */
  // extensionData?: Record<string, unknown> | null; // Optional to expose
}

/** Matches backend WsStartDto exactly. */
export interface WsStartDto {
  /** required by backend */
  route: string;

  /** optional */
  userId?: string | null;
  authToken?: string | null;
  coalesceKey?: string | null;
}

export interface WsConnectOptions<TReq, TFrame> {
  route?: string;
  wsUrl?: string;
  start: TReq;
  // deferFirstStart?: boolean; // ❌ remove
  mapEnvelope?: (env: WsEnvelope<any>) => TFrame | null;
  mapMessage?: (payload: unknown) => TFrame | null;
  protocols?: string | string[];
  tokenQueryParamKey?: string;
  tokenProvider?: () => string | null | undefined;
  cancelUrl?: string;
}

export interface RescopeArgs {
  /** Prefer passing sessionId; client will build 'session:<id>' */
  sessionId?: string | null;
  /** Or pass a group name explicitly */
  group?: string | null;
  /** Target a specific request (defaults to current lastRid) */
  requestId?: string | null;
}

export interface WsStartedStream<TFrame> {
  frames$: Observable<TFrame>;
  sendEnvelope: (env: WsEnvelope<any>) => void;
  sendType: (type: string, payload?: any, id?: string, requestId?: string, close?: boolean) => void;
  // start: (payload: any, requestId?: string) => void;  // ❌ remove this
  cancel: (requestId?: string) => void;
  close: () => void;
  serverCancel?: (requestId?: string) => Observable<void>;
  requestId$: Observable<string | undefined>;
  rescope?: (args: RescopeArgs) => Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class OperationsClient {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl.replace(/\/+$/, '');

  /** Build absolute URL for REST operation (route should NOT include '/api') */
  private buildRestUrl(route: string): string {
    const base = this.base.replace(/\/+$/, '');
    let r = (route ?? '').trim().replace(/^\/+/, '');
    if (/^api(?:\/|$)/i.test(r)) r = r.replace(/^api\/?/i, '');
    return r ? `${base}/${r}` : base;
  }

  /** Build the SignalR hub URL over HTTPS; SignalR will upgrade to WS after negotiate */
  private buildHubUrl(): string {
    const httpBase = this.base; // e.g., https://localhost:7094/api
    const u = new URL(httpBase);
    u.pathname = '/ws/ops';      // <- make sure Program.cs maps this hub
    return u.toString();         // keep http/https here (negotiate happens over HTTP(S))
  }

  // -------------------------------------------------------------
  // Regular (IOperation)
  // -------------------------------------------------------------
  postOp<TRequest, TResponse>(route: string, body: TRequest, options?: OpRequestOptions): Observable<TResponse> {
    return this.http.post<TResponse>(this.buildRestUrl(route), body ?? {}, options);
  }
  postOpRaw<TResponse>(route: string, raw: string, options?: OpRequestOptions): Observable<TResponse> {
    return this.http.post<TResponse>(this.buildRestUrl(route), raw, options);
  }

  // -------------------------------------------------------------
  // HTTP NDJSON stream (IStreamableOperation)
  // -------------------------------------------------------------
  streamOp<TReq extends Record<string, any>, TFrame = StreamedDtoBase>(
    route: string,
    request: TReq,
    opts?: {
      cancelRoute?: string;
      headers?: HttpHeaders | { [k: string]: string | string[] };
      mapLine?: (json: unknown) => TFrame | null;
      requestId?: string;
    }
  ): StartedStream<TFrame> {
    const cancelUrl = opts?.cancelRoute
      ? this.buildRestUrl(opts.cancelRoute)
      : this._deriveCancelFromStreamRoute(route)
        ? this.buildRestUrl(this._deriveCancelFromStreamRoute(route)!)
        : undefined;

    return this.startStream<TReq, TFrame>({
      url: this.buildRestUrl(route),
      cancelUrl,
      request,
      headers: opts?.headers,
      mapLine: opts?.mapLine,
    });
  }

  startStream<TReq extends Record<string, any>, TFrame>(options: StartStreamOptions<TReq, TFrame>): StartedStream<TFrame> {
    let headers = options.headers instanceof HttpHeaders ? options.headers : new HttpHeaders(options.headers ?? {});
    headers = headers.set('Content-Type', 'application/json');

    const body: TReq = { ...(options.request as any) };

    const frames$ = new Subject<TFrame>();
    const rid$ = new Subject<string | undefined>();
    let lastRid: string | undefined;
    let buffer = '';

    const sub = this.http
      .request('POST', options.url, { body, headers, responseType: 'text', observe: 'events', reportProgress: true })
      .pipe(filter((e: HttpEvent<string>): e is HttpDownloadProgressEvent =>
        e.type === HttpEventType.DownloadProgress && !!(e as any).partialText))
      .subscribe({
        next: (ev) => {
          buffer += (ev as any).partialText as string;
          let nl: number;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            try {
              const parsed = JSON.parse(line);
              if (!lastRid) {
                const rid = this._readRequestId(parsed);
                if (rid) { lastRid = rid; rid$.next(rid); }
              }
              const mapped = options.mapLine ? options.mapLine(parsed) : (parsed as TFrame);
              if (mapped != null) frames$.next(mapped);
            } catch { /* ignore */ }
          }
        },
        error: (err) => { try { rid$.complete(); } catch { } frames$.error(err); },
        complete: () => {
          const tail = buffer.trim();
          if (tail) {
            try {
              const parsed = JSON.parse(tail);
              if (!lastRid) {
                const rid = this._readRequestId(parsed);
                if (rid) { lastRid = rid; rid$.next(rid); }
              }
              const mapped = options.mapLine ? options.mapLine(parsed) : (parsed as TFrame);
              if (mapped != null) frames$.next(mapped);
            } catch { /* ignore */ }
          }
          try { rid$.complete(); } catch { }
          frames$.complete();
        },
      });

    const cancel = () => { try { sub.unsubscribe(); } catch { } };

    const serverCancel = (): Observable<void> => {
      if (!options.cancelUrl) return new Observable<void>((obs) => { obs.complete(); });
      return new Observable<void>((observer) => {
        const tryPost = (rid: string) => {
          const h = new HttpHeaders({ 'Content-Type': 'application/json', 'X-Request-Id': rid });
          this.http.post<void>(options.cancelUrl!, { requestId: rid }, { headers: h }).subscribe({
            next: () => { observer.next(); observer.complete(); },
            error: (e) => observer.error(e),
          });
        };
        if (lastRid) { tryPost(lastRid); return; }
        const s = rid$.pipe(shareReplay({ bufferSize: 1, refCount: true })).subscribe({
          next: (rid) => { if (rid) { tryPost(rid); s.unsubscribe(); } },
          complete: () => observer.complete(),
          error: (e) => observer.error(e),
        });
        return () => { try { s.unsubscribe(); } catch { } };
      });
    };

    return {
      stream$: frames$.asObservable(),
      cancel,
      serverCancel,
      requestId$: rid$.asObservable().pipe(shareReplay({ bufferSize: 1, refCount: true })),
    };
  }

  // -------------------------------------------------------------
  // WebSocket stream (SignalR hub dispatcher)
  // -------------------------------------------------------------
  wsConnect<TReq extends Record<string, any>, TFrame = WsEnvelope<any>>(
    opts: WsConnectOptions<TReq, TFrame>
  ): WsStartedStream<TFrame> {
    const hubUrl = opts.wsUrl ?? this.buildHubUrl();

    const frames$ = new Subject<TFrame>();
    const rid$ = new Subject<string | undefined>();
    let lastRid: string | undefined;   // current stream's rid (once discovered)
    let prevRid: string | undefined;   // optional previous rid if you later add multi-start
    const mapOut = (env: WsEnvelope<any>): TFrame | null =>
      opts.mapEnvelope ? opts.mapEnvelope(env) :
        opts.mapMessage ? opts.mapMessage(env?.payload) :
          (env as unknown as TFrame);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: false,
        withCredentials: false,
      })
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    // ---------- rescope (robust) ----------
    const rescope = async (args: RescopeArgs) => {
      const targetGroup = args.group ?? (args.sessionId ? `session:${args.sessionId}` : undefined);
      if (!targetGroup) {
        wsLog('warn', 'hub: Rescope skipped (no group/sessionId)');
        return;
      }

      // Ensure connection is available (avoid racing reconnects)
      const ensureConnected = async () => {
        if (connection.state === signalR.HubConnectionState.Connected) return;

        wsLog('warn', 'hub: Rescope waiting for connection…', { state: connection.state });
        try {
          if (connection.state === signalR.HubConnectionState.Disconnected) {
            await connection.start();
            wsLog('info', 'hub: connected for rescope ✓');
          } else {
            // One-shot wait for next reconnected/close (no "off" APIs exist for lifecycle)
            await new Promise<void>((resolve, reject) => {
              let done = false;
              const onReconnected = () => {
                if (done) return;
                done = true;
                resolve();
              };
              const onClose = (err?: unknown) => {
                if (done) return;
                done = true;
                reject(err ?? new Error('hub closed during rescope wait'));
              };
              // Both handlers persist in SignalR; make them self-no-op after first fire.
              const guardReconnected = (id?: string) => { onReconnected(); };
              const guardClose = (err?: unknown) => { onClose(err); };
              connection.onreconnected(guardReconnected);
              connection.onclose(guardClose);
            });
            wsLog('info', 'hub: reconnected for rescope ✓');
          }
        } catch (e) {
          wsLog('error', 'hub: ensureConnected failed for rescope', e);
          // continue; fallbacks may still work
        }
      };

      await ensureConnected();

      // Ensure we have a requestId (wait once if needed)
      const resolveRid = async (): Promise<string | undefined> => {
        if (args.requestId) return args.requestId || undefined;
        if (lastRid) return lastRid;
        if (prevRid) return prevRid;

        wsLog('debug', 'hub: waiting for requestId for rescope…');
        try {
          const rid = await new Promise<string | undefined>((resolve) => {
            const sub = rid$.pipe(shareReplay({ bufferSize: 1, refCount: true })).subscribe({
              next: (v) => { if (v) { try { sub.unsubscribe(); } catch { } resolve(v); } },
              complete: () => resolve(undefined),
              error: () => resolve(undefined),
            });
          });
          if (rid) wsLog('info', 'hub: requestId resolved for rescope', { requestId: rid });
          return rid;
        } catch { return undefined; }
      };

      const rid = await resolveRid();

      // Preferred: canonical hub method
      try {
        wsLog('info', 'hub: Rescope →', { requestId: rid, group: targetGroup });
        await connection.invoke('Rescope', { requestId: rid ?? null, group: targetGroup });
        wsLog('info', 'hub: Rescope ✓', { group: targetGroup });
        return;
      } catch (e) {
        wsLog('warn', 'hub: Rescope not available, trying alternates', e);
      }

      // Optional: leave pending group here if your hub requires it
      // try { await connection.invoke('LeaveGroup', pendingGroup, rid ?? null); } catch {}

      // Alternates commonly seen in hubs
      try {
        if (args.sessionId) {
          await connection.invoke('BindSession', args.sessionId, rid ?? null);
          wsLog('info', 'hub: BindSession ✓', { sessionId: args.sessionId });
          return;
        }
      } catch { /* continue */ }

      try {
        await connection.invoke('JoinGroup', targetGroup, rid ?? null);
        wsLog('info', 'hub: JoinGroup ✓', { group: targetGroup });
        return;
      } catch (e) {
        wsLog('error', 'hub: rescope alt failed', e);
      }

      // Last-resort signal (gives you a server hook later)
      try {
        await connection.invoke('Inbound', { type: 'rescope', payload: { group: targetGroup, requestId: rid ?? null } });
        wsLog('info', 'hub: Inbound rescope fallback sent', { group: targetGroup });
      } catch (e) {
        wsLog('error', 'hub: Inbound rescope fallback failed', e);
      }
    };

    // ---------- envelope handling ----------
    connection.on('envelope', (env: WsEnvelope<any>) => {
      try {
        if (env?.type === 'error') wsLog('error', 'envelope:error ⇐', env.payload ?? env);
        else wsLog('debug', 'envelope ⇐', env);

        if (!lastRid) {
          const rid = this._readRequestId(env);
          if (rid) {
            // snapshot previous (for future multi-start scenarios)
            if (lastRid) prevRid = lastRid;
            lastRid = rid;
            rid$.next(rid);
            wsLog('info', 'requestId discovered', { requestId: rid });
          }
        }

        const mapped = mapOut(env);
        if (mapped != null) frames$.next(mapped);
      } catch (e) { wsLog('error', 'envelope handler failed', e); }
    });

    let started = false;

    const connectAndStart = async () => {
      try {
        const rawToken = opts.tokenProvider?.();
        const authToken = rawToken ? (rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`) : undefined;

        wsLog('info', 'hub: starting', { url: hubUrl });
        await connection.start();
        wsLog('info', 'hub: started ✓', { url: hubUrl });

        try { await connection.invoke('Hello', authToken); wsLog('info', 'hub: Hello ✓'); }
        catch (e) { wsLog('warn', 'hub: Hello failed (continuing)', e); }

        const routed = (opts.start as any)?.route ?? opts.route;
        if (!routed || typeof routed !== 'string') {
          const err = new Error('Route is required for hub Start (set start.route)');
          wsLog('error', err.message);
          throw err;
        }

        const payload: any = { ...(opts.start || {}), route: routed };
        await connection.invoke('Start', payload, authToken);
        started = true;
        wsLog('info', 'hub: Start → invoked', { route: routed });

      } catch (err) {
        wsLog('error', 'hub: connection/start failed', err);
        try { rid$.complete(); } catch { }
        try { frames$.error(err as any); } catch { }
        try { frames$.complete(); } catch { }
      }
    };

    connection.onreconnecting((err) => wsLog('warn', 'hub: reconnecting…', err));
    connection.onreconnected((cid) => {
      wsLog('info', 'hub: reconnected ✓', { connectionId: cid });
      if (started) {
        const rawToken = opts.tokenProvider?.();
        const authToken = rawToken ? (rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`) : undefined;
        const routed = (opts.start as any)?.route ?? opts.route;
        const payload: any = { ...(opts.start || {}), route: routed };
        connection.invoke('Start', payload, authToken)
          .then(() => wsLog('info', 'hub: Start reissued ✓', { route: routed }))
          .catch(e => wsLog('error', 'hub: Start reissue failed', e));
      }
    });
    connection.onclose((err) => {
      wsLog('warn', 'hub: closed', err);
      try { rid$.complete(); } catch { }
      try { frames$.complete(); } catch { }
    });

    void connectAndStart();

    const sendEnvelope = (env: WsEnvelope<any>) => {
      const action = () => connection.invoke('Inbound', env).catch(e => wsLog('error', 'Inbound failed', e));
      try {
        wsLog('debug', 'Inbound →', env);
        if (connection.state === signalR.HubConnectionState.Connected) action();
        else wsLog('warn', 'Inbound skipped (not connected)', { state: connection.state, env });
      } catch (e) { wsLog('error', 'Inbound threw', e); }
    };

    const sendType = (
      type: string,
      payload?: any,
      clientRequestId?: string, // renamed from id
      requestId?: string,
      close?: boolean
    ) => {
      const rawToken = opts.tokenProvider?.();
      const authToken = rawToken
        ? (rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`)
        : undefined;

      sendEnvelope({
        type,
        payload,
        clientRequestId,     // <-- use the correct property
        requestId,
        close: !!close,
        authToken,
      } as WsEnvelope);       // optional cast if needed
    };

    const tryServerCancel = (rid: string | undefined) => {
      if (!opts.cancelUrl || !rid) return false;
      wsLog('info', 'serverCancel (http) →', { requestId: rid });
      const h = new HttpHeaders({ 'Content-Type': 'application/json', 'X-Request-Id': rid });
      this.http.post<void>(opts.cancelUrl, { requestId: rid }, { headers: h }).subscribe({
        next: () => wsLog('info', 'serverCancel ✓', { requestId: rid }),
        error: (e) => wsLog('warn', 'serverCancel failed', e),
      });
      return true;
    };

    const cancel = (requestId?: string) => {
      const chosenRid = requestId ?? lastRid ?? prevRid;

      if (!chosenRid) {
        wsLog('warn', 'hub: Cancel skipped (no requestId available)', { lastRid, prevRid });
        return;
      }

      if (connection.state !== signalR.HubConnectionState.Connected) {
        wsLog('warn', 'hub: Cancel skipped (not connected)', { state: connection.state, requestId: chosenRid });
        tryServerCancel(chosenRid);
        return;
      }

      wsLog('info', 'hub: Cancel →', { requestId: chosenRid, lastRid, prevRid });
      void connection.invoke('Cancel', chosenRid).catch(e => wsLog('error', 'hub: Cancel failed', e));
    };

    const close = () => {
      wsLog('info', 'hub: stop requested by client');
      void connection.stop().catch(() => { });
    };

    const serverCancel = opts.cancelUrl
      ? (ridOverride?: string): Observable<void> => {
        const post = (rid: string) =>
          this.http.post<void>(opts.cancelUrl!, { requestId: rid }, {
            headers: new HttpHeaders({ 'Content-Type': 'application/json', 'X-Request-Id': rid })
          });

        return new Observable<void>((observer) => {
          const tryRid = ridOverride ?? lastRid ?? prevRid;
          if (tryRid) {
            wsLog('info', 'serverCancel (http) →', { requestId: tryRid });
            post(tryRid).subscribe({
              next: () => { observer.next(); observer.complete(); },
              error: (e) => observer.error(e),
            });
            return;
          }
          const sub = rid$.pipe(shareReplay({ bufferSize: 1, refCount: true })).subscribe({
            next: (rid) => {
              if (rid) {
                wsLog('info', 'serverCancel (http) after rid discovered →', { requestId: rid });
                post(rid).subscribe({
                  next: () => { observer.next(); observer.complete(); },
                  error: (e) => observer.error(e),
                });
                sub.unsubscribe();
              }
            },
            complete: () => observer.complete(),
            error: (e) => observer.error(e),
          });
          return () => { try { sub.unsubscribe(); } catch { } };
        });
      }
      : undefined;

    return {
      frames$: frames$.asObservable(),
      sendEnvelope,
      sendType,
      cancel,
      close,
      serverCancel,
      requestId$: rid$.asObservable().pipe(shareReplay({ bufferSize: 1, refCount: true })),
      rescope,
    };
  }


  // Helpers
  private _readRequestId(obj: any): string | undefined {
    const v = obj?.requestId ?? obj?.RequestId ?? obj?.payload?.requestId ?? obj?.Payload?.requestId ?? obj?.Payload?.RequestId;
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  }

  private _deriveCancelFromStreamRoute(route: string): string | undefined {
    const trimmed = route.replace(/^\/+/, '');
    if (trimmed.endsWith('/stream')) return trimmed.slice(0, -'/stream'.length) + '/cancel';
    return undefined;
  }

  // File ops (unchanged)
  uploadOp<TResponse>(route: string, file: File, metadata: unknown, opts?: { headers?: HttpHeaders | { [h: string]: string | string[] } }): Observable<HttpEvent<TResponse>> {
    const url = this.buildRestUrl(route);
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('metadata', JSON.stringify(metadata ?? {}));
    const headers = opts?.headers instanceof HttpHeaders ? opts.headers : new HttpHeaders(opts?.headers ?? {});
    const req = new HttpRequest<FormData>('POST', url, form, { reportProgress: true, responseType: 'json', headers });
    return this.http.request<TResponse>(req);
  }

  downloadOp(route: string, query: Record<string, string | number | boolean | undefined>, opts?: { headers?: HttpHeaders | { [h: string]: string | string[] } }): Observable<HttpEvent<Blob>> {
    const url = this.buildRestUrl(route);
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null) params = params.set(k, String(v));
    const headers = opts?.headers instanceof HttpHeaders ? opts.headers : new HttpHeaders(opts?.headers ?? {});
    const req = new HttpRequest<null>('GET', url, null, { reportProgress: true, responseType: 'blob', params, headers });
    return this.http.request<Blob>(req);
  }

  downloadOnceOp(route: string, query: Record<string, string | number | boolean | undefined>, opts?: { headers?: HttpHeaders | { [h: string]: string | string[] } }): Observable<{ blob: Blob; fileName: string | null; response: HttpResponse<Blob> }> {
    const url = this.buildRestUrl(route);
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null) params = params.set(k, String(v));
    const headers = opts?.headers instanceof HttpHeaders ? opts.headers : new HttpHeaders(opts?.headers ?? {});
    return this.http.get(url, { responseType: 'blob', observe: 'response', params, headers })
      .pipe(map(resp => ({ blob: resp.body as Blob, fileName: this._filenameFromDisposition(resp), response: resp })));
  }

  private _filenameFromDisposition(resp: HttpResponse<Blob>): string | null {
    const cd = resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition');
    if (!cd) return null;
    const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(cd);
    if (star?.[2]) { try { return decodeURIComponent(star[2].trim().replace(/^"|"$/g, '')); } catch { } }
    const basic = /filename\s*=\s*([^;]+)/i.exec(cd);
    return basic?.[1]?.trim().replace(/^"|"$/g, '') ?? null;
  }

  private _appendAuthIfNeeded(baseUrl: string, key?: string, provider?: () => string | null | undefined): string {
    if (!key || !provider) return baseUrl;
    const token = provider();
    if (!token) return baseUrl;
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}${encodeURIComponent(key)}=${encodeURIComponent(token)}`;
  }
}
