# App shell: React (Next.js) vs Phaser

## Principle

| Layer | Technology | Examples |
|-------|------------|----------|
| **Play loop** | Phaser 4 (`src/game/bootstrap.js`) | Game, HUD, Pause, ads overlay, game over |
| **Everything else** | Next.js 15 + TypeScript | Home, Settings, Codex, Shop, Share, Install, Connect, legal |

Phaser is for 60fps gameplay. Lists, scroll, legal text, and forms live in the DOM.

## Routes

| Path | Page |
|------|------|
| `/` | Home |
| `/play/` | Phaser canvas only |
| `/settings/` | Audio, VFX, IAP |
| `/codex/` | Guide, powers, bestiary, journal |
| `/shop/` | Garden cosmetics |
| `/share/` | Share progress card |
| `/install/` | PWA install |
| `/connect/` | LinkedIn |

Shared game logic (`MetaProgress`, `SaveManager`, `Monetization`) lives under `src/` and is imported from React via `@/src/...`.

## TypeScript layout

| Path | Role |
|------|------|
| `app/` | Next.js App Router pages (`.tsx`) |
| `components/` | React UI (`.tsx`) |
| `lib/shell/` | Routes, play intent (canonical TS) |
| `lib/ads/` | Ad placement IDs |
| `types/` | Global window / game types |
| `src/` | Phaser + systems (`.js`, `allowJs`) |

Run `pnpm typecheck` for the React shell; Phaser game code remains JavaScript.

## Ad placements

| ID | Surface |
|----|---------|
| `shell-bottom-banner` | Fixed `#ad-banner` on all shell routes (hidden on `/play/`) |
| `game-interstitial` | Phaser `AdBreakScene` between levels |
| `game-rewarded-continue` | Phaser `GameOverScene` rewarded continue |

See `lib/ads/placements.ts` and `components/ads/AdBanner.tsx`. Shell pages reserve `var(--ad-banner-h)` (50px) bottom padding.

## Build & Capacitor

- **Dev:** `pnpm dev`
- **Production:** `pnpm build` → static export in `out/`
- **Capacitor `webDir`:** `out`

## Legal

Use `openLegalPage('terms.html')` from `@/src/utils/LegalLinks.js` — not `window.open(..., '_blank')`.
