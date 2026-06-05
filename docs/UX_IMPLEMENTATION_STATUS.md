# UX audit implementation status (v3.1.5)

Tracks delivery against the **AAA UX Audit & Improvement Roadmap** (80 P0 items). **All build phases are complete as of v3.1.5.**

## Release: 3.1.5 — AAA UX audit (complete)

| Area | Shipped |
|------|---------|
| **Hub** | `ProgressStrip` (Gems, Best, Stars, **Today**), `JourneyPath`, `HubCommandPalette` (⌘/Ctrl+K), `navConfig.ts`, `HubRewardToasts` |
| **Play HUD** | Goal/mutator chips, power pills, tappable gems → shop, `GameplayHudLiveRegion` |
| **Pause** | Resume / **Settings** / Quit only — run saved via `saveRunAndLeavePlay`; **no** codex/shop from pause |
| **Coaches** | `PowerCoachBanner` / `NexusCoachBanner` **removed** (not mounted); hints via HUD live region + codex |
| **VFX** | Flash budget + min-gap; Ultra atmosphere (particles, edge-strip — **no playfield vignette**); `prefers-reduced-motion` → low tier |
| **SFX** | Launch clang, metal clang, combo pitch, game-over sting, pause SFX, ambience toggle |
| **A11y** | Focus trap + Escape on shell modals and play overlays; viewport zoom; gamepad router |
| **Gamification** | Daily best, return streak, post-run summary queue, level-complete celebration |
| **Codex / settings / share** | Gated powers, URL `?tab=`, sectioned settings, `/share/` → `/?share=1` |
| **Analytics** | `productionSink.ts` → `window.gtag` when present |
| **QA** | `test:smoke` in CI, `docs/QA_CONSTRAINT_CHECKLIST.md`, `docs/QA_WAVE_SIGNOFF.md` |

---

## Wave checklist (S1 → STRAT + QA)

| Wave | Status |
|------|--------|
| **S1** Hub/HUD, flash restraint, haptics (`nn_haptics`), delete coaches, pause→settings | ✅ |
| **S2** Ultra VFX gating, SFX, power pills, gems→shop | ✅ |
| **S3** Bridge teardown, emitStats dirty flag, softlock throttle, gamepad, modal a11y, live region | ✅ |
| **S4** Codex honesty, settings nav, share consolidate, ambience, cleanup | ✅ |
| **G** Daily score, streak, JourneyPath, hub toasts, level-complete UX | ✅ |
| **STRAT** nav config, command palette, viewport zoom, analytics sink, shop tabs | ✅ |
| **QA** CI smoke gate, migration tests, constraint docs | ✅ |

---

## Product constraints (enforced)

1. **Unobstructed gameplay** — no modal coaches during active play
2. **Flash restraint** — capped impact flash, tier `flashMinGap`, hero moments use high priority
3. **No playfield vignette** — Ultra uses particles / bloom stub / edge-strip only
4. **Haptics** — on by default; independent of VFX tier (`nn_haptics`)
5. **Gamification on periphery** — hub, overlays, post-run summary only

---

## Deferred (post-3.1.5)

- [ ] Client-side play transition without full page reload
- [ ] Hybrid sample SFX catalog wired to `AudioManager` (`lib/audio/sampleSfxCatalog.ts` stub)
- [ ] Visual bloom pipeline (currently no-op stub in `SceneVfx.js`)
- [ ] WCAG 2.2 AA formal certification pass
- [ ] Live ops shell (events, news slot)

---

## Verify before ship

```bash
pnpm run typecheck
pnpm run build
pnpm run test:migration
pnpm run test:smoke
```

Manual: home FTUE → play → pause → **Settings** → resume run → level complete → game over (continue + share) → hub ProgressStrip / streak.

See [**QA_CONSTRAINT_CHECKLIST.md**](./QA_CONSTRAINT_CHECKLIST.md) and [**QA_WAVE_SIGNOFF.md**](./QA_WAVE_SIGNOFF.md).
