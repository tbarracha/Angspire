// src/spire-core/db/auth.datasource.ts

import 'reflect-metadata';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

function semicolonToPgUrl(cs: string): string {
  const raw = cs.replace(/^"+|"+$/g, '').trim();
  const parts = Object.fromEntries(
    raw.split(';').map(s => s.trim()).filter(Boolean).map(kv => {
      const i = kv.indexOf('=');
      const k = kv.slice(0, i).trim().toLowerCase();
      const v = kv.slice(i + 1).trim();
      return [k, v];
    }),
  ) as Record<string, string>;

  const host = parts['host'] ?? 'localhost';
  const port = parts['port'] ?? '5432';
  const db   = parts['database'] ?? '';
  const user = parts['username'] ?? parts['user'] ?? 'postgres';
  const pass = parts['password'] ?? '';

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
}

const profile = (process.env.DB_PROFILE ?? 'hostdev').toUpperCase();

const pgUrl =
  process.env.DB_AUTH_URL ||
  (process.env.DB_AUTH_CONN ? semicolonToPgUrl(process.env.DB_AUTH_CONN) : undefined) ||
  process.env[`PG_${profile}_URL`] ||
  'postgres://postgres:postgres@localhost:5432/angspire_auth';

export default new DataSource({
  type: 'postgres',
  url: pgUrl,
  entities: [path.join(__dirname, '../../**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../../migrations/auth/*.{ts,js}')],
  migrationsTableName: 'auth_migrations',
  logging: false,
});
