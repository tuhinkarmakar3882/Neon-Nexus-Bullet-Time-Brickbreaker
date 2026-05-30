# Neon Nexus — Documentation

Canonical docs for the **Twilight Garden** Phaser build (`src/`). When docs disagree with code, trust `src/config/` and `GameScene.js`.

| Document | Audience | Contents |
|----------|----------|----------|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | Engineers | Repo layout, scenes, systems, physics, persistence, HUD bus, VFX/SFX catalog, file index |
| [**GAME_MECHANICS.md**](./GAME_MECHANICS.md) | Designers & players | Loop, controls, gnomes, powers, goals, meta, HUD, monetization touchpoints |
| [**REDESIGN.md**](./REDESIGN.md) | Product | Implemented roadmap (Phases 1–5), viewport/HUD notes, monetization map, verification |
| [**ADS.md**](./ADS.md) | Release | Google AdMob / AdSense setup — config-only provider swap |

## Quick facts (v2.0.0)

- **Engine:** Phaser 3.90 · **Bundler:** Vite 7 · **Scenes:** 13
- **Powers:** 44 keys in `PowerUps.js` (includes tier-II fusion entries)
- **Mutators:** 13 in `Mutators.js` + seasonal rotation every 7 levels
- **Persistence:** `nn_run_v1` (7-day run save) · `nn_meta_v1` (treasury, stars, journal)
- **Verify:** `pnpm run build` · `pnpm run test:smoke`

## Related (outside `docs/`)

- [`README.md`](../README.md) — install & quick start (may lag feature count)
- [`src/config/HowToPlay.js`](../src/config/HowToPlay.js) — in-game Codex copy
- [`legacy/`](../legacy/) — original canvas prototype (not built by Vite)
