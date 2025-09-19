// src/modules/auth/authentication.service.ts
import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { ConfigService } from '@nestjs/config';
import { USER_STORE, REFRESH_TOKEN_STORE, IUserStore, IRefreshTokenStore, UserRecord } from './stores';
import { JwtUserIdentity, JwtServiceIdentity, IJwtIdentity } from 'src/spire-core/auth/jwt.identity';

type Claims = Record<string, string>;

@Injectable({ scope: Scope.REQUEST })
export class AuthenticationService {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessMinutes: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    @Inject(USER_STORE) private readonly users: IUserStore,
    @Inject(REFRESH_TOKEN_STORE) private readonly refreshTokens: IRefreshTokenStore,
    @Inject(REQUEST) private readonly req: Request,
  ) {
    this.issuer = this.cfg.get<string>('JWT_ISSUER') ?? 'http://localhost';
    this.audience = this.cfg.get<string>('JWT_AUDIENCE') ?? 'http://localhost';
    this.accessMinutes = this.cfg.get<number>('JWT_ACCESS_TOKEN_MINUTES') ?? 60;
  }

  /* ------------------------ Public API (used by operations) ------------------------ */

  async registerUserAsync(email: string, password: string, firstName: string, lastName: string, userName?: string) {
    const byEmail = await this.users.findByEmail(email);
    if (byEmail) throw new Error('Email already exists');

    const uname = (userName && userName.trim()) || email;
    const byUname = await this.users.findByUserName(uname);
    if (byUname) throw new Error('Username already exists');

    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.add({
      isService: false,
      email,
      userName: uname,
      firstName,
      lastName,
      passwordHash: hash,
      imageUrl: null,
      scopes: [],
    });

    const jwtIdentity = this.buildJwtUser(user);
    const accessToken = await this.generateJwt(jwtIdentity, this.userClaims(jwtIdentity));
    const refreshToken = await this.issueRefreshToken(user);
    return { accessToken, refreshToken };
  }

  async registerServiceAsync(serviceName: string, clientSecret: string, scopes?: string[]) {
    const byName = await this.users.findByUserName(serviceName);
    if (byName) throw new Error('Service already exists');

    const hash = await bcrypt.hash(clientSecret, 10);
    const svc = await this.users.add({
      isService: true,
      userName: serviceName,
      email: null,
      firstName: null,
      lastName: null,
      passwordHash: hash,
      imageUrl: null,
      scopes: scopes ?? [],
    });

    const jwtIdentity = this.buildJwtService(svc);
    const accessToken = await this.generateJwt(jwtIdentity, this.serviceClaims(jwtIdentity));
    const refreshToken = await this.issueRefreshToken(svc);
    return { accessToken, refreshToken };
  }

  async loginAsync(identifier: string, password: string) {
    const principal =
      (await this.users.findByEmail(identifier)) ??
      (await this.users.findByUserName(identifier));

    if (!principal) throw new Error('Invalid credentials');

    const ok = await bcrypt.compare(password, principal.passwordHash);
    if (!ok) throw new Error('Invalid credentials');

    const jwtIdentity = principal.isService ? this.buildJwtService(principal) : this.buildJwtUser(principal);
    const claims = principal.isService ? this.serviceClaims(jwtIdentity as JwtServiceIdentity) : this.userClaims(jwtIdentity as JwtUserIdentity);

    const accessToken = await this.generateJwt(jwtIdentity, claims);
    const refreshToken = await this.issueRefreshToken(principal);
    return { accessToken, refreshToken };
  }

  async logoutAsync(refreshToken: string) {
    await this.refreshTokens.revoke(refreshToken);
  }

  async refreshTokenAsync(refreshToken: string) {
    const rec = await this.refreshTokens.getValid(refreshToken);
    if (!rec) throw new Error('Invalid or expired refresh token');

    await this.refreshTokens.revoke(refreshToken);
    const user = await this.users.findById(rec.userId);
    if (!user) throw new Error('Unknown principal');

    const jwtIdentity = user.isService ? this.buildJwtService(user) : this.buildJwtUser(user);
    const claims = user.isService ? this.serviceClaims(jwtIdentity as JwtServiceIdentity) : this.userClaims(jwtIdentity as JwtUserIdentity);

    const accessToken = await this.generateJwt(jwtIdentity, claims);
    const newRefresh = await this.issueRefreshToken(user);
    return { accessToken, refreshToken: newRefresh };
  }

  /* ------------------------ Helpers consumed by operations ------------------------ */

  validateJwt(token: string) {
    try {
      return this.jwt.verify(token, { issuer: this.issuer, audience: this.audience });
    } catch { return null; }
  }

  tryGetBearerFromHeader(): string | null {
    const h = (this.req.headers as any)?.authorization as string | undefined;
    if (!h) return null;
    const prefix = 'Bearer ';
    return h.startsWith(prefix) ? h.slice(prefix.length).trim() : null;
  }

  tryGetTokenFromQuery(): string | null {
    const url = new URL((this.req as any).url, 'http://local');
    const t = url.searchParams.get('token');
    return t ? t.trim() : null;
  }

  hasClaim(payload: any, type: string): boolean {
    if (!payload) return false;
    return Object.prototype.hasOwnProperty.call(payload, type);
  }

  mapToUserIdentity(payload: any): JwtUserIdentity {
    const id = payload['sub'] ?? payload['user_id'] ?? '';
    const jwt = new JwtUserIdentity();
    jwt.id = id;
    jwt.issuer = payload['iss'] ?? this.issuer;
    jwt.rawClaims = payload ?? {};
    jwt.isService = false;
    jwt.email = payload['email'] ?? null;
    jwt.userName = payload['preferred_username'] ?? payload['name'] ?? null;
    jwt.displayName = payload['name'] ?? jwt.userName ?? null;
    jwt.firstName = payload['given_name'] ?? null;
    jwt.lastName = payload['family_name'] ?? null;
    jwt.imageUrl = payload['picture'] ?? null;
    return jwt;
  }

  mapToServiceIdentity(payload: any): JwtServiceIdentity {
    const id = payload['sub'] ?? '';
    const jwt = new JwtServiceIdentity();
    jwt.id = id;
    jwt.issuer = payload['iss'] ?? this.issuer;
    jwt.rawClaims = payload ?? {};
    jwt.isService = true;
    jwt.serviceName = payload['client_id'] ?? 'unknown';
    jwt.scopes = (payload['scope'] ? String(payload['scope']).split(' ') : []) as string[];
    jwt.imageUrl = payload['picture'] ?? null;
    return jwt;
  }

  /* -------------------------------- internals -------------------------------- */

  private buildJwtUser(u: UserRecord): JwtUserIdentity {
    const jwt = new JwtUserIdentity();
    jwt.id = u.id;
    jwt.issuer = this.issuer;
    jwt.rawClaims = {};
    jwt.email = u.email ?? null;
    jwt.userName = u.userName ?? null;
    jwt.displayName = u.userName ?? null;
    jwt.firstName = u.firstName ?? null;
    jwt.lastName = u.lastName ?? null;
    jwt.imageUrl = u.imageUrl ?? null;
    return jwt;
  }

  private buildJwtService(s: UserRecord): JwtServiceIdentity {
    const jwt = new JwtServiceIdentity();
    jwt.id = s.id;
    jwt.issuer = this.issuer;
    jwt.rawClaims = {};
    jwt.serviceName = s.userName ?? 'service';
    jwt.scopes = s.scopes ?? [];
    jwt.imageUrl = s.imageUrl ?? null;
    return jwt;
  }

  private userClaims(j: JwtUserIdentity): Claims {
    const c: Claims = {
      sub: j.id,
      iss: this.issuer,
      aud: this.audience,
      email: j.email ?? '',
      given_name: j.firstName ?? '',
      family_name: j.lastName ?? '',
      name: j.displayName ?? j.userName ?? '',
    };
    return c;
  }

  private serviceClaims(j: JwtServiceIdentity): Claims {
    const c: Claims = {
      sub: j.id,
      iss: this.issuer,
      aud: this.audience,
      client_id: j.serviceName,
    };
    if (j.scopes?.length) c['scope'] = j.scopes.join(' ');
    return c;
  }

  private async generateJwt(identity: IJwtIdentity, claims: Claims) {
    return await this.jwt.signAsync(claims);
  }

  private async issueRefreshToken(principal: UserRecord) {
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url');
    const days = 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.refreshTokens.add({ token, userId: principal.id, expiresAt });
    return token;
  }
}
