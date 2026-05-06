import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.ts', 'tests/e2e/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@vibecheck/core': resolve(__dirname, 'packages/core/src/index.ts'),
      '@vibecheck/engine': resolve(__dirname, 'packages/engine/src/index.ts'),
      '@vibecheck/observer': resolve(__dirname, 'packages/observer/src/index.ts'),
      '@vibecheck/proxy': resolve(__dirname, 'packages/proxy/src/index.ts'),
      '@vibecheck/asset-inspector': resolve(__dirname, 'packages/asset-inspector/src/index.ts'),
      '@vibecheck/evidence': resolve(__dirname, 'packages/evidence/src/index.ts'),
      '@vibecheck/injector': resolve(__dirname, 'packages/injector/src/index.ts'),
      '@vibecheck/correlator': resolve(__dirname, 'packages/correlator/src/index.ts'),
      '@vibecheck/render': resolve(__dirname, 'packages/render/src/index.ts'),
      '@vibecheck/memory': resolve(__dirname, 'packages/memory/src/index.ts'),
    },
  },
});
