// src/app.module.ts
import { Module } from '@nestjs/common';
import { OperationsModule } from './spire-core/operations/operations.module';
import { AppController } from './app.controller';
import { DbModule } from './spire-core/db/db.module';
import { AuthModule } from './modules/auth/auth.module';

const AutoOperations = OperationsModule.registerAutoProviders();

@Module({
  imports: [
    DbModule,
    AuthModule,
    AutoOperations,
  ],
  controllers: [AppController],
})
export class AppModule {}
