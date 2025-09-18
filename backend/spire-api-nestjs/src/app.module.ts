// src/app.module.ts
import { Module } from '@nestjs/common';
import { OpsKernelModule } from './core/operations/ops.kernel';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const AutoOps = OpsKernelModule.registerAutoProviders();

@Module({
  imports: [
    AutoOps,
    OpsKernelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
