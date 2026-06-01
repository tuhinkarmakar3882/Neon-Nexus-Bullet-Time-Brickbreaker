# Neon Nexus — Documentation

Canonical docs for the **Twilight Garden** build. When docs disagree with code, trust `src/config/` and `GameScene.js`.

| Document | Audience | Contents |
|----------|----------|----------|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | Engineers | Repo layout, scenes, systems, physics, persistence, HUD bus, VFX/SFX catalog |
| [**SHELL.md**](./SHELL.md) | Engineers | Next.js shell vs Phaser play loop, routes, play intent, DOM overlays |
| [**GAME_MECHANICS.md**](./GAME_MECHANICS.md) | Designers & players | Loop, controls, gnomes, powers, goals, save/resume, monetization |
| [**REDESIGN.md**](./REDESIGN.md) | Product | Implemented roadmap, viewport/HUD notes, monetization map |
| [**ADS.md**](./ADS.md) | Release | Google AdMob / AdSense — config-only provider swap |
| [**PRODUCTION_PLAN.md**](./PRODUCTION_PLAN.md) | Release | Master checklist — Phases 0–6, status, execution order |
| [**RELEASE.md**](./RELEASE.md) | Release | Capacitor Android, signing, Play Store listing |
| [**PWA.md**](./PWA.md) | Release | Vercel & Netlify deploy, PWA, SEO, install prompt |
| [**IAP.md**](./IAP.md) | Release | RevenueCat (native) + Stripe (web), product IDs |
| [**NATIVE.md**](./NATIVE.md) | Release | Capacitor workflow, save migrations across app updates |
| [**MUSIC.md**](./MUSIC.md) | Audio | Pixabay ambient loops per level |

## Quick facts (v3.0.x)

- **Shell:** Next.js 15 (`app/`, `components/`) + Phaser 4.1 on `/play/` only
- **Engine:** [Phaser 4.1.0](https://phaser.io/v401) · **Bundler:** Next + Vite (game chunks)
- **Powers:** 44 keys in `PowerUps.js` (includes tier-II fusion entries)
- **Mutators:** 13 in `LevelGenerator.js` + seasonal rotation every 7 levels
- **Levels:** Hybrid multi-zone layouts (`LevelGenerator.js`); vertical wall reach **65–85%** per level
- **Persistence:** `nn_run_v1` (run snapshot, format v2, 7-day TTL) · `nn_meta_v1` (gems, stars, cosmetics)
- **Verify:** `pnpm run build` · `pnpm run test:smoke` · `pnpm run typecheck`

## Save / resume (summary)

| Storage key | What | When cleared |
|-------------|------|--------------|
| `nn_run_v1` | Level, score, lives, brick HP, powers in flight | Game over → Restart/Main menu; **New Garden** on home; 7-day expiry |
| `nn_run_v1` + `pendingGameOver` | Same, while game-over overlay is open | Cleared on load if abandoned; cleared on Restart/Main menu |
| `nn_meta_v1` | Gems, shop, codex, stats | Never on game over (only explicit resets / uninstall) |

**Watch video & continue** revives the **same level and brick layout** (lives refilled). Does not wipe the run.

Implementation: `RunPersistence.js`, `lib/shell/playIntent.ts`, `PreloadScene.js`.

## Share cards

Game-over and progress screenshots: `ShareProgress.js` + `ShareConfig.js`. React game-over UI: `components/play/GameOverOverlay.tsx` (bridged from `GameOverScene.js` when `GAME.USE_DOM_HUD`).

## Production release

Start with [**PRODUCTION_PLAN.md**](./PRODUCTION_PLAN.md). Copy [`.env.production.example`](../.env.production.example) for production builds.

| Doc | Topic |
|-----|-------|
| [SHIP.md](./SHIP.md) | What you do vs what scripts do |
| [RELEASE.md](./RELEASE.md) | Android / Play Store |
| [PWA.md](./PWA.md) | Vercel & Netlify |
| [IAP.md](./IAP.md) | RevenueCat + Stripe |
| [ADS.md](./ADS.md) | Freemium ads |

## Related (outside `docs/`)

- [`README.md`](../README.md) — install & quick start
- [`src/config/HowToPlay.js`](../src/config/HowToPlay.js) — in-game Codex copy
- [`_archive/legacy/`](../_archive/legacy/) — original canvas prototype (not built)
