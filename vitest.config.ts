import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so vitest does not inherit the demo's
// root: 'demo' setting and try to discover tests under demo/.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
