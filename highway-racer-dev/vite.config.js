import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/games/highway-racer/',
  build: {
    outDir: resolve(__dirname, '../games/highway-racer'),
    emptyOutDir: true,
    assetsInlineLimit: 0
  },
  server: {
    port: 5173,
    host: true
  }
});
