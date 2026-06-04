# Neon Nexus — Product Plan (Twilight Garden)

Living design + roadmap for the Jardinains × Arkanoid fusion.  
Technical detail: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · Mechanics: [`GAME_MECHANICS.md`](./GAME_MECHANICS.md)

---

## v3.1.0 — UX product sprint

Shipped June 2026. Full checklist: [**UX_IMPLEMENTATION_STATUS.md**](./UX_IMPLEMENTATION_STATUS.md). Highlights: pause Garden meta, home FTUE + power coach, game-over UX, design-system merge, analytics, share preview, boot error recovery.

---

## Current state (implemented)

| Area | Status |
|------|--------|
| **Core loop** | Break bricks, clear level, lives/continues, procedural layouts, fortress every 5 |
| **Shell UX (3.1)** | FTUE, Garden pause nav, DOM game-over, hub share preview, `from=play` resume |
| **Jardinains** | Dynamic pop-up spawner, pot throws, dislodge/juggle/knockout → power drops |
| **Powers** | 44 keys in catalog (paddle cannons, ball mods, env, wild + negatives + tier II) |
| **Visual baseline** | High-contrast ball (dark rim + identity tints); plain wood paddle when unpowered; powers tint/glow on apply |
| **Difficulty** | Level bands, mutators via `ChallengeSystem`, progressive brick/gnome pressure |
| **FX / audio** | Synthesized SFX + music; micro-animations; Nexus overlay; category stingers — see [ARCHITECTURE §18](./ARCHITECTURE.md#18-audio-vfx--animation) |
| **Mobile** | Safe-area insets, portrait paddle boost, rotation relayout, PWA/Capacitor |
| **Meta** | Treasury, stars, journal, contracts, codex |
| **Monetization** | Demo ad provider + Shop + banner + interstitial overlay + rewarded hooks |
| **HUD** | Top stat bar + **left/right vertical meters** (gnome streak / Nexus) |

---

## Viewport & fullscreen

### Fixed (P0 / P1 / P2)

| Priority | Change | Status |
|----------|--------|--------|
| **P0** | Portrait: `W = round(H × aspect)` without 720px clamp | ✅ |
| **P0** | Page + canvas background `#08050c` | ✅ |
| **P1** | Portrait `WALL_TOP` 11% (was 14%) | ✅ |
| **P1** | `Scale.ENVELOP` or dynamic H | Optional — not implemented |
| **P2** | Immersive HUD setting (tap top to peek) | ✅ |

Letterboxing on desktop wide aspect ratios may still occur under `Scale.FIT`; portrait phones match device aspect.

### HUD layout (current)

```
┌─────────────────────────────────────┐
│  [ Top bar: score · level · lives ] │
│  [ Goal / mutator line              ]│
│GNOME│                     │ NEXUS  │
│  ▮  │      PLAYFIELD        │   ▮   │
│  ▮  │                       │   ▮   │
│ CASH│                       │ 🌿    │
└─────────────────────────────────────┘
```

Left meter = gnome streak. Right meter = Nexus / bullet-time. See `HUDScene.js`.

---

## Monetization

Infrastructure is **game-side complete**; production builds set `provider: 'google'` in [`AdsConfig.js`](../src/config/AdsConfig.js) or `VITE_AD_PROVIDER=google`. See [**ADS.md**](./ADS.md) for the full setup checklist. **Demo provider** simulates ads for web/dev.

### Adapter

| File | Role |
|------|------|
| [`Monetization.js`](../src/systems/Monetization.js) | Service: register, rewarded, interstitial, purchase, frequency cap |
| [`DemoAdProvider.js`](../src/systems/DemoAdProvider.js) | Simulated ads + banner DOM |
| [`main.js`](../src/main.js) | Boot: `createDemoAdProvider()` |
| [`AdBreakScene.js`](../src/scenes/AdBreakScene.js) | Interstitial overlay UI |
| [`ShopScene.js`](../src/scenes/ShopScene.js) | Cosmetics + IAP buttons |

**SKUs:** `remove_ads` ($2.99), `coins_small` ($0.99 → +500 treasury), `premium` ($4.99)

### Touchpoints

| Moment | File |
|--------|------|
| Rewarded continue | `GameOverScene.js` |
| Revive + 2 powers | `GameOverScene.js` |
| 2× clear bonus | `LevelCompleteScene.js` |
| Interstitial (every 2 levels, 90s cap) | `GameScene.completeLevel()` → `AdBreakScene` |
| Banner | `index.html` `#ad-banner`, shown on Menu |
| Remove ads | Settings + `SaveManager` |
| Shop / cosmetics | Menu or Settings → `ShopScene.js` |

### Production swap

Replace `createDemoAdProvider()` in `main.js` with AdMob (native) or AdSense / GameDistribution (web).

---

## Differentiation roadmap — complete

Pitch: *Arkanoid where bricks host garden gnomes, loot comes from juggling them, and bullet-time is earned by playing dangerously.*

### Phase 1 — Feel & clarity ✅

- Fullscreen P0 portrait aspect fix
- Gnome streak meter → 3-choice power draft
- Level mutator intro card (1–2 twists)
- Brick drops from silver / explosive / reinforced

### Phase 2 — Skill expression ✅

- Nexus meter (player-triggered slow-mo + burst)
- Combo bank / gambit (CASH button)
- 3-star levels
- Combo bank / gambit (CASH button)

### Phase 3 — Depth & retention ✅

- Power fusion (tier II)
- Cursed / blessed / mystery capsules
- Biome shifts every 10 levels
- Gnome bestiary + journal in Codex
- Level goals, tactical bricks, gnome contracts, 13 mutators

### Phase 4 — Monetization ✅

- Demo ad SDK (swap for production)
- Remove Ads IAP, Shop, cosmetics
- Rewarded continue / revive / double bonus
- Interstitial + frequency cap

### Phase 5 — Wow polish ✅

- Gnome knockout slow-mo + camera nudge + confetti/shards
- Fortress arena shatter (wall shards, `fortressShatter()` SFX, arena fade)
- Near-miss clutch (ripple, sparks, `clutch()` SFX, Nexus pip)
- Category SFX stingers (`audio.powerCategory()`)
- Escalating juggle tones (`audio.juggle(n)`)
- Gnome pop-up audio (`audio.gnomePop()`)

See [`ARCHITECTURE.md` §18](./ARCHITECTURE.md#18-audio-vfx--animation) for the full VFX/SFX map.

---

## Visual direction

- **Twilight Garden** — warm dusk, moss/terracotta (`Palette.js`)
- Default white comet ball + wood paddle; cosmetic hulls/trails in Shop
- Seed-capsule power-ups with category stripe + polarity styling
- Bloom ~0.65–0.72, restrained glow

---

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm run test:smoke` | Desktop + mobile flow (powers, pause, level clear, blessings) |
| `pnpm run build` | Production bundle |
| `node scripts/diag.mjs` | Power state mutations |
| `node scripts/visualcheck.mjs` | Render sanity snapshot |

---

## Document history

- **2025-05** — Viewport analysis, monetization map, phased roadmap.
- **2025-05-30** — Phases 1–5 complete; vertical HUD meters; meta/monetization docs sync; `GAME_MECHANICS.md` rewritten for v2.
- **2025-05-30** — VFX/SFX/animation catalog ([ARCHITECTURE §18](./ARCHITECTURE.md#18-audio-vfx--animation)); docs index ([README.md](./README.md)).

## Optional / future

| Item | Notes |
|------|-------|
| P1 ENVELOP | True edge-to-edge portrait without letterboxing on all devices |
| Production ads | Set `VITE_AD_PROVIDER=google` + unit IDs — see [ADS.md](./ADS.md) |
| Online leaderboard | Not implemented (local high score only) |
| README sync | Root `README.md` still lists legacy power count — use `POWER_KEYS.length` |
