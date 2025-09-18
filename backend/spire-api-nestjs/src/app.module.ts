// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppConfigModule } from './core/config/config.module';
import { DbModule } from './core/db/db.module';
import { OperationsModule } from './core/operations/operations.module';
import { AutoOperationsModule } from './core/operations/auto-operations.module';

@Module({
  imports: [
    AppConfigModule,
    DbModule,
    AutoOperationsModule.register(),  // Auto-register all operations (providers) first...
    OperationsModule,                 // ...then your OperationsModule will discover & map them
  ],
})
export class AppModule {}
