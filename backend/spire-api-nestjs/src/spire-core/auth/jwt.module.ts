// src/core/auth/jwt.module.ts
import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtIdentityService } from './jwt.identity.service';
import { JwtUserStrategy, JwtServiceStrategy } from './jwt.strategies';
import { WsJwtGuard } from './ws-jwt.guard';
import { IJwtServiceIdentity, JwtServiceIdentity } from './jwt.identity';

import * as crypto from 'node:crypto';
function deterministicId(name: string): string {
  const h = crypto.createHash('sha1').update(name).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
}

@Global()
@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // We use jsonwebtoken directly, but keeping JwtModule available is handy if you switch later
    JwtModule.register({}),
  ],
  providers: [
    JwtIdentityService,
    // Register strategies with their Passport names
    { provide: 'jwt', useClass: JwtUserStrategy },        // name is for DI; Passport registers by class
    JwtUserStrategy,
    { provide: 'service-jwt', useClass: JwtServiceStrategy },
    JwtServiceStrategy,
    WsJwtGuard,
    {
      provide: 'SERVICE_IDENTITY',
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): IJwtServiceIdentity => {
        const serviceName = cfg.get<string>('SERVICE_NAME');
        const issuer = cfg.get<string>('JWT_ISSUER');
        if (!serviceName) throw new Error('SERVICE_NAME is not configured');
        if (!issuer) throw new Error('JWT_ISSUER is not configured');
        const svc = new JwtServiceIdentity();
        svc.id = deterministicId(serviceName);
        svc.issuer = issuer;
        svc.rawClaims = {};
        svc.serviceName = serviceName;
        svc.scopes = [];
        return svc;
      },
    },
  ],
  exports: [
    JwtIdentityService,
    WsJwtGuard,
    PassportModule,
    JwtModule,
    'SERVICE_IDENTITY',
  ],
})
export class JwtAuthModule {}
