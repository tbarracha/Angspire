import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

function loadAppsettings() {
  const fp = process.env.APPCONFIG_PATH || path.join(process.cwd(), 'config', 'appsettings.json');
  const raw = fs.readFileSync(fp, 'utf8');
  const json = JSON.parse(raw);

  // profile selection parity with .NET
  const profile = process.env.DB_PROFILE || json?.DbSettings?.Profile || 'hostdev';
  const profiles = json?.DbSettings?.Profiles || {};
  const active = profiles[profile] ?? {};

  return {
    ...json,
    ActiveProfile: profile,
    DbAuth: active.Auth ?? {},
    DbDomain: active.Domain ?? {},
    FileStorage: active.FileStorage ?? {},
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
