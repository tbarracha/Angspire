// src/modules/auth/stores.ts
import { randomUUID } from 'crypto';

export const USER_STORE = Symbol('USER_STORE');
export const REFRESH_TOKEN_STORE = Symbol('REFRESH_TOKEN_STORE');

export interface UserRecord {
  id: string;
  isService: boolean;
  email?: string | null;
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  passwordHash: string;         // bcrypt hash
  imageUrl?: string | null;
  scopes?: string[];            // for services
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserStore {
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUserName(userName: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  add(user: Omit<UserRecord, 'id'|'createdAt'|'updatedAt'>): Promise<UserRecord>;
  update(user: UserRecord): Promise<UserRecord>;
}

export interface RefreshTokenRecord {
  token: string;
  userId: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshTokenStore {
  add(rt: Omit<RefreshTokenRecord, 'createdAt'|'updatedAt'>): Promise<RefreshTokenRecord>;
  getValid(token: string): Promise<RefreshTokenRecord | null>;
  revoke(token: string): Promise<void>;
}

/* ---------------- In-memory defaults (dev only) ---------------- */

export class InMemoryUserStore implements IUserStore {
  private users = new Map<string, UserRecord>();

  async findByEmail(email: string) {
    email = (email ?? '').toLowerCase().trim();
    for (const u of this.users.values()) if ((u.email ?? '').toLowerCase() === email) return u;
    return null;
  }
  async findByUserName(userName: string) {
    userName = (userName ?? '').trim();
    for (const u of this.users.values()) if ((u.userName ?? '') === userName) return u;
    return null;
  }
  async findById(id: string) { return this.users.get(id) ?? null; }

  async add(u: Omit<UserRecord, 'id'|'createdAt'|'updatedAt'>) {
    const now = new Date();
    const rec: UserRecord = { id: randomUUID(), createdAt: now, updatedAt: now, ...u };
    this.users.set(rec.id, rec);
    return rec;
  }
  async update(u: UserRecord) {
    u.updatedAt = new Date();
    this.users.set(u.id, u);
    return u;
  }
}

export class InMemoryRefreshTokenStore implements IRefreshTokenStore {
  private tokens = new Map<string, RefreshTokenRecord>();

  async add(rt: Omit<RefreshTokenRecord, 'createdAt'|'updatedAt'>) {
    const now = new Date();
    const rec: RefreshTokenRecord = { createdAt: now, updatedAt: now, ...rt };
    this.tokens.set(rec.token, rec);
    return rec;
  }
  async getValid(token: string) {
    const rec = this.tokens.get(token);
    if (!rec) return null;
    if (rec.revokedAt) return null;
    if (rec.expiresAt.getTime() <= Date.now()) return null;
    return rec;
  }
  async revoke(token: string) {
    const rec = this.tokens.get(token);
    if (!rec) return;
    rec.revokedAt = new Date();
    rec.updatedAt = new Date();
  }
}
