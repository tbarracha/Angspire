// src/core/jwt/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtIdentityService } from './jwt.identity.service';
import { IJwtIdentity } from './jwt.identity';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly ids: JwtIdentityService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token =
      (client.handshake.headers['authorization'] as string | undefined) ??
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    const payload = this.ids.validateJwt(token);
    const identity = this.ids.getIdentityFromPayload(payload);
    if (!identity) throw new UnauthorizedException('Invalid JWT');

    (client as any).identity = identity; // attach for handlers
    return true;
  }
}

export function getWsIdentity(client: Socket): IJwtIdentity | undefined {
  return (client as any).identity as IJwtIdentity | undefined;
}
