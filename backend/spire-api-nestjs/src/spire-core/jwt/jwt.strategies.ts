// src/core/jwt/jwt.strategies.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtIdentityService } from './jwt.identity.service';
import { IJwtIdentity } from './jwt.identity';

// Shared base for user/service flavours
abstract class BaseJwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
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
  constructor(config: ConfigService, private readonly ids: JwtIdentityService) {
    super(config);
  }
  async validate(payload: any) {
    const id = this.ids.getUserFromPayload(payload);
    if (!id) throw new Error('Invalid user token');
    return id;
  }
}

@Injectable()
export class JwtServiceStrategy extends BaseJwtStrategy {
  constructor(config: ConfigService, private readonly ids: JwtIdentityService) {
    super(config);
  }
  async validate(payload: any) {
    const id = this.ids.getServiceFromPayload(payload);
    if (!id) throw new Error('Invalid service token');
    return id;
  }
}
