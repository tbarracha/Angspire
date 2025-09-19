// src/app.module.ts
import { Module } from '@nestjs/common';
import { OperationsModule } from './spire-core/operations/operations.module';
import { AppController } from './app.controller';

const AutoOperations = OperationsModule.registerAutoProviders();

@Module({
  imports: [
    AutoOperations,
  ],
  controllers: [AppController],
})
export class AppModule {}
