import { Module, OnModuleInit, Injectable, Logger } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService, Reflector } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from '../config/config.module';
import { AutoOperationsModule } from './auto-operations.module';
import { OperationRegistry, StreamAbortRegistry } from './operation.registry';
import { OpMeta } from './operation.contracts';
import { OperationsController } from './operations.controller';

@Injectable()
class OperationMapper implements OnModuleInit {
  private readonly logger = new Logger('OperationMapper');

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly reg: OperationRegistry,
  ) { }

  onModuleInit() {
    const providers = this.discovery.getProviders();
    let candidates = 0;
    let registered = 0;

    for (const p of providers) {
      const target = p.metatype as any;
      if (!target || typeof target !== 'function') continue;

      const proto = target.prototype;
      const hasExec = proto?.execute instanceof Function;
      const hasStream = proto?.executeStream instanceof Function;
      if (!hasExec && !hasStream) continue;

      candidates++;
      const group = OpMeta.group(target)?.name ?? 'operations';
      this.reg.registerHttp(target, group);
      registered++;
    }

    const endpoints = this.reg.all;
    this.logger.log(`Operation candidates: ${candidates}; registered: ${registered}`);
    if (endpoints.length === 0) {
      this.logger.warn('No HTTP operations registered. Check auto-discovery patterns and build outputs.');
    } else {
      this.logger.log(`Discovered endpoints (${endpoints.length}):`);
      for (const e of endpoints) {
        const flags = [
          e.isStream ? 'stream' : 'classic',
          e.policy,
          e.auth ? `auth:${e.auth === true ? 'required' : e.auth}` : 'anon',
        ].join(', ');
        this.logger.log(` - [${e.method}] ${e.route}  (${flags})  <- ${e.ctor.name}`);
      }
    }
  }
}

@Module({
  imports: [
    AppConfigModule,
    DiscoveryModule,
    // IMPORTANT: import the auto-loader ONLY here, not also in AppModule,
    // or you’ll see double initialization
    AutoOperationsModule.register(),
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 60, name: 'ops-default' },
      { ttl: 30_000, limit: 10, name: 'ops-strict' },
      { ttl: 1_000, limit: 3, name: 'ops-stream' },
    ]),
  ],
  controllers: [OperationsController],
  providers: [
    OperationRegistry,
    StreamAbortRegistry,
    OperationMapper,
  ],
  exports: [OperationRegistry],
})
export class OperationsModule { }
