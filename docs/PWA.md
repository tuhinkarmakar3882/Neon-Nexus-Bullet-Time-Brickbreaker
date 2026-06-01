# Web deployment (Vercel & Netlify)

Guide for shipping **Neon Nexus** as a static site on **Vercel** or **Netlify**. The shell is **Next.js 15** (App Router) with `output: 'export'`; production assets land in **`out/`** (also Capacitor `webDir`).

## Stack

| Piece | Location |
|-------|----------|
| Build | `pnpm run build` → `out/` |
| Config | [`next.config.mjs`](../next.config.mjs) (`trailingSlash: true`, `images.unoptimized`) |
| Vercel | [`vercel.json`](../vercel.json) + dashboard env |
| Netlify | [`netlify.toml`](../netlify.toml) + dashboard env |
| Manifest / icons | `public/manifest.json`, `scripts/gen-icons.mjs` (`prebuild`) |
| Stripe (web IAP) | Vercel: `api/*.js` · Netlify: `netlify/functions/*.js` |

## Build locally

```bash
pnpm install
cp .env.production.example .env.production   # edit values (gitignored)
pnpm run ship:check:web                      # optional env validation
pnpm run build
pnpm run preview                             # http://localhost:4173 → serves out/
```

`prebuild` runs version stamp, icon generation, and `app-ads.txt` sync.

## Environment variables

Set in the host dashboard (Production + Preview) or in `.env.production` for local builds. `next.config.mjs` forwards any `VITE_*` keys into the client bundle.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_GAME_URL` | **Yes** for SEO | Canonical URL, sitemap, OG (no trailing slash) |
| `VITE_AD_PROVIDER` | Yes | `google` for production freemium |
| `VITE_AD_TEST_MODE` | Yes | `false` in production |
| `VITE_STRIPE_CHECKOUT_URL` | Web IAP | Stripe Payment Link base URL |
| `STRIPE_SECRET_KEY` | Web IAP | Server only — **not** `VITE_` |
| `STRIPE_WEBHOOK_SECRET` | Web IAP | Server only |
| `NEXT_PUBLIC_SHELL_ADS` | Optional | `1` to show shell ad slots |

See [`.env.production.example`](../.env.production.example) for the full list.

---

## Deploy — Vercel

### Option A: Git integration (recommended)

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. **Framework preset:** Next.js (detected automatically).
3. **Install command:** `pnpm install`
4. **Build command:** `pnpm run build`
5. **Output directory:** `out` (set automatically when `output: 'export'` is in `next.config.mjs`; [`vercel.json`](../vercel.json) documents the same).
6. Add environment variables from `.env.production.example` (Production + Preview as needed).

### Option B: CLI

```bash
pnpm i -g vercel
vercel link          # once per machine
vercel --prod
```

Paste env vars in the dashboard → **Project → Settings → Environment Variables**.

### Stripe webhooks (Vercel)

Serverless routes live in [`api/`](../api/):

| Route | File |
|-------|------|
| `POST /api/stripe-webhook` | `api/stripe-webhook.js` |
| `POST /api/fulfill-session` | `api/fulfill-session.js` |
| `POST /api/redeem-unlock` | `api/redeem-unlock.js` |

In Stripe Dashboard → Webhooks, set endpoint URL to:

`https://YOUR-DOMAIN/api/stripe-webhook`

Payment Link **success URL** (still a static page in `public/`):

`https://YOUR-DOMAIN/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`

Details: [IAP.md](./IAP.md).

[`vercel.json`](../vercel.json) adds security headers and long-cache for `/_next/static/*`.

---

## Deploy — Netlify

### Option A: Git integration (recommended)

1. Connect the repo in [Netlify](https://app.netlify.com).
2. Netlify reads [`netlify.toml`](../netlify.toml):
   - **Build:** `pnpm install && pnpm run build`
   - **Publish directory:** `out`
   - **Node:** 20
3. Add the same env vars as Vercel under **Site configuration → Environment variables**.

### Option B: CLI

```bash
pnpm i -g netlify-cli
pnpm run build
netlify deploy --prod --dir=out
```

### Stripe webhooks (Netlify)

[`netlify.toml`](../netlify.toml) proxies `/api/*` to `netlify/functions/*` (shared crypto helpers in [`server/unlock-crypto.js`](../server/unlock-crypto.js)). Use the same Stripe webhook URL path as on Vercel: `https://YOUR-SITE/api/stripe-webhook`.

### Routing notes

- Do **not** use a catch-all `/* → /index.html` redirect; Next static export ships real HTML per route (`/play/`, `/codex/`, …).
- `trailingSlash: true` — app links use trailing slashes; `netlify.toml` 301s bare paths like `/play` → `/play/`.
- Unknown paths fall through to `404.html` in `out/`.

---

## Routes after deploy

| URL | Purpose |
|-----|---------|
| `/` | Home hub |
| `/play/` | Phaser game |
| `/codex/`, `/shop/`, `/settings/`, `/share/`, `/connect/`, `/install/` | Shell pages |
| `/privacy.html`, `/terms.html` | Legal (Play Store + web) |
| `/checkout-success.html` | Stripe return + fulfill |
| `/app-ads.txt` | AdMob verification |
| `/manifest.json` | PWA manifest |

## PWA / install

- **HTTPS** — provided by Vercel/Netlify.
- **Manifest** — `public/manifest.json` (icons from `pnpm run gen:icons`).
- **Service worker** — not shipped in the Next shell yet; installability may depend on browser heuristics without offline caching.
- Install prompt hook: `beforeinstallprompt` in [`app/layout.tsx`](../app/layout.tsx).

## SEO & link previews

Set `VITE_GAME_URL` at build time so `scripts/gen-icons.mjs` can write `robots.txt` / `sitemap.xml` with the production host. Root metadata lives in [`app/layout.tsx`](../app/layout.tsx). OG image: `/og-image.png` (generated in `public/` during `prebuild`).

After deploy, verify with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and view-source on `/`.

## Post-deploy checklist

- [ ] `https://YOUR-DOMAIN/` and `/play/` load over HTTPS
- [ ] `https://YOUR-DOMAIN/app-ads.txt` returns plain text
- [ ] `/privacy.html` reachable (Play Store privacy URL)
- [ ] Env: `VITE_AD_PROVIDER=google`, `VITE_AD_TEST_MODE=false` (production)
- [ ] Stripe test purchase + webhook (if IAP enabled)
- [ ] Optional: `pnpm run test:smoke` against preview URL

## Related

- [SHIP.md](./SHIP.md) — click-ops checklist
- [IAP.md](./IAP.md) — Stripe + unlock codes
- [RELEASE.md](./RELEASE.md) — Android (shared privacy URL)
- [NATIVE.md](./NATIVE.md) — Capacitor (`webDir: out`)
