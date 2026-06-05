# Changelog

## [3.1.5] — 2026-06-05

### AAA UX audit (complete)

- **Hub:** `ProgressStrip` (Today daily best), `JourneyPath`, `HubCommandPalette` (⌘K), `HubRewardToasts`, `navConfig.ts`
- **Play HUD:** Goal/mutator chips, power pills, tappable gems → shop, `GameplayHudLiveRegion`
- **Pause:** Settings only from pause (`saveRunAndLeavePlay`); removed pause garden nav and in-play coach banners
- **VFX/SFX:** Flash budget + min-gap on impact flash; Ultra edge-strip (no vignette); launch clang, metal clang, combo pitch, game-over sting; ambience toggle
- **A11y:** Focus trap + Escape on modals/overlays; gamepad router; `prefers-reduced-motion` VFX downgrade
- **Gamification:** Daily score, return streak, post-run summary queue, level-complete celebration
- **Codex/settings/share:** Gated powers, URL tabs, sectioned settings; `/share/` → `/?share=1`
- **Analytics:** `productionSink.ts` for production gtag sink
- **QA:** `test:smoke` in CI; `docs/QA_CONSTRAINT_CHECKLIST.md`, `docs/QA_WAVE_SIGNOFF.md`
- **Tooling:** Next.js 16 with `--webpack` dev/build; `metadataBase` from `VITE_GAME_URL`; TypeScript 6 `ignoreDeprecations`

### Docs

- Updated `docs/SHELL.md`, `docs/UX_IMPLEMENTATION_STATUS.md`, `docs/README.md`, QA checklists

## [3.1.0] — 2026-06-02

### Product & UX (audit sprint)

- **Game over:** Continue/share busy states scoped; quit-to-menu confirm when score > 0; inventory **siege continues** shown when available; Esc opens confirm instead of instant quit.
- **Pause Garden:** Settings, Codex, and Shop from pause with run save and `?from=play` return path. *(Superseded in 3.1.5 — pause is resume/settings/quit only.)*
- **Onboarding:** First-run home FTUE (3 steps). *(In-play power coach removed in 3.1.5.)*
- **Shell:** Single design-system source (`components.css` + tokens); per-route page titles; hub links to `/share/` and `/install/`.
- **Accessibility:** Settings label/control association; codex tab pattern; focus rings; locked bestiary `aria-label`.
- **Analytics:** Screen views, game-over actions, share funnel, pause garden navigation (`neon:analytics`).
- **Share:** Lighter share-card background; hub share preview modal before native share.
- **Boot:** Play boot failure panel with retry and return to hub.

### Docs

- `docs/DESIGN_SYSTEM.md` — shell UI conventions
- `docs/UX_IMPLEMENTATION_STATUS.md` — roadmap phase checklist

## [3.0.5] — prior

Bullet-time brick breaker on Phaser 4 + Next.js shell. See `docs/ARCHITECTURE.md` for technical history.
