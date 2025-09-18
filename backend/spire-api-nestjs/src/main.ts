// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OperationsSwagger } from './core/operations/operations.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  OperationsSwagger.setup(app, {
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
