import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const admobInstalled = existsSync(resolve(root, 'node_modules/@capacitor-community/admob'));

// Cross-platform build config.
// - `base: './'` keeps asset URLs relative so the same `dist/` works on web hosts,
//   GitHub Pages, and inside a Capacitor (iOS/Android) or Electron webview.
export default defineConfig({
  base: './',
  resolve: {
    alias: admobInstalled
      ? {}
      : {
          '@capacitor-community/admob': resolve(root, 'src/stubs/capacitor-admob.js'),
        },
  },
  optimizeDeps: {
    exclude: ['@capacitor-community/admob'],
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      // AdMob plugin is installed only for native Google Ads builds (see docs/ADS.md).
      external: ['@capacitor-community/admob'],
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
