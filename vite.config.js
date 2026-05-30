import { defineConfig } from 'vite';

// Cross-platform build config.
// - `base: './'` keeps asset URLs relative so the same `dist/` works on web hosts,
//   GitHub Pages, and inside a Capacitor (iOS/Android) or Electron webview.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
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
