import { INestApplication, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { OperationRegistry } from '../operations/operation.registry';
import { OpMeta } from '../operations/operation.contracts';

function extendWithOperations(doc: OpenAPIObject, reg: OperationRegistry, logger = new Logger('Swagger')) {
  let added = 0;
  doc.paths ||= {};
  doc.tags ||= [];

  for (const e of reg.all) {
    const path = e.route;
    const method = e.method.toLowerCase() as 'get'|'post'|'put'|'delete';
    const group = OpMeta.group(e.ctor)?.name ?? 'operations';

    if (!doc.tags.find(t => t.name === group)) {
      doc.tags.push({ name: group });
    }

    doc.paths[path] ||= {};
    doc.paths[path][method] = {
      tags: [group],
      summary: e.ctor.name.replace(/Operation$/, ''),
      description: e.isStream ? 'Streaming endpoint (NDJSON/SSE, cancelable)' : 'Operation endpoint',
      requestBody:
        method === 'get' || method === 'delete'
          ? undefined
          : { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: {
        '200': { description: e.isStream ? 'OK (stream)' : 'OK' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '429': { description: 'Too Many Requests' },
      },
    };
    added++;
  }

  logger.log(`OpenAPI: added ${added} operation path entr${added === 1 ? 'y' : 'ies'} from registry.`);
}

export function setupSwagger(app: INestApplication) {
  const logger = new Logger('Swagger');

  const cfg = new DocumentBuilder()
    .setTitle('Spire API (NestJS)')
    .setDescription('Operational DDD auto-discovered operations')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, cfg, { deepScanRoutes: true });

  const reg = app.get(OperationRegistry);
  extendWithOperations(document, reg, logger);

  // Mount at both paths (works with/without global prefix)
  try {
    SwaggerModule.setup('swagger', app, document, {
      customSiteTitle: 'Spire API Docs',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
      useGlobalPrefix: false,
    });
    SwaggerModule.setup('api/swagger', app, document, {
      customSiteTitle: 'Spire API Docs',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
      useGlobalPrefix: false,
    });
    logger.log('Mounted Swagger at /swagger and /api/swagger');
  } catch (err) {
    logger.error('SwaggerModule.setup failed. Is @nestjs/swagger + swagger-ui-express installed?', err as any);
  }
}
