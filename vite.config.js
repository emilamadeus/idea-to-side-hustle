import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5180, strictPort: true },
  build: { target: 'esnext' },
  // maplibre-gl loads its worker from a path next to itself; pre-bundling breaks that path
  optimizeDeps: { exclude: ['maplibre-gl'] },
});
