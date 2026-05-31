import { VitePWA } from 'vite-plugin-pwa';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const admobInstalled = existsSync(resolve(root, 'node_modules/@capacitor-community/admob'));

function siteUrl() {
  return (process.env.VITE_GAME_URL || '').replace(/\/$/, '');
}

function htmlSeoInject() {
  return {
    name: 'html-seo-inject',
    transformIndexHtml(html) {
      const base = siteUrl();
      const ogImage = base ? `${base}/og-image.png` : './og-image.png';
      const canonicalTag = base ? `<link rel="canonical" href="${base}/" />` : '';
      const ogUrlTag = base ? `<meta property="og:url" content="${base}/" />` : '';
      const jsonUrl = base ? `${base}/` : './';
      return html
        .replace('<!-- SEO:CANONICAL -->', canonicalTag)
        .replace('<!-- SEO:OG_URL -->', ogUrlTag)
        .replaceAll('%OG_IMAGE%', ogImage)
        .replace('<!-- SEO:JSON_URL -->', jsonUrl);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    htmlSeoInject(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['og-image.png', 'icons/android/android-launchericon-512-512.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,mp3}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: admobInstalled
      ? {}
      : {
          '@capacitor-community/admob': resolve(root, 'src/stubs/capacitor-admob.js'),
          '@revenuecat/purchases-capacitor': resolve(root, 'src/stubs/revenuecat.js'),
        },
  },
  optimizeDeps: {
    exclude: ['@capacitor-community/admob', '@revenuecat/purchases-capacitor'],
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
    },
    rollupOptions: {
      external: ['@capacitor-community/admob'],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
