import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

// Convert:  Host=…;Port=…;Database=…;Username=…;Password=…  →  postgres://user:pass@host:port/db
function semicolonToPgUrl(cs: string): string {
  // allow quotes in .env value
  const raw = cs.replace(/^"+|"+$/g, '').trim();
  const parts = Object.fromEntries(
    raw
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(kv => {
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

  // basic URL encoding for password/user
  const userEnc = encodeURIComponent(user);
  const passEnc = encodeURIComponent(pass);

  return `postgres://${userEnc}:${passEnc}@${host}:${port}/${db}`;
}

function resolvePgUrl(cfg: ConfigService): string {
  const profile = (process.env.DB_PROFILE ?? 'hostdev').toUpperCase();

  // Preferred explicit keys (your current .env):
  const semicolon = cfg.get<string>('DB_AUTH_CONN');     // "Host=...;Port=...;..."
  const urlDirect = cfg.get<string>('DB_AUTH_URL');      // optional fallback URL

  // Optional profile-based URL convention, if you adopt it later:
  const profUrl   = cfg.get<string>(`PG_${profile}_URL`);

  const url =
    (urlDirect && urlDirect.trim()) ||
    (semicolon && semicolonToPgUrl(semicolon)) ||
    (profUrl && profUrl.trim()) ||
    'postgres://postgres:postgres@localhost:5432/angspire_auth';

  return url;
}

function resolveMongoUri(cfg: ConfigService): string {
  const profile = (process.env.DB_PROFILE ?? 'hostdev').toUpperCase();

  // Your current .env
  const base = cfg.get<string>('DB_DOMAIN_CONN');       // e.g. mongodb://localhost:27017
  const db   = cfg.get<string>('DB_DOMAIN_DATABASE');   // e.g. angspire_domain

  // Optional profile-based URL convention:
  const prof = cfg.get<string>(`MONGO_${profile}_URL`);

  if (prof) return prof;
  if (base && db) return `${base.replace(/\/+$/,'')}/${db}`;
  if (base) return base; // if db provided via query or elsewhere

  // default dev fallback
  return 'mongodb://localhost:27017/angspire_domain';
}

@Global()
@Module({
  imports: [
    // Load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // --- Postgres (Auth) ---
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const url = resolvePgUrl(cfg);
        return {
          type: 'postgres' as const,
          url,
          autoLoadEntities: true,
          synchronize: false,     // use migrations instead
          migrationsRun: false,
        };
      },
    }),

    // --- Mongo (Domain) ---
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const uri = resolveMongoUri(cfg);
        return { uri };
      },
    }),
  ],
  exports: [TypeOrmModule, MongooseModule],
})
export class DbModule {}
