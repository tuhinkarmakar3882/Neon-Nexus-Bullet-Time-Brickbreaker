# App shell: React (Next.js) vs Phaser

## Principle

| Layer | Technology | Examples |
|-------|------------|----------|
| **Play loop** | Phaser 4 (`src/game/bootstrap.js`) | Game, HUD, Pause, game over, level complete |
| **Everything else** | Next.js 15 + TypeScript | Home, Settings, Codex, Shop, Share, Install, Connect, legal |

Phaser is for 60fps gameplay. Lists, scroll, legal text, and forms live in the DOM.

On `/play/`, React mounts **GameplayHud**, **PauseOverlay**, and **GameOverOverlay** bridges; Phaser draws the canvas in `#game-root`.

## Routes

| Path | Page |
|------|------|
| `/` | Home — Play / Continue / New Garden, share, install |
| `/play/` | Phaser canvas + React HUD overlays |
| `/settings/` | Audio, VFX quality tier, IAP |
| `/codex/` | Guide, powers, bestiary, journal |
| `/shop/` | Garden cosmetics (gems) |
| `/share/` | Share progress card |
| `/install/` | PWA install |
| `/connect/` | LinkedIn |

Shared game logic (`MetaProgress`, `SaveManager`, `RunPersistence`, `Monetization`) lives under `src/` and is imported from React via `@/src/...`.

## Play intent & resume

Starting a run uses **sessionStorage** (`lib/shell/playIntent.ts`):

| Home action | Intent | Result on `/play/` |
|-------------|--------|---------------------|
| **Continue Siege** | `mode: 'resume'` | Load `nn_run_v1` snapshot |
| **New Garden** | `mode: 'new'`, `forceNew: true` | Clear run, level 1 |
| First **Play** (no save) | `mode: 'new'`, `forceNew: true` | New run |

`PreloadScene.js` also **auto-resumes** when a valid snapshot exists and the player did not explicitly force a new game (e.g. refresh on `/play/`).

See `RunPersistence.js` for snapshot fields and TTL.

## Game over overlay

When `GAME.USE_DOM_HUD` is true (`.play-stage--hud` on `/play/`):

1. `GameOverScene` pauses the game and dispatches `neon:game-over-open`.
2. `GameOverOverlayBridge` renders `GameOverOverlay.tsx`.

| Button | Behavior |
|--------|----------|
| **Watch video & continue** | Rewarded ad (or bypass in demo) → `doVideoContinue()` — **same level, score, bricks**; lives refilled; run saved |
| **Restart** | Clears run → new game level 1 |
| **Main menu** / Esc | Clears run → home |
| **Share** | Canvas share card via `ShareProgress.js` (does not clear run) |

While the overlay is open, the run snapshot is stored with `pendingGameOver: true`. Abandoning without continuing (e.g. reload) drops that snapshot on next load.

## Share

| Surface | Implementation |
|---------|----------------|
| Home **Share** | `lib/shell/triggerShare.ts` → progress card |
| Game over **Challenge friends** | `GameOverScene.shareProgress()` → `buildGameOverSharePayload()` |
| `/share/` page | Static shell route for share landing |

Game-over cards: hero score, inline PB / level / gems stats, gap-to-best messaging, CTA hierarchy (`ShareProgress.js`, `ShareConfig.js`).

## TypeScript layout

| Path | Role |
|------|------|
| `app/` | Next.js App Router pages (`.tsx`) |
| `components/` | React UI (`.tsx`) |
| `lib/shell/` | Routes, play intent, overlay actions (canonical TS) |
| `lib/ads/` | Ad placement IDs |
| `types/` | Global window / game types |
| `src/` | Phaser + systems (`.js`, `allowJs`) |

Run `pnpm typecheck` for the React shell; Phaser game code remains JavaScript.

## Ad placements

| ID | Surface |
|----|---------|
| `shell-bottom-banner` | Fixed `#ad-banner` on shell routes (hidden on `/play/`) |
| `game-interstitial` | Phaser `AdBreakScene` between levels |
| `game-rewarded-continue` | Game over — watch video & continue |
| `game-over-menu-banner` | Inline slot in React game-over card |

See `lib/ads/placements.ts` and `components/ads/AdBanner.tsx`.

## Build & Capacitor

- **Dev:** `pnpm dev`
- **Production:** `pnpm build` → static export in `out/`
- **Capacitor `webDir`:** `out`

## Legal

Use `openLegalPage('terms.html')` from `@/src/utils/LegalLinks.js` — not `window.open(..., '_blank')`.
