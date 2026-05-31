# PWA Deployment (Vercel & Netlify)

Guide for shipping **Neon Nexus** as an installable Progressive Web App on **Vercel** or **Netlify**.

## Stack

| Piece | File / package |
|-------|----------------|
| Build | Vite 7 → `dist/` |
| PWA plugin | `vite-plugin-pwa` (Workbox, auto-update) |
| Manifest | `public/manifest.json` |
| SEO / OG | `index.html` meta + `scripts/gen-icons.mjs` |
| Vercel config | `vercel.json` |
| Netlify config | `netlify.toml` |

## Build

```bash
pnpm install
cp .env.production.example .env.production   # edit values
pnpm run build
pnpm run preview                             # local smoke at :4173
```

`prebuild` runs `gen-icons.mjs` which generates:

- PWA icons in `public/icons/android/`
- `public/og-image.png` (1200×630)
- `public/robots.txt` and `public/sitemap.xml`

## Environment variables

Set in the host dashboard or `.env.production`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_GAME_URL` | **Yes** for SEO | Canonical URL, OG image, sitemap (no trailing slash) |
| `VITE_AD_PROVIDER` | Yes | `google` for production freemium |
| `VITE_AD_TEST_MODE` | Yes | `false` in production |
| `VITE_STRIPE_CHECKOUT_URL` | For web IAP | Stripe Payment Link base URL |
| `VITE_REVENUECAT_*` | Native only | Not needed for pure PWA |

See [`.env.production.example`](../.env.production.example) for the full list.

## Deploy — Vercel (default)

### Option A: CLI

```bash
npm i -g vercel
vercel --prod
```

Set environment variables in the Vercel dashboard → Project → Settings → Environment Variables.

### Option B: Git integration

1. Connect repo to Vercel
2. **Framework preset:** Vite
3. **Build command:** `pnpm run build`
4. **Output directory:** `dist`
5. Add env vars from `.env.production.example`

[`vercel.json`](../vercel.json) adds:

- Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`)
- Long-cache headers for `/assets/*`

### Stripe webhook (optional)

Add serverless route at `api/stripe-webhook.js` for web IAP fulfillment. See [IAP.md](./IAP.md).

## Deploy — Netlify

### Option A: CLI

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### Option B: Git integration

[`netlify.toml`](../netlify.toml) configures:

- **Build:** `pnpm run build`
- **Publish:** `dist`
- **SPA fallback:** `/* → /index.html` (status 200)
- Same security + cache headers as Vercel

For Stripe webhooks on Netlify, use `netlify/functions/stripe-webhook.js`.

## Service worker strategy

`vite-plugin-pwa` generates `dist/sw.js` + Workbox precache at build time.

**Consolidation task:** [`src/main.js`](../src/main.js) also registers `./sw.js` manually in production. Prefer a single registration:

- Keep **vite-plugin-pwa** (recommended) — remove manual `navigator.serviceWorker.register('./sw.js')` from `main.js`
- Or use `injectManifest` mode with the existing `public/sw.js` — pick one, not both

Current plugin config in [`vite.config.js`](../vite.config.js):

```js
VitePWA({
  registerType: 'autoUpdate',
  manifest: false,  // uses public/manifest.json
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
    navigateFallback: 'index.html',
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
  },
})
```

## Install prompt (planned)

Add to [`MenuScene.js`](../src/scenes/MenuScene.js):

1. Listen for `beforeinstallprompt` → store `deferredPrompt`
2. Show "Install App" button when event fires
3. On click: `deferredPrompt.prompt()`; hide after `appinstalled` or dismiss

Criteria for installability:

- HTTPS (provided by Vercel/Netlify)
- Valid `manifest.json` with icons
- Registered service worker
- User engagement heuristics (browser-dependent)

## SEO & link previews

With `VITE_GAME_URL=https://your-domain.com` set at build time:

- Canonical link injected via `vite.config.js` `html-seo-inject` plugin
- `og:image` → `{VITE_GAME_URL}/og-image.png`
- JSON-LD in `index.html` points to game URL
- `robots.txt` + `sitemap.xml` reference production domain

Verify after deploy:

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- View page source — confirm `%OG_IMAGE%` replaced

## Static legal pages

Host on the same domain as the game (required for Play Store privacy URL):

- `public/privacy.html` — privacy policy
- `public/terms.html` — terms of service (optional)

URLs: `https://your-domain.com/privacy.html`

## Post-deploy checklist

- [ ] Game loads over HTTPS
- [ ] Install prompt appears (Chrome desktop / Android)
- [ ] Offline: cached shell loads after first visit
- [ ] OG preview shows title, description, og-image
- [ ] Ads show with `VITE_AD_PROVIDER=google` (or demo in staging)
- [ ] Remove Ads purchase flow opens Stripe tab (web) or succeeds (native)
- [ ] `pnpm run test:smoke` passes against preview URL (optional CI step)

## Local PWA testing

```bash
pnpm run build && pnpm run preview
# Chrome DevTools → Application → Service Workers
# Lighthouse → PWA audit
```

Note: `vite-plugin-pwa` dev mode is disabled (`devOptions: { enabled: false }`). Test PWA features against preview/production builds only.

## Related

- [PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md) — Phase 2 checklist
- [ADS.md](./ADS.md) — web AdSense / Ad Manager
- [IAP.md](./IAP.md) — Stripe web checkout
- [RELEASE.md](./RELEASE.md) — Android (privacy URL shared with Play Store)
