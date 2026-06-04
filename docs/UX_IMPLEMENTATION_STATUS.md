# UX audit implementation status (v3.1.0)

Tracks delivery against the UX Product Audit implementation roadmap (plan attached in project planning docs). Audit *analysis* phases (1–9) are documentation; *build* phases are below.

## Release: 3.1.0 — Product experience sprint

| Area | Shipped in 3.1.0 |
|------|------------------|
| Game over | Scoped busy state; quit confirm; inventory continues surfaced; Esc → confirm |
| Play meta | Pause is resume/quit only; Codex, Shop, Settings from hub |
| Onboarding | Home FTUE (3 cards); first power pickup coach in play |
| Design system | Tokens + `components.css` authority; `docs/DESIGN_SYSTEM.md` |
| IA / copy | Codex naming unified; `/share/` & `/install/` linked from hub |
| A11y | Settings `controlId`; codex tablist/tabpanels; focus rings; locked bestiary labels |
| Analytics | `screen_view`, `game_over_action`, `share_funnel`, `pause_garden_nav` |
| Share | Subtle `drawChaosField`; hub preview modal |
| Boot | Error panel with retry + return to hub |

---

## Quick wins (1–2 weeks) — **Complete**

- [x] Unified labels in `lib/copy/shell.ts`
- [x] Game over busy scoped; Esc quit confirm
- [x] Link `/share/` and `/install/` from hub
- [x] Focus-visible on shell controls
- [x] Remove dead `.codex-tab` CSS
- [x] Per-route `metadata` via route `layout.tsx` files

---

## Mid-term (1–3 months) — **Complete for 3.1.0 scope**

- [x] Design system consolidation (`globals.css` layout only; buttons in `components.css`)
- [x] Pause overlay — resume + quit only (meta nav removed from pause)
- [x] Codex `tablist` / `tabpanel` via `SegmentedControl`
- [x] Onboarding v1 (home FTUE + power coach)
- [x] Boot error recovery UI
- [x] Analytics events

**Deferred (post-3.1.0):**

- [ ] Single unified boot progress model (React + Phaser still dual-stage)
- [ ] `forge-item` / `shop-row` full component merge
- [ ] Hub “More” sheet (3 primary actions + drawer) — blueprint only

---

## Strategic transformation (3–12 months) — **Planned, not in 3.1.0**

- [ ] Client-side play transition without full page reload
- [ ] Live ops shell (events, news slot)
- [ ] Figma ↔ `tokens.css` sync + visual regression CI
- [ ] WCAG 2.2 AA certification pass
- [ ] Unified monetization UX pattern across shop / IAP / ads

These remain on the long-range roadmap; they are intentionally out of scope for the 3.1.0 UX sprint.

---

## Audit phase coverage (Phases 1–9)

| Phase | Build impact in 3.1.0 |
|-------|------------------------|
| 1 Product understanding | Informs copy/FTUE; no separate deliverable |
| 2 Information architecture | Garden nav, orphan routes, Codex naming |
| 3 User journeys | FTUE, game over, mid-run meta |
| 4 Cognitive load | CTA hierarchy, game over confirm |
| 5 AAA UX review | Partial — onboarding + meta access |
| 6 Visual design | Design system merge, share card simplify |
| 7 Component review | Overlays, codex, settings, share |
| 8 Conversion & retention | Analytics + continue paths |
| 9 Competitive benchmark | Garden drawer, Stripe-like typography discipline |

---

## Verify before ship

```bash
pnpm run typecheck
pnpm run build
pnpm run test:smoke
```

Manual: home FTUE → play → pause Garden → back resume → game over (video + inventory continue) → share preview.
