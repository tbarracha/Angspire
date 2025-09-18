// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OpsKernel } from './core/operations/ops.kernel';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  OpsKernel.setupSwagger(app, {
    includeOperations: true,
    opsBase: '/ops',
    path: 'swagger',
  });

  const port = 3000;
  await app.listen(port);
  const url = await app.getUrl();

  console.log(`🚀 Application is running at ${url}`);
  console.log(`📑 Swagger UI available at ${url}/swagger`);
}
bootstrap();
