import { NestFactory } from '@nestjs/core';
import { AppModule, OPS_ENABLED } from './app.module';
import { setupSwagger } from './core/swagger/setup-swagger';

function flag(name: string, fallback: boolean) {
  const v = process.env[name];
  if (v == null) return fallback;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger first (per docs), before listen()
  setupSwagger(app, {
    includeOperations: flag('OPS_SWAGGER', OPS_ENABLED), // default mirrors OPS_ENABLED
    opsBase: process.env.OPS_BASE || '/ops',
  });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);

  const baseUrl = (await app.getUrl()).replace(/\/+$/, '');
  console.log(`🚀 Server running at: ${baseUrl}`);
  console.log(`🔎 Swagger:            ${baseUrl}/swagger`);
  console.log(`📄 Swagger JSON:       ${baseUrl}/swagger-json`);
}
bootstrap();
