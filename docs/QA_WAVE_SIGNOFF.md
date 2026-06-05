# QA wave sign-off matrix

| Wave | Scope | Automated | Owner sign-off | Ship gate |
|------|--------|-----------|----------------|-----------|
| W0 | Tooling: `typecheck`, `build`, `test:migration` | CI (`.github/workflows/ci.yml`) | Eng | Required |
| W1 | Smoke: play loop, settings, shop, pause, fusion | `pnpm run test:smoke` in CI | Eng | Required |
| W2 | Hub UX: ProgressStrip, ⌘K palette, nav config, cross-links | Smoke + manual § Gamification | Design | Required for UX release |
| W3 | A11y: zoom, focus, reduced motion | Manual checklist § Accessibility | QA | Required for store |
| W4 | Analytics: `neon:analytics` → gtag / prod sink | Manual + staging tag | Product | Required for marketing builds |
| W5 | Save migration & streak keys | `test:migration` + smoke gamification | Eng | Required |
| W6 | Direct `/play/` bookmark & forceNew | Manual + smoke hub loop | Eng | Required |
| W7 | Shop IA tabs (hull/trail/theme) | Manual shop § | Design | Nice-to-have |
| W8 | Music credits & legal | Manual About § | Legal | Required |
| W9 | Native Android IAP + ads | `ship:check:android` + device | QA | Platform-specific |

## Sign-off log (fill per release)

| Version | Date | W0 | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | Notes |
|---------|------|----|----|----|----|----|----|----|----|----|----|-------|
| 3.1.5 | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | AAA UX audit complete |
| 3.1.x | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |

## Regression focus by wave

- **W1:** Game scene start, pause snapshot, level 2 advance, continue/restart
- **W2:** `.progress-strip` on `/`, **Today** + Streak labels, hub→play→hub, ⌘K palette
- **W5:** `nn_save_schema >= 2`, `nn_haptics`, `nn_return_streak` after migration
- **W6:** New game clears run; bookmark resume respects `neon-play-force-new`
