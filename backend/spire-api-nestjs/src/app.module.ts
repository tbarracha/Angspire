// src/app.module.ts
import { Module } from '@nestjs/common';
import { OperationsModule } from './core/operations/operations.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const AutoOps = OperationsModule.registerAutoProviders();

@Module({
  imports: [
    // ✅ Only the dynamic module (merges OperationsModule + auto-discovered providers)
    AutoOps,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
