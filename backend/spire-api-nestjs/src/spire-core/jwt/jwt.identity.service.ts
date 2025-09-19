// src/core/jwt/jwt.identity.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, sign, verify, VerifyOptions } from 'jsonwebtoken';
import {
  IJwtIdentity, IJwtServiceIdentity, IJwtUserIdentity,
  JwtServiceIdentity, JwtUserIdentity,
} from './jwt.identity';

type Claims = Record<string, unknown>;

@Injectable()
export class JwtIdentityService {
  private readonly key: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly defaultMinutes: number;

  constructor(private readonly config: ConfigService) {
    this.key = this.config.get<string>('JWT_KEY', '')!;
    this.issuer = this.config.get<string>('JWT_ISSUER', '')!;
    this.audience = this.config.get<string>('JWT_AUDIENCE', '')!;
    this.defaultMinutes = Number(this.config.get<string>('JWT_ACCESS_MINUTES', '1440'));
    if (!this.key || !this.issuer || !this.audience) {
      throw new Error('JWT_KEY / JWT_ISSUER / JWT_AUDIENCE must be configured');
    }
  }

  generateJwt(identity: IJwtIdentity, extraClaims?: Claims, expiresInMinutes?: number): string {
    const iatSec = Math.floor(Date.now() / 1000);
    const expSec = iatSec + 60 * (expiresInMinutes ?? this.defaultMinutes);

    const base: Claims = { sub: identity.id, iss: this.issuer, aud: this.audience, iat: iatSec, exp: expSec };

    if (!identity.isService) {
      const u = identity as IJwtUserIdentity;
      if (u.email) base.email = u.email;
      if (u.userName) base.userName = u.userName;
      if (u.displayName) base.displayName = u.displayName;
      if (u.firstName) base.firstName = u.firstName;
      if (u.lastName) base.lastName = u.lastName;
      if (u.imageUrl) base.image_url = u.imageUrl;
    } else {
      const s = identity as IJwtServiceIdentity;
      base.client_id = s.serviceName;
      if (s.scopes?.length) base.scope = s.scopes;
      if (s.imageUrl) base.image_url = s.imageUrl;
    }

    const payload: Claims = { ...base, ...(extraClaims ?? {}) };
    return sign(payload, this.key, { algorithm: 'HS256' });
  }

  validateJwt(token?: string): JwtPayload | null {
    if (!token) return null;
    const cleaned = token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
    const opts: VerifyOptions = {
      algorithms: ['HS256'],
      audience: this.audience,
      issuer: this.issuer,
      clockTolerance: 120, // 2 minutes
    };
    try {
      const decoded = verify(cleaned, this.key, opts);
      return typeof decoded === 'object' ? (decoded as JwtPayload) : null;
    } catch {
      return null;
    }
  }

  getIdentityFromPayload(payload: JwtPayload | null): IJwtIdentity | null {
    if (!payload || !payload.sub) return null;
    const raw = this.toUniqueClaimDict(payload);

    const issuer = (payload.iss as string) ?? '';
    const id = String(payload.sub);
    const imageUrl = (payload['image_url'] as string | undefined) ?? null;
    const clientId = (payload['client_id'] as string | undefined) ?? '';

    if (clientId) {
      const scopesRaw = payload['scope'];
      const scopes = Array.isArray(scopesRaw)
        ? scopesRaw.map(String)
        : typeof scopesRaw === 'string'
          ? [scopesRaw]
          : [];
      const svc = new JwtServiceIdentity();
      svc.id = id;
      svc.issuer = issuer;
      svc.rawClaims = raw;
      svc.serviceName = clientId;
      svc.scopes = scopes;
      svc.imageUrl = imageUrl;
      return svc;
    }

    const usr = new JwtUserIdentity();
    usr.id = id;
    usr.issuer = issuer;
    usr.rawClaims = raw;
    usr.email = (payload['email'] as string | undefined) ?? null;
    usr.userName = (payload['userName'] as string | undefined) ?? null;
    usr.displayName = (payload['displayName'] as string | undefined) ?? null;
    usr.firstName = (payload['firstName'] as string | undefined) ?? null;
    usr.lastName = (payload['lastName'] as string | undefined) ?? null;
    usr.imageUrl = imageUrl;
    return usr;
  }

  getUserFromPayload(payload: JwtPayload | null): IJwtUserIdentity | null {
    const id = this.getIdentityFromPayload(payload);
    return id?.isService ? null : (id as IJwtUserIdentity);
  }

  getServiceFromPayload(payload: JwtPayload | null): IJwtServiceIdentity | null {
    const id = this.getIdentityFromPayload(payload);
    return id?.isService ? (id as IJwtServiceIdentity) : null;
  }

  getIdFromToken(token: string): string | null {
    const p = this.validateJwt(token);
    return p?.sub ? String(p.sub) : null;
  }

  isTokenValid(token: string): boolean {
    return this.validateJwt(token) !== null;
  }

  isExpired(token: string): boolean {
    try {
      const payload = this.decode(token);
      if (!payload?.exp) return true;
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  getClaim(token: string, claimType: string): string | undefined {
    const p = this.decode(token);
    const val = p?.[claimType];
    return typeof val === 'string' ? val : undefined;
  }

  private decode(token: string): JwtPayload | null {
    const cleaned = token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
    try {
      const base64 = cleaned.split('.')[1];
      if (!base64) return null;
      const json = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private toUniqueClaimDict(obj: Record<string, unknown>): Readonly<Record<string, unknown>> {
    const dict: Record<string, unknown> = {};
    Object.keys(obj).forEach(k => {
      if (!(k in dict)) dict[k] = obj[k] as unknown;
    });
    return dict;
  }
}
