import { DynamicModule, Module, Provider, Logger } from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs';
import fg from 'fast-glob';

/** Convert any absolute path to POSIX-style for fast-glob. */
function toPosix(p: string) {
  return p.replace(/\\/g, '/');
}

/**
 * Resolve the compiled dist root regardless of cwd.
 * Assumes this file is in dist/core/operations at runtime.
 */
function distRoot() {
  // __dirname => .../dist/core/operations
  return path.resolve(__dirname, '..', '..'); // => .../dist
}

function pickOperationClasses(mod: any): any[] {
  const out: any[] = [];
  for (const key of Object.keys(mod)) {
    const val = (mod as any)[key];
    if (typeof val === 'function' && val.prototype) {
      const proto = val.prototype;
      if (typeof proto.execute === 'function' || typeof proto.executeStream === 'function') {
        out.push(val);
      }
    }
  }
  return out;
}

@Module({})
export class AutoOperationsModule {
  static register(): DynamicModule {
    const logger = new Logger('AutoOperations');

    // Primary roots to try
    const dist = distRoot();
    const distCwd = path.resolve(process.cwd(), 'dist');

    // Build POSIX patterns explicitly (avoid path.join for glob strings)
    const roots = [dist, distCwd];
    const candidatePatterns: string[] = [];
    for (const root of roots) {
      const r = toPosix(root);
      candidatePatterns.push(
        `${r}/**/*-operation.js`,
        `${r}/**/*.operation.js`,
        // some setups emit under dist/src/**
        `${r}/src/**/*-operation.js`,
        `${r}/src/**/*.operation.js`,
      );
    }

    logger.log(`Scan roots:\n - ${dist}\n - ${distCwd}`);
    logger.log('Glob patterns to try:');
    candidatePatterns.forEach(p => logger.debug(`   ${p}`));

    // Run glob (dedupe files)
    const files = Array.from(
      new Set(
        fg.sync(candidatePatterns, {
          absolute: true,
          dot: false,
          onlyFiles: true,
          ignore: [
            '**/*.spec.js',
            '**/*.test.js',
            '**/__mocks__/**',
            '**/node_modules/**',
          ],
        }),
      ),
    );

    logger.log(`Matched files: ${files.length}`);
    files.forEach(f => logger.debug(` - ${f}`));

    const providers: Provider[] = [];
    const seen = new Set<any>();
    let pickedClasses = 0;

    for (const file of files) {
      if (!fs.existsSync(file)) continue;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(file);

      const classes = pickOperationClasses(mod);
      if (classes.length === 0) {
        logger.debug(`   (no op classes): ${file}`);
      }
      for (const c of classes) {
        if (seen.has(c)) continue;
        providers.push(c);
        seen.add(c);
        pickedClasses++;
        logger.debug(`   + provider: ${c.name}`);
      }
    }

    logger.log(`Total operation providers registered: ${pickedClasses}`);
    if (pickedClasses === 0) {
      logger.warn('No operations found. Verify your file names end with ".operation.ts" or "-operation.ts" and that the project has been compiled to dist/.');
    }

    return {
      module: AutoOperationsModule,
      providers,
      exports: providers,
    };
  }
}
