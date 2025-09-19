// src/core/auth/jwt.strategies.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtIdentityService } from './jwt.identity.service';
import { IJwtIdentity } from './jwt.identity';

/**
 * Base class for both strategies; enforces iss/aud/key with HS256.
 */
abstract class BaseJwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly kind: 'user' | 'service',
  ) {
    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_KEY', ''),
      algorithms: ['HS256'],
      audience: config.get<string>('JWT_AUDIENCE', ''),
      issuer: config.get<string>('JWT_ISSUER', ''),
    };
    super(opts);
  }

  abstract validate(payload: any): Promise<IJwtIdentity>;
}

@Injectable()
export class JwtUserStrategy extends BaseJwtStrategy {
  constructor(
    config: ConfigService,
    private readonly ids: JwtIdentityService,
  ) {
    super(config, 'user');
  }

  async validate(payload: any) {
    const id = this.ids.getUserFromPayload(payload);
    if (!id) throw new Error('Invalid user token');
    return id;
  }
}

@Injectable()
export class JwtServiceStrategy extends BaseJwtStrategy {
  constructor(
    config: ConfigService,
    private readonly ids: JwtIdentityService,
  ) {
    super(config, 'service');
  }

  async validate(payload: any) {
    const id = this.ids.getServiceFromPayload(payload);
    if (!id) throw new Error('Invalid service token');
    return id;
  }
}
