import { defineConfig } from 'vite';

// Builds the demo/ folder as a static site. BASE_PATH defaults to '/' for local
// dev; the Pages workflow sets it to '/maplibre-grid/' so assets resolve under
// https://openfantasymap.github.io/maplibre-grid/.
export default defineConfig({
  root: 'demo',
  base: process.env.BASE_PATH ?? '/',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    sourcemap: true,
  },
});
