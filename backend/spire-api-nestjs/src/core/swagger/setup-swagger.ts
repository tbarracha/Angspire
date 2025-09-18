import { INestApplication, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';

type SetupOpts = {
  includeOperations?: boolean; // default false
  opsBase?: string;            // default '/ops'
};

function extendWithOperations(
  app: INestApplication,
  doc: OpenAPIObject,
  opsBase: string,
  logger: Logger,
) {
  // Lazy require to avoid touching ops when disabled
  let OperationRegistry: any;
  let OpMeta: any;

  try {
    OperationRegistry = require('../operations/operation.registry').OperationRegistry;
    OpMeta = require('../operations/operation.contracts').OpMeta;
  } catch {
    logger.log('Operations code not present; skipping operations in Swagger.');
    return;
  }

  const reg = app.get?.(OperationRegistry, { strict: false });
  if (!reg || !Array.isArray(reg.all) || reg.all.length === 0) {
    logger.log('No operations registered; skipping operations in Swagger.');
    return;
  }

  let added = 0;
  doc.paths ||= {};
  doc.tags ||= [];

  for (const e of reg.all) {
    const path = `${opsBase}${e.route}`.replace(/\/{2,}/g, '/'); // "/ops/hello/say"
    const method = String(e.method || 'POST').toLowerCase() as 'get'|'post'|'put'|'delete';
    const group = OpMeta?.group?.(e.ctor)?.name ?? 'operations';

    if (!doc.tags.find(t => t.name === group)) doc.tags.push({ name: group });

    doc.paths[path] ||= {};
    if (!doc.paths[path][method]) {
      doc.paths[path][method] = {
        tags: [group],
        summary: e.ctor?.name?.replace?.(/Operation$/, '') ?? 'Operation',
        description: e.isStream ? 'Streaming endpoint (NDJSON/SSE, cancelable)' : 'Operation endpoint',
        requestBody: (method === 'get' || method === 'delete')
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
    } else {
      logger.warn(`OpenAPI: duplicate ${method.toUpperCase()} ${path} skipped.`);
    }
  }

  logger.log(`OpenAPI: added ${added} operation path entr${added === 1 ? 'y' : 'ies'} from registry.`);
}

export function setupSwagger(app: INestApplication, opts: SetupOpts = {}) {
  const logger = new Logger('Swagger');
  const includeOperations = !!opts.includeOperations;
  const opsBase = opts.opsBase ?? '/ops';

  const config = new DocumentBuilder()
    .setTitle('Spire API (NestJS)')
    .setDescription(includeOperations
      ? 'API + Operational DDD endpoints'
      : 'API (operations disabled)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // ⬇️ Use the factory style from the docs
  const documentFactory = () => {
    const doc = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
      ignoreGlobalPrefix: true, // ensure '/swagger' works even if a global prefix exists
    });
    if (includeOperations) {
      try {
        extendWithOperations(app, doc, opsBase, logger);
      } catch (err: any) {
        logger.error(`Failed to extend Swagger with operations: ${err?.message ?? err}`);
      }
    } else {
      logger.log('Operations excluded from Swagger.');
    }
    return doc;
  };

  SwaggerModule.setup('swagger', app, documentFactory, {
    useGlobalPrefix: false, // mount at '/swagger' even if setGlobalPrefix() is used
    customSiteTitle: 'Spire API Docs',
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
  });

  logger.log('Mounted Swagger at /swagger');
}
