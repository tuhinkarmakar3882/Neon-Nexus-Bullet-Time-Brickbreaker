import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const admobInstalled = existsSync(resolve(root, 'node_modules/@capacitor-community/admob'));

function siteUrl() {
  return (process.env.VITE_GAME_URL || '').replace(/\/$/, '');
}

/** Inject canonical + absolute Open Graph URLs when VITE_GAME_URL is set at build time. */
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

// Cross-platform build config.
// - `base: './'` keeps asset URLs relative so the same `dist/` works on web hosts,
//   GitHub Pages, and inside a Capacitor (iOS/Android) or Electron webview.
export default defineConfig({
  base: './',
  plugins: [htmlSeoInject()],
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
