// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OperationsBootstrap, OperationsSwagger } from './spire-core/operations/operations.module';
import { RequestMethod } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }, { path: '/health', method: RequestMethod.GET }],
  });

  // Ensure operations are discovered and registry (incl. inferred DTOs) is populated
  await OperationsBootstrap.prime(app);

  // Build Swagger AFTER the registry is primed
  OperationsSwagger.setup(app, {
    includeOperations: true,
    opsBase: '/api',
    path: 'swagger',
  });

  const port = 3000;
  await app.listen(port);
  const url = await app.getUrl();
  console.log(`🚀 Application is running at ${url}`);
  console.log(`📑 Swagger UI available at ${url}/swagger`);
}
bootstrap();
