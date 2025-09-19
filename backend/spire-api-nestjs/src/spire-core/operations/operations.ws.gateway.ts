// src/core/operations/operations.ws.gateway.ts
import { Logger, Injectable, Inject } from '@nestjs/common';
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayConnection, OnGatewayDisconnect, WsException,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { ModuleRef } from '@nestjs/core';
import { verify, VerifyOptions, JwtPayload } from 'jsonwebtoken';

import { IStreamOperation, OperationBaseCore, OperationContext, OpMeta, OperationAuthPolicy } from './operations.contracts';

// NOTE: we inject by string tokens to avoid importing the module file and creating a circular dependency
type OperationRegistryLike = { all: Array<{ route: string; method: string; ctor: any; isStream?: boolean; }> };
type StreamAbortRegistryLike = { tryRegister(key: string, c: AbortController): boolean; remove(key: string): void; };

export type WsStartPayload = { route: string; method?: 'POST'|'GET'|'PUT'|'DELETE'; requestId?: string; input?: any; };
export type WsCancelPayload = { requestId: string };
export type WsFrame<T = any> = { requestId: string; type: 'frame' | 'end' | 'error'; data?: T; error?: string };

const NS = '/api/ws';
const HEARTBEAT_MS = 15_000;
const MAX_IN_FLIGHT = 32;

