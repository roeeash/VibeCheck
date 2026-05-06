import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function buildInjectorScript(): string {
  return readFileSync(join(__dirname, 'perf-observer.js'), 'utf8');
}
