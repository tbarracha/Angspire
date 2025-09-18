// src/core/operations/auto-operations.module.ts
import { DynamicModule, Module, Provider, Logger } from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs';
import fg from 'fast-glob';

function toPosix(p: string) { return p.replace(/\\/g, '/'); }
function distRoot() { return path.resolve(__dirname, '..', '..'); }

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

    const dist = distRoot();
    const distCwd = path.resolve(process.cwd(), 'dist');

    // ✅ unique roots
    const roots = Array.from(new Set([dist, distCwd]));

    // Build POSIX patterns
    const candidatePatterns: string[] = [];
    for (const root of roots) {
      const r = toPosix(root);
      candidatePatterns.push(
        `${r}/**/*-operation.js`,
        `${r}/**/*.operation.js`,
        `${r}/src/**/*-operation.js`,
        `${r}/src/**/*.operation.js`,
      );
    }

    logger.log(`Scan roots:\n${roots.map(r => ` - ${r}`).join('\n')}`);
    logger.log('Glob patterns to try:');
    candidatePatterns.forEach(p => logger.debug(`   ${p}`));

    const files = Array.from(new Set(
      fg.sync(candidatePatterns, {
        absolute: true,
        dot: false,
        onlyFiles: true,
        ignore: ['**/*.spec.js','**/*.test.js','**/__mocks__/**','**/node_modules/**'],
      }),
    ));

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
      if (classes.length === 0) logger.debug(`   (no op classes): ${file}`);
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

    return { module: AutoOperationsModule, providers, exports: providers };
  }
}
