# Neon Nexus — Documentation

Canonical docs for the **Twilight Garden** Phaser build (`src/`). When docs disagree with code, trust `src/config/` and `GameScene.js`.

| Document | Audience | Contents |
|----------|----------|----------|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | Engineers | Repo layout, scenes, systems, physics, persistence, HUD bus, VFX/SFX catalog, file index |
| [**GAME_MECHANICS.md**](./GAME_MECHANICS.md) | Designers & players | Loop, controls, gnomes, powers, goals, meta, HUD, monetization touchpoints |
| [**REDESIGN.md**](./REDESIGN.md) | Product | Implemented roadmap (Phases 1–5), viewport/HUD notes, monetization map, verification |
| [**ADS.md**](./ADS.md) | Release | Google AdMob / AdSense setup — config-only provider swap |
| [**PRODUCTION_PLAN.md**](./PRODUCTION_PLAN.md) | Release | Master checklist — Phases 0–6, status, architecture, execution order |
| [**RELEASE.md**](./RELEASE.md) | Release | Capacitor Android, signing, Play Store listing |
| [**PWA.md**](./PWA.md) | Release | Vercel & Netlify deploy, PWA, SEO, install prompt |
| [**IAP.md**](./IAP.md) | Release | RevenueCat (native) + Stripe (web), product IDs, freemium gating |
| [**MUSIC.md**](./MUSIC.md) | Audio | Pixabay ambient loops per level |

## Quick facts (v2.0.0)

- **Engine:** [Phaser 4.1.0](https://phaser.io/v401) · **Bundler:** Vite 8 · **Scenes:** 14
- **Powers:** 44 keys in `PowerUps.js` (includes tier-II fusion entries)
- **Mutators:** 13 in `Mutators.js` + seasonal rotation every 7 levels
- **Persistence:** `nn_run_v1` (7-day run save) · `nn_meta_v1` (treasury, stars, journal)
- **Verify:** `pnpm run build` · `pnpm run test:smoke`

## Production release

Start with [**PRODUCTION_PLAN.md**](./docs/PRODUCTION_PLAN.md) for the full ship checklist. Copy [`.env.production.example`](./.env.production.example) for production builds.

| Doc | Topic |
|-----|-------|
| [RELEASE.md](./docs/RELEASE.md) | Android / Play Store |
| [PWA.md](./docs/PWA.md) | Vercel & Netlify |
| [IAP.md](./docs/IAP.md) | RevenueCat + Stripe |
| [MUSIC.md](./docs/MUSIC.md) | Pixabay hybrid music |
| [ADS.md](./docs/ADS.md) | Freemium ads |

## Related (outside `docs/`)

- [`README.md`](../README.md) — install & quick start (may lag feature count)
- [`src/config/HowToPlay.js`](../src/config/HowToPlay.js) — in-game Codex copy
- [`_archive/legacy/`](../_archive/legacy/) — original canvas prototype (archived; not built)
