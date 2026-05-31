# Production Release Plan

Master checklist for shipping **Neon Nexus: Bullet-Time Brick Breaker** on **PWA (Vercel / Netlify)**, **Google Play (Capacitor Android)**, with **freemium ads**, **full IAP at launch**, and **Pixabay ambient music**.

When docs disagree with code, trust `src/` and update these plans after implementation.

## Scope (confirmed)

| Decision | Choice |
|----------|--------|
| IAP at launch | Full — Remove Ads, Gem Pack (+50), Premium Pass |
| Monetization model | Freemium — ads unless Remove Ads purchased |
| PWA hosts | Vercel **and** Netlify (document both; default examples → Vercel) |
| Music | Pixabay ambient/chill loops only — rotates per level |
| Native billing | RevenueCat → Google Play Billing (Android) |
| Web billing | Stripe Checkout + webhook + unlock codes |

## Current status

| Area | Status |
|------|--------|
| Nexus slow-mo boost | Done |
| Tier II fusion routing | Done — resume path, LaserII width, ShieldII hits |
| Dependencies (pnpm) | Done |
| PlayBilling + Monetization | Done |
| NativeBridge | Done |
| PWA plugin + deploy configs | Done |
| Pixabay music (level rotation) | Done |
| Privacy / terms pages | Done |
| Stripe webhook + fulfill + redeem APIs | Done |
| Web unlock (Settings + checkout-success) | Done |
| Install prompt (MenuScene) | Done |
| Prod boot guards | Done |
| Smoke tests expanded | Done |
| Codex / Shop scroll direction | Done |
| Capacitor `android/` folder | Run locally: `pnpm run cap:add:android` (gitignored) |
| Store keys / live deploy | Configure env + Play Console / Vercel dashboard |

## Verify commands

```bash
pnpm install
pnpm run build
pnpm run test:smoke
pnpm run cap:add:android   # first-time Android scaffold
```

## Related docs

- [RELEASE.md](./RELEASE.md) — Android signing & Play Store
- [PWA.md](./PWA.md) — Vercel / Netlify deployment
- [IAP.md](./IAP.md) — RevenueCat + Stripe
- [MUSIC.md](./MUSIC.md) — Pixabay ambient music
- [ADS.md](./ADS.md) — Freemium ad setup
