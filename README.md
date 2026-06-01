# Neon Nexus: Bullet-Time Brick Breaker

A visually-stunning, cross-platform **neon brick breaker** with bullet-time slow-mo,
**27 power-ups** (positive, negative, and elemental balls), Jardinain creatures, infinite
procedural levels, and save/resume. Built on **[Phaser 4.1.0](https://phaser.io/v401)** (WebGL | Web Audio) from the original canvas prototype
in `legacy/`.

> Design docs: [`docs/GAME_MECHANICS.md`](docs/GAME_MECHANICS.md) (original spec),
> [`docs/REDESIGN.md`](docs/REDESIGN.md) (v2 direction).

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production bundle -> dist/
npm run preview      # serve the production build
npm run test:smoke   # headless Chrome flow test
```

Art and audio are **generated at runtime** (procedural textures + Web Audio synthesis).

---

## Features

- **27 power-ups** with Lucide icons and positive/negative polarity (Laser, Echo, BlackHole, Joker, Reduce, Flip, etc.)
- **Elemental balls** — Cannon (2× damage), Fire (chain burn), Frost (freeze)
- **Brick types** — normal, silver, gold, explosive, nest, boss, moving, reinforced (with crack overlays)
- **Jardinains** — creatures that lob pots at your paddle
- **Infinite procedural levels** — seeded layouts, biomes, boss fortresses every 5 levels, level mutators
- **Save / resume** — mid-run progress persisted to localStorage
- **Mobile-ready** — touch input, safe-area insets, rotation relayout, PWA installable
- **Monetization hooks** — rewarded continue, interstitials, IAP adapter (`Monetization.js`)

---

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move paddle | Mouse / `←` `→` | Drag |
| Launch ball | Click / Space | Tap |
| Pause | `P` / pause button | Pause button |
| Menu nav | `↑` `↓` + Enter | Tap buttons |

---

## Architecture

```
src/
  main.js              Phaser bootstrap, InputRouter, RunPersistence, Monetization
  config/              Constants, PowerUps, DropTables, Themes, Messages
  objects/             Paddle, Ball, Brick, PowerUp, Jardinain, Enemy, Background
  systems/             PowerUpSystem, LevelGenerator, ChallengeSystem, StatusSystem,
                       AudioManager, SaveManager, RunPersistence, InputRouter, Haptics
  scenes/              Boot … LevelComplete, Codex
  utils/               Textures, IconTextures, UI widgets
```

---

## Production release

```bash
cp .env.production.example .env.production   # fill keys (gitignored — never commit)
pnpm run check:secrets     # ensure no secrets in git
pnpm run ship:check          # validate env
pnpm run ship:web            # production PWA → dist/
pnpm run ship:android        # validate + build + native sync
pnpm run ship:android:bundle # signed AAB (after keystore setup)
```

**Click-ops checklist (dashboards only):** [`docs/SHIP.md`](docs/SHIP.md)

| Doc | Topic |
|-----|-------|
| [**SHIP.md**](docs/SHIP.md) | What you do vs what scripts do |
| [**PRODUCTION_PLAN.md**](docs/PRODUCTION_PLAN.md) | Master roadmap |
| [**RELEASE.md**](docs/RELEASE.md) | Android signing & Play |
| [**PWA.md**](docs/PWA.md) | Vercel & Netlify |
| [**IAP.md**](docs/IAP.md) | RevenueCat + Stripe |
| [**NATIVE.md**](docs/NATIVE.md) | Capacitor workflow |
| [**ADS.md**](docs/ADS.md) | AdMob / AdSense |

---

## Cross-platform

- **PWA** — `public/manifest.json` + service worker; icons generated via `npm run gen:icons`
- **Capacitor** — `@capacitor/core` wired at boot; run `npm run cap:android` / `cap:ios` after `npx cap add`

---

## License

MIT © Tuhin Karmakar
