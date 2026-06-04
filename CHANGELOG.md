# Changelog

## [3.1.0] — 2026-06-02

### Product & UX (audit sprint)

- **Game over:** Continue/share busy states scoped; quit-to-menu confirm when score > 0; inventory **siege continues** shown when available; Esc opens confirm instead of instant quit.
- **Pause Garden:** Settings, Codex, and Shop from pause with run save and `?from=play` return path.
- **Onboarding:** First-run home FTUE (3 steps); first power-up coach banner in play.
- **Shell:** Single design-system source (`components.css` + tokens); per-route page titles; hub links to `/share/` and `/install/`.
- **Accessibility:** Settings label/control association; codex tab pattern; focus rings; locked bestiary `aria-label`.
- **Analytics:** Screen views, game-over actions, share funnel, pause garden navigation (`neon:analytics`).
- **Share:** Lighter share-card background; hub share preview modal before native share.
- **Boot:** Play boot failure panel with retry and return to hub.

### Docs

- `docs/DESIGN_SYSTEM.md` — shell UI conventions
- `docs/UX_IMPLEMENTATION_STATUS.md` — roadmap phase checklist

## [3.0.5] — prior

Bullet-time brick breaker on Phaser 4 + Next.js 15 shell. See `docs/ARCHITECTURE.md` for technical history.
