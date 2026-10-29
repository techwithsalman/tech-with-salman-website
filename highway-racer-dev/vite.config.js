import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/games/highway-racer/',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    assetsInlineLimit: 0
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    watch: { ignored: ['**/.chrome-*/**', '**/review/**'] }
  }
});
