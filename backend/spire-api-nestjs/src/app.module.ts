// app.module.ts
import { Module } from '@nestjs/common';
import { OpsKernelModule } from './core/operations/ops.kernel';

// If you want to auto-load providers discovered in dist:
const AutoOps = OpsKernelModule.registerAutoProviders();

@Module({
  imports: [
    AutoOps,          // registers discovered operation classes as providers
    OpsKernelModule,  // registry + controller + throttling + mapper
  ],
})
export class AppModule {}
