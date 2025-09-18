// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppConfigModule } from './core/config/config.module';
import { DbModule } from './core/db/db.module';
import { OperationsModule } from './core/operations/operations.module';

const OPS_ENABLED = true;

@Module({
  imports: [
    AppConfigModule,
    DbModule,
    ...(OPS_ENABLED ? [OperationsModule] : []),
  ],
})
export class AppModule {}

export { OPS_ENABLED };
