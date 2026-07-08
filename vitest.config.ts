import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Behavioral tests share data/manual.json — run files sequentially and in
    // isolated environments to prevent snapshot/restore races and module-cache
    // contamination between test files that hit real file I/O.
    fileParallelism: false,
    isolate: true,
    pool: 'forks',
    // Only run tests in the tests/ directory; exclude node_modules and scaffold.test.mjs.
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'tests/scaffold.test.mjs'],
  },
});