@Injectable()
@WebSocketGateway({ namespace: NS, cors: { origin: true }, transports: ['websocket'] })
export class OperationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private nsp!: Namespace;
  private readonly logger = new Logger('OperationsGateway');
  private heartbeats = new Map<string, NodeJS.Timeout>();
  private inflight = new Map<string, number>();
  private streamsByReq = new Map<string, AbortController>();

  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject('OperationRegistry') private readonly reg: OperationRegistryLike,
    @Inject('StreamAbortRegistry') private readonly aborts: StreamAbortRegistryLike,
  ) {}

  private startHeartbeat(socket: Socket) {
    this.stopHeartbeat(socket);
    const t = setInterval(() => { try { socket.emit('ping'); } catch {} }, HEARTBEAT_MS);
    this.heartbeats.set(socket.id, t);
  }
  private stopHeartbeat(socket: Socket) {
    const t = this.heartbeats.get(socket.id);
    if (t) clearInterval(t);
    this.heartbeats.delete(socket.id);
  }

  handleConnection(client: Socket) {
    this.inflight.set(client.id, 0);
    this.startHeartbeat(client);
    this.logger.log(`WS connected: ${client.id} (ns: ${NS})`);
  }
  handleDisconnect(client: Socket) {
    this.stopHeartbeat(client);
    this.inflight.delete(client.id);
    this.logger.log(`WS disconnected: ${client.id}`);
  }

  private incInflight(socket: Socket) {
    const cur = this.inflight.get(socket.id) ?? 0;
    if (cur >= MAX_IN_FLIGHT) throw new WsException('Backpressure: too many in-flight frames');
    this.inflight.set(socket.id, cur + 1);
  }
  private decInflight(socket: Socket) {
    const cur = this.inflight.get(socket.id) ?? 1;
    this.inflight.set(socket.id, Math.max(0, cur - 1));
  }

  @SubscribeMessage('ops.echo')
  echo(@ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
    socket.emit('ops.echo', payload);
  }

  private resolveWsAuth(socket: Socket, policy: OperationAuthPolicy): { userId: string | null } | null {
    if (policy === false || policy === undefined) return { userId: null };

    const key = process.env.JWT_KEY || '';
    const issuer = process.env.JWT_ISSUER || '';
    const audience = process.env.JWT_AUDIENCE || '';
    if (!key || !issuer || !audience) return policy ? null : { userId: null };

    const header = (socket.handshake.headers['authorization'] as string | undefined);
    const token = (header ?? (socket.handshake.auth?.token as string | undefined) ?? (socket.handshake.query?.token as string | undefined) ?? '').toString();
    const cleaned = token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');

    const opts: VerifyOptions = {
      algorithms: ['HS256'],
      audience,
      issuer,
      clockTolerance: 120,
    };

    try {
      const decoded = verify(cleaned, key, opts) as JwtPayload;
      if (!decoded?.sub) return null;

      const isService = !!decoded['client_id'];
      const wantUser = policy === true || policy === 'user';
      const wantSvc = policy === 'service';
      const either = policy === 'either';

      if (wantUser && isService) return null;
      if (wantSvc && !isService) return null;
      if (either || wantUser || wantSvc) return { userId: String(decoded.sub) };

      return { userId: String(decoded.sub) };
    } catch {
      return null;
    }
  }

  @SubscribeMessage('ops.stream.start')
  async start(@ConnectedSocket() socket: Socket, @MessageBody() body: WsStartPayload) {
    const requestId = body.requestId || `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const method = (body.method || 'POST').toUpperCase();
    const opPath = body.route?.startsWith('/') ? body.route : `/${body.route || ''}`;

    const entry =
      this.reg.all.find(e => e.route.toLowerCase() === opPath.toLowerCase() && e.method === method) ||
      this.reg.all.find(e => e.route.toLowerCase() === opPath.toLowerCase());

    if (!entry) {
      socket.emit('ops.stream.frame', <WsFrame>{ requestId, type: 'error', error: `No operation for ${method} ${opPath}` });
      return;
    }

    // Per-operation auth on WS
    const policy = OpMeta.auth(entry.ctor);
    const auth = this.resolveWsAuth(socket, policy);
    if (auth === null) {
      socket.emit('ops.stream.frame', <WsFrame>{ requestId, type: 'error', error: 'Unauthorized' });
      return;
    }

    let op: any = this.moduleRef.get(entry.ctor, { strict: false });
    if (!op) op = await this.moduleRef.create(entry.ctor as any);

    const ctx: OperationContext = { userId: auth.userId ?? null, requestId };
    const input = body.input ?? {};

    try {
      if (!(op.executeStream instanceof Function)) {
        socket.emit('ops.stream.frame', <WsFrame>{ requestId, type: 'error', error: 'Operation is not a stream operation' });
        return;
      }

      if (op instanceof OperationBaseCore) {
        op.setUser(ctx.userId);
        op.setOperationContext(ctx);
        const ok = await op._authorize(input);
        if (!ok) { socket.emit('ops.stream.frame', <WsFrame>{ requestId, type: 'error', error: 'Forbidden' }); return; }
        const errors = await op._validate(input);
        if (errors?.length) { socket.emit('ops.stream.frame', <WsFrame>{ requestId, type: 'error', error: errors.join(', ') }); return; }
        await op._onBefore(input);
      }

      const ac = new AbortController();
      this.streamsByReq.set(requestId, ac);
      this.aborts.tryRegister(requestId, ac);

      (async () => {
        try {
          const iter = (op as IStreamOperation<any, any>).executeStream(input, ctx);
          for await (const frame of iter) {
            if (ac.signal.aborted) break;
            this.incInflight(socket);
            socket.emit('ops.stream.frame', <WsFrame>{ requestId, type: 'frame', data: frame }, () => {
              this.decInflight(socket);
            });
          }
          socket.emit('ops.stream.frame', <WsFrame>{ requestId, type: 'end' });
        } catch (err: any) {
          socket.emit('ops.stream.frame', <WsFrame>{ requestId, type: 'error', error: err?.message ?? String(err) });
        } finally {
          this.streamsByReq.delete(requestId);
          this.aborts.remove(requestId);
          if (op instanceof OperationBaseCore) await op._onAfter(input);
        }
      })();
    } catch (err: any) {
      socket.emit('ops.stream.frame', <WsFrame>{ requestId, type: 'error', error: err?.message ?? String(err) });
    }
  }

  @SubscribeMessage('ops.stream.cancel')
  async cancel(@ConnectedSocket() _socket: Socket, @MessageBody() msg: WsCancelPayload) {
    const c = this.streamsByReq.get(msg.requestId);
    if (c) c.abort();
  }

  @SubscribeMessage('pong')
  pong() {}
}
