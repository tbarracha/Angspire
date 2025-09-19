// src/core/auth/jwt.identity.ts
import { IHasIdT } from '../abstractions/interfaces';

export interface IJwtIdentity extends IHasIdT<string> {
  /** Token issuer (“iss”) */
  issuer: string;
  /** Raw claim bag (unique keys) */
  rawClaims: Readonly<Record<string, unknown>>;
  /** Service vs human */
  isService: boolean;
  /** Optional avatar */
  imageUrl?: string | null;
}

export interface IJwtUserIdentity extends IJwtIdentity {
  email?: string | null;
  userName?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface IJwtServiceIdentity extends IJwtIdentity {
  /** Client-id or logical service name */
  serviceName: string;
  /** OAuth scopes/roles granted */
  scopes: ReadonlyArray<string>;
}

export class JwtUserIdentity implements IJwtUserIdentity {
  id!: string;
  issuer!: string;
  rawClaims!: Readonly<Record<string, unknown>>;
  isService = false;

  email?: string | null;
  userName?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

export class JwtServiceIdentity implements IJwtServiceIdentity {
  id!: string;
  issuer!: string;
  rawClaims!: Readonly<Record<string, unknown>>;
  isService = true;

  serviceName!: string;
  scopes: ReadonlyArray<string> = [];
  imageUrl?: string | null;
}
