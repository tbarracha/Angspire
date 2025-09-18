import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './core/swagger/setup-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ensure discovery ran before building docs
  await app.init();

  setupSwagger(app); // mount routes, but do not call app.getUrl() yet

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const baseUrl = (await app.getUrl()).replace(/\/+$/, '');
  console.log(`🚀 Server running at: ${baseUrl}`);
  console.log(`🔎 Swagger (no prefix): ${baseUrl}/swagger`);
  console.log(`🔎 Swagger (api path):  ${baseUrl}/api/swagger`);
  console.log(`📄 Swagger JSON:        ${baseUrl}/swagger-json`);
}
bootstrap();
