import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['e2e/**/*', 'node_modules/**/*'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts', 'src/app.ts'], // app.ts is UI/DOM tested via Playwright E2E
    },
  },
});
