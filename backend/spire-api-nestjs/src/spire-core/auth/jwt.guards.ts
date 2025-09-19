// src/core/auth/jwt.guards.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtIdentityService } from './jwt.identity.service';
import { IJwtIdentity } from './jwt.identity';

@Injectable()
export class UserJwtGuard extends AuthGuard('jwt') {}           // attach JwtUserStrategy under 'jwt'

@Injectable()
export class ServiceJwtGuard extends AuthGuard('service-jwt') {} // attach JwtServiceStrategy under 'service-jwt'

@Injectable()
export class HybridJwtGuard implements CanActivate {
  constructor(private readonly ids: JwtIdentityService) {}

  canActivate(context: ExecutionContext): boolean {
    // HTTP only in this guard. (Your WS guard is already hybrid.)
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: IJwtIdentity }>();
    const auth = (req.headers?.['authorization'] as string | undefined) ?? '';

    const payload = this.ids.validateJwt(auth);
    const identity = this.ids.getIdentityFromPayload(payload);
    if (!identity) {
      throw new UnauthorizedException('Invalid or missing JWT');
    }

    // Attach identity (Passport-compatible shape: req.user)
    (req as any).user = identity;
    // Optional helpers if you find them handy later:
    (req as any).isService = identity.isService === true;
    (req as any).isUser = identity.isService !== true;

    return true;
  }
}