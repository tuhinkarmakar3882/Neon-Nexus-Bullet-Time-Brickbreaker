# Neon Nexus: Bullet-Time Brick Breaker

A visually-stunning, cross-platform **neon brick breaker** with bullet-time slow-mo,
**25+ power-ups** (positive, negative, and elemental balls), Jardinain creatures, tons of
**hybrid procedural levels**, and **save/resume**. Built on **[Phaser 4.1.0](https://phaser.io/v401)** inside a **Next.js 16** app shell (webpack bundler for Phaser `.js`→`.ts` resolution); the original canvas prototype lives in `_archive/legacy/` (reference only).

> Design docs: [`docs/README.md`](docs/README.md) (index) · [`docs/GAME_MECHANICS.md`](docs/GAME_MECHANICS.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Quick start

```bash
pnpm install
pnpm run dev         # next dev --webpack → http://localhost:3000
pnpm run build       # next build --webpack → static export in out/
pnpm run preview     # serve out/ at :4173
pnpm run test:smoke  # headless Chrome — hub, play loop, settings, shop
pnpm run test:migration
pnpm run typecheck   # React shell (app/, components/, lib/)
```

Art and audio are **generated at runtime** (procedural textures + Web Audio synthesis).

---

## Features

- **25+ power-ups** with Lucide icons and positive/negative polarity (Laser, Echo, BlackHole, Joker, Reduce, Flip, etc.)
- **Elemental balls** — Cannon (2× damage), Fire (chain burn), Frost (freeze)
- **Brick types** — normal, silver, gold, explosive, nest, boss, moving, reinforced (segmented HP bars)
- **Jardinains** — creatures that lob pots at your paddle
- **Hybrid level layouts** — stacked pattern zones (wave, emoji, spiral, lattice, …), wall height **65–85%** of arena per level
- **Save / resume** — mid-run snapshot in `localStorage` (7-day TTL); auto-resume on `/play/` unless you start **New Garden**
- **Game over** — **Watch video & continue** or **siege continues** (inventory) keep level, score, and brick layout; Restart / Main menu clears the run
- **UX shell (v3.1.5)** — Home FTUE (3 steps), **ProgressStrip** (Gems / Best / Stars / **Today**), **JourneyPath**, **⌘K command palette**, DOM gameplay HUD on `/play/`, pause → **Settings** only (no in-play coach banners), share preview modal; `/share/` redirects to `/?share=1`
- **Gamification** — Daily best score, return streak, hub reward toasts, level-complete celebration
- **A11y** — Focus traps + Escape on modals/overlays, pinch-zoom (`maximumScale: 5`), `prefers-reduced-motion` → low VFX tier, gameplay HUD live region
- **Share cards** — canvas game-over cards with score-first layout (`ShareProgress.js`)
- **Mobile-ready** — touch input, safe-area insets, rotation relayout, PWA installable
- **Monetization hooks** — rewarded continue, interstitials, IAP adapter (`Monetization.js`)

---

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move paddle | Mouse / `←` `→` | Drag |
| Launch ball | Click / Space | Tap |
| Pause | `P` / pause button | Pause button |
| Settings (in pause) | Settings link in pause overlay | Settings link |
| Menu nav | Home screen buttons | Tap buttons |

---

## Architecture

```
app/                   Next.js App Router (home, play, shop, codex, settings, …)
components/            React HUD overlays, shell UI (DOM pause/game-over/level-clear)
lib/shell/             Routes, play intent, overlay bridges, nav config, hub rewards
src/
  game/bootstrap.js    Phaser boot on /play/ only
  config/              Constants, PowerUps, Themes, ShareConfig, VfxQuality
  objects/             Paddle, Ball, Brick, PowerUp, Jardinain, …
  systems/             LevelGenerator, RunPersistence, FeedbackDirector, …
  scenes/              Game, UI, Pause, GameOver, LevelComplete, …
```

**Split:** React owns menus, settings, and in-run DOM overlays; Phaser owns the 60fps play loop. Coach banners were removed — hints live in the DOM HUD live region and codex. Shared logic (`MetaProgress`, `SaveManager`, `RunPersistence`) lives under `src/` and is imported from both.

See [`docs/SHELL.md`](docs/SHELL.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Save & resume (player)

| Action | Run progress |
|--------|----------------|
| Pause / leave tab / periodic auto-save | Saved (`nn_run_v1`) |
| Home → **Continue Siege** | Resumes saved level |
| Home → **New Garden** | Clears run, level 1 |
| Refresh `/play/` with saved run | Auto-resumes (unless explicit new game) |
| **Watch video & continue** (game over) | Same level & bricks; lives refilled |
| **Restart** / **Main menu** / Esc (game over) | Run cleared |

Meta progress (gems, cosmetics, high score) is separate — see `MetaProgress.js` / `nn_meta_v1`.

---

## Production release

```bash
cp .env.production.example .env.production   # fill keys (gitignored — never commit)
pnpm run check:secrets     # ensure no secrets in git
pnpm run ship:check          # validate env
pnpm run ship:web            # production static site → out/
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
| [**SHELL.md**](docs/SHELL.md) | Next.js vs Phaser, routes, play intent, overlays, hub UX |
| [**QA_CONSTRAINT_CHECKLIST.md**](docs/QA_CONSTRAINT_CHECKLIST.md) | Manual release QA |
| [**QA_WAVE_SIGNOFF.md**](docs/QA_WAVE_SIGNOFF.md) | Wave sign-off matrix |
| [**NATIVE.md**](docs/NATIVE.md) | Capacitor workflow |
| [**ADS.md**](docs/ADS.md) | AdMob / AdSense |

---

## Cross-platform

- **PWA** — `public/manifest.json` + service worker; icons generated via `npm run gen:icons`
- **Capacitor** — `@capacitor/core` wired at boot; run `npm run cap:android` / `cap:ios` after `npx cap add`

---

## License

MIT © Tuhin Karmakar
