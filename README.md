# Neon Nexus: Bullet-Time Brick Breaker

A visually-stunning, cross-platform **neon brick breaker** with bullet-time slow-mo and
**23 power-ups**. Originally a hand-rolled `<canvas>` + Web Worker prototype, now rebuilt
on the **Phaser 3** WebGL engine with a clean architecture, fixed gameplay bugs, a synth
audio engine, WebGL bloom, and ready-to-ship cross-platform + monetization scaffolding.

> The complete reverse-engineered design spec of the original lives in
> [`docs/GAME_MECHANICS.md`](docs/GAME_MECHANICS.md), including the full power-up catalogue
> and the list of legacy bugs that were fixed.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle -> dist/
npm run preview  # serve the production build
```

No binary art or audio assets are required — **all visuals and sound are generated at
runtime** (procedural textures + Web Audio synthesis), so the build is tiny and works fully
offline.

---

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move paddle | Mouse move / `←` `→` | Drag anywhere |
| Launch / re-launch ball | Click / `Space` / `Enter` | Tap |
| Pause | `P` / pause button | Pause button |

---

## Architecture

```
src/
  main.js                 Phaser game config + scene registration + PWA SW
  config/                 Constants, power-up catalogue, flavour text
  objects/                Paddle, Ball, Brick, Bullet, PowerUp, Background
  systems/                PowerUpSystem, LevelGenerator, AudioManager,
                          SaveManager, Monetization
  scenes/                 Boot, Preload, Menu, Game, HUD, Pause, Settings,
                          GameOver, LevelComplete
  utils/                  Helpers, Textures (procedural art), UI widgets
legacy/                   The original canvas/worker prototype (kept for reference)
docs/GAME_MECHANICS.md    Full mechanics + power-up + bug documentation
```

The core loop is a **single fixed-cap update step** scaled by a global `timeScale`
(bullet-time), with manual circle-vs-AABB ball physics for precise, predictable bounces.

---

## Cross-platform packaging

The build (`dist/`) is a self-contained static app, so it ships everywhere:

- **Web / PWA** — installable & offline-capable via `public/manifest.json` + `public/sw.js`.
- **Android / iOS** — wrap with [Capacitor](https://capacitorjs.com) (`capacitor.config.json`
  is included):
  ```bash
  npm i -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
  npx cap add android && npm run cap:android
  npx cap add ios && npm run cap:ios
  ```
- **Desktop (Steam/itch)** — wrap `dist/` with Electron or Tauri.

---

## Monetization

`src/systems/Monetization.js` is a platform-agnostic adapter wired into the game flow:

- **Interstitials** between levels (`maybeShowLevelInterstitial`, every N levels).
- **Rewarded ads** for an extra continue when free continues run out
  (`offerRewardedContinue`).
- **IAP catalogue** (`remove_ads`, premium, coins) with a `purchase()` entry point.

Until a provider is registered it is a safe no-op, so the game is fully playable. Register a
real provider per platform at boot:

```js
import { Monetization } from './systems/Monetization.js';
// Web (e.g. GameDistribution / AdSense H5) or Capacitor AdMob, etc.
Monetization.register({
  init: async () => {/* sdk init */},
  showInterstitial: async () => ({ shown: true }),
  showRewarded: async () => ({ rewarded: true }),
  purchase: async (id) => ({ success: true }),
});
```

---

## License

MIT © Tuhin Karmakar
