import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { buildPwaManifest } from './scripts/pwa-manifest.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const admobInstalled = existsSync(resolve(root, 'node_modules/@capacitor-community/admob'));

function loadPwaManifest() {
  const manifestPath = resolve(root, 'public/manifest.json');
  if (!existsSync(manifestPath)) return buildPwaManifest();
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function siteUrl() {
  return (process.env.VITE_GAME_URL || '').replace(/\/$/, '');
}

function legalSupportEmail() {
  const email = (process.env.VITE_SUPPORT_EMAIL || 'support@example.com').trim();
  return {
    name: 'legal-support-email',
    closeBundle() {
      for (const file of ['privacy.html', 'terms.html']) {
        const p = resolve(root, 'dist', file);
        if (!existsSync(p)) continue;
        let html = readFileSync(p, 'utf8');
        html = html.replaceAll('support@example.com', email);
        writeFileSync(p, html);
      }
    },
  };
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
    legalSupportEmail(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifestFilename: 'manifest.json',
      manifest: loadPwaManifest(),
      includeAssets: [
        'app-ads.txt',
        'og-image.png',
        'manifest.json',
        'icons/android/android-launchericon-192-192.png',
        'icons/android/android-launchericon-512-512.png',
        'icons/android/android-launchericon-192-192-maskable.png',
        'icons/android/android-launchericon-512-512-maskable.png',
      ],
      workbox: {
        // Precache static media only — JS/CSS/HTML use stale-while-revalidate below
        // so deploys propagate without serving an old precached app shell.
        globPatterns: ['**/*.{ico,png,svg,woff2,mp3,json}'],
        globIgnores: ['**/index.html', '**/sw.js', '**/workbox-*.js'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pages',
              expiration: { maxEntries: 8, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ sameOrigin, url, request }) =>
              sameOrigin && (request.destination === 'script' || /\.(?:js|mjs)$/i.test(url.pathname)),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'scripts',
              expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ sameOrigin, request }) =>
              sameOrigin && request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'styles',
              expiration: { maxEntries: 16, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ sameOrigin, url }) =>
              sameOrigin && /\.html$/i.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'html-assets',
              expiration: { maxEntries: 8, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
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
