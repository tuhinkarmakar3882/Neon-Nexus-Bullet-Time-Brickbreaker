# App shell: React (Next.js) vs Phaser

## Principle

| Layer | Technology | Examples |
|-------|------------|----------|
| **Play loop** | Phaser 4 (`src/game/bootstrap.js`) | Game, HUD, Pause, game over, level complete |
| **Everything else** | Next.js 16 + TypeScript | Home, Settings, Codex, Shop, Share, Install, Connect, legal |

Phaser is for 60fps gameplay. Lists, scroll, legal text, and forms live in the DOM.

On `/play/`, React mounts **GameplayHud**, **PauseOverlay**, **GameOverOverlay**, and **LevelCompleteOverlay** bridges; Phaser draws the canvas in `#game-root`.

> **Bundler:** Next.js 16 defaults to Turbopack; this project uses **`next dev --webpack`** and **`next build --webpack`** so Phaser modules resolve via the webpack `extensionAlias` (`.js` → `.ts`).

## Routes

| Path | Page |
|------|------|
| `/` | Home — Play / Continue / New Garden, ProgressStrip, JourneyPath, ⌘K palette |
| `/play/` | Phaser canvas + React HUD overlays |
| `/settings/` | Audio, ambience, VFX quality tier, haptics, IAP |
| `/codex/` | Guide, powers (gated), bestiary, journal — URL `?tab=` |
| `/shop/` | Garden cosmetics (Hull / Trail / Theme tabs) |
| `/share/` | Redirects to `/?share=1` (share preview modal on home) |
| `/install/` | PWA install |
| `/connect/` | LinkedIn |

Shared game logic (`MetaProgress`, `SaveManager`, `RunPersistence`, `Monetization`) lives under `src/` and is imported from React via `@/src/...`.

Canonical route helpers: `lib/shell/routes.ts` (re-exported from `src/shell/routes.js` for Phaser).

## Hub UX (v3.1.5)

| Component | Role |
|-----------|------|
| `ProgressStrip` | Gems, Best, Stars, **Today** (daily best), optional streak chip |
| `JourneyPath` | Milestone track toward first clear / stars / gems / cosmetic |
| `HubCommandPalette` | ⌘/Ctrl+K quick nav (play, settings, codex, shop, share, tutorial) |
| `HubRewardToasts` | Post-run codex unlocks, achievements, summary toasts |
| `TutorialOverlay` | First-run home FTUE (3 steps) — hub only, not during play |

Navigation labels and featured entries: `lib/shell/navConfig.ts`.

## Play intent & resume

Starting a run uses **sessionStorage** (`lib/shell/playIntent.ts`):

| Home action | Intent | Result on `/play/` |
|-------------|--------|---------------------|
| **Continue Siege** | `mode: 'resume'` | Load `nn_run_v1` snapshot |
| **New Garden** | `mode: 'new'`, `forceNew: true` | Clear run, level 1 |
| First **Play** (no save) | `mode: 'new'`, `forceNew: true` | New run |

Warm hub session flags skip redundant music  when returning to `/play/`.

`PreloadScene.js` also **auto-resumes** when a valid snapshot exists and the player did not explicitly force a new game (e.g. refresh on `/play/`).

See `RunPersistence.js` for snapshot fields and TTL.

## Pause overlay

| Button | Behavior |
|--------|----------|
| **Resume** | Close pause, continue run |
| **Settings** | `saveRunAndLeavePlay(ROUTES.settings)` — run saved, `?from=play` for back-resume |
| **Quit** | Save run and return to hub |

Codex and Shop are reached from the **hub** or in-run gem tap (HUD → shop), **not** from the pause overlay.

## Game over overlay

When `GAME.USE_DOM_HUD` is true (`.play-stage--hud` on `/play/`):

1. `GameOverScene` pauses the game and dispatches `neon:game-over-open`.
2. `GameOverOverlayBridge` renders `GameOverOverlay.tsx`.

| Button | Behavior |
|--------|----------|
| **Watch video & continue** | Rewarded ad → same level, score, bricks; lives refilled |
| **Restart** | Clears run → new game level 1 |
| **Main menu** / Esc | Clears run → home (confirm when score > 0) |
| **Share** | Canvas share card via `ShareProgress.js` |

## Level complete overlay

React `LevelCompleteOverlay.tsx` — star/gem count-up, haptics, tap/Space/Esc to advance. Optional double-bonus ad when enabled.

## Share

| Surface | Implementation |
|---------|----------------|
| Home **Share** / `/share/` | `SharePreviewModal` on `/?share=1`; `lib/shell/triggerShare.ts` |
| Game over **Challenge friends** | `GameOverScene.shareProgress()` |
| Level complete **Share** | `levelCompleteOverlayShare()` |

Game-over cards: hero score, inline PB / level / gems stats (`ShareProgress.js`, `ShareConfig.js`).

## DOM gameplay HUD

| Feature | Location |
|---------|----------|
| Score, lives, combo, gems (→ shop) | `components/play/GameplayHud.tsx` |
| Goal / mutator chips (immersive) | `.play-hud-chips` row |
| Active power pills | Below HUD bar |
| Screen-reader flashes | `GameplayHudLiveRegion.tsx` |

**No in-play coach banners** — removed per UX audit; use codex and hub FTUE instead.

## TypeScript layout

| Path | Role |
|------|------|
| `app/` | Next.js App Router pages (`.tsx`) |
| `components/` | React UI (`.tsx`) |
| `lib/shell/` | Routes, play intent, overlay actions, nav config, hub rewards |
| `lib/hooks/` | `useFocusTrap` for modal a11y |
| `lib/analytics/` | `shellAnalytics.ts`, `productionSink.ts` |
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

- **Dev:** `pnpm dev` → `next dev --webpack`
- **Production:** `pnpm build` → `next build --webpack` → static export in `out/`
- **Capacitor `webDir`:** `out`
- **OG URLs:** set `VITE_GAME_URL` in env — used for `metadataBase` in `app/layout.tsx`

## Legal

Use `openLegalPage('terms.html')` from `@/src/utils/LegalLinks.js` — not `window.open(..., '_blank')`.
