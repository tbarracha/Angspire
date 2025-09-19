// src/core/config/config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type AppSettings = ReturnType<typeof loadAppsettings>;

export function loadAppsettings() {
  const fp = process.env.APPCONFIG_PATH || path.join(process.cwd(), 'config', 'appsettings.json');
  const raw = fs.readFileSync(fp, 'utf8');
  const json = JSON.parse(raw);

  // --- DB profile parity with .NET
  const profile = process.env.DB_PROFILE || json?.DbSettings?.Profile || 'hostdev';
  const profiles = json?.DbSettings?.Profiles || {};
  const active = profiles[profile] ?? {};

  // --- Feature flags (with sensible defaults)
  const opsEnabled = json?.Operations?.Enabled ?? false;
  const opsBase = json?.Operations?.Http?.BasePath || '/ops';

  const swaggerEnabled = json?.Swagger?.Enabled ?? true;
  const swaggerPath = (json?.Swagger?.Path || 'swagger').replace(/^\/+/, ''); // "swagger"
  const swaggerIncludeOps = json?.Swagger?.IncludeOperations ?? opsEnabled;
  const swaggerUseGlobalPrefix = json?.Swagger?.UseGlobalPrefix ?? false;

  return {
    // original tree
    ...json,

    // derived & flattened
    ActiveProfile: profile,
    DbAuth: active.Auth ?? {},
    DbDomain: active.Domain ?? {},
    FileStorage: active.FileStorage ?? {},

    // features
    OpsEnabled: !!opsEnabled,
    OpsBase: opsBase,
    SwaggerEnabled: !!swaggerEnabled,
    SwaggerPath: swaggerPath,
    SwaggerIncludeOperations: !!swaggerIncludeOps,
    SwaggerUseGlobalPrefix: !!swaggerUseGlobalPrefix,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadAppsettings],
    }),
  ],
})
export class AppConfigModule {}
