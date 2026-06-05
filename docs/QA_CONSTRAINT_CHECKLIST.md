# QA constraint checklist (manual)

Use before each release candidate. Pair with `pnpm run test:smoke` and `pnpm run test:migration`.

## Boot & routing

- [ ] Cold load `/` — home FTUE or menu renders; no console errors
- [ ] `/play/` direct bookmark resumes saved run unless **New game** set `forceNew`
- [ ] Hub → play → hub returns without losing meta; resume CTA shows when run exists
- [ ] Play boot error panel: retry and **Back to hub** work

## Accessibility

- [ ] Pinch-zoom to 200%+ works (viewport `maximumScale: 5`)
- [ ] Keyboard: Tab reaches hub menu, settings switches, codex tabs; Escape dismisses modals
- [ ] Play overlays: pause / game over / level complete trap focus; Escape on pause resumes or dismisses
- [ ] `prefers-reduced-motion`: VFX tier respects setting in play
- [ ] Screen reader: codex `tablist` / `tabpanel` names; settings `controlId` on switches

## Settings & persistence

- [ ] Sound, music, SFX/music volume sliders persist after reload
- [ ] Ambience toggle writes `nn_ambience` and affects in-game ambience layer
- [ ] Haptics toggle writes `nn_haptics` and affects play feedback (independent of VFX tier)
- [ ] Graphics quality tier persists (`nn_vfxQuality`)
- [ ] `pnpm run test:migration` passes (schema v2, `nn_haptics`, `nn_return_streak`)

## Gamification (hub)

- [ ] Progress strip shows Gems, Best, Stars, **Today** on home
- [ ] Return streak chip when streak > 1; `nn_return_streak` increments on consecutive calendar-day hub visits
- [ ] Today best updates after a scored run (`MetaProgress.recordDailyScore`)

## Shop & codex

- [ ] Shop category tabs: Hull / Trail / Theme filter list
- [ ] Gem spend confirm for paid cosmetics
- [ ] Cross-links: settings ↔ shop ↔ codex; `from=play` returns to run
- [ ] Codex discovery % matches unlocked entries

## Play loop

- [ ] Pause → resume; run snapshot saved (`nn_run_v1`)
- [ ] Pause → settings (saves run, `?from=play` resume); no codex/shop from pause overlay
- [ ] Level complete → next level; game over → continue / restart
- [ ] Power fusion spot-check (FrozenBall vs FireCannon, LaserII)

## Monetization & legal

- [ ] Remove ads / restore (when IAP enabled in build)
- [ ] Terms & privacy reachable from hub and settings About
- [ ] Music credits visible in settings About (Pixabay)

## Analytics (production)

- [ ] `neon:analytics` events reach `window.gtag` when GA snippet present
- [ ] Without gtag, production logs `[neon:analytics]` once per event (no throw)

## PWA & native (when shipping)

- [ ] Install prompt or `/install/` fallback
- [ ] Capacitor back button maps to pause / shell back
- [ ] Offline: hub and last meta readable; play needs network for music CDN
