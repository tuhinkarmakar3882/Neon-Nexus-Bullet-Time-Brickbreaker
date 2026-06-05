# Neon Nexus — Shell design system

## Source of truth

| Layer | Path | Role |
|-------|------|------|
| Tokens | `styles/shell/tokens.css` | Color, type, radius, shadows, focus ring |
| Components | `styles/shell/components.css` | Buttons, shell chrome, FTUE, share modal |
| Play overlays | `styles/play/overlays.css` | Pause / game-over |
| Global reset | `app/globals.css` | Layout, play stage, route-specific layout only |

**Do not** reintroduce `.neon-btn*` or `.shell-back` gradient blocks in `globals.css` — use `components.css`.

## Typography

- **Body / UI:** `var(--type-body)` — DM Sans (settings, codex, lists)
- **Display / chrome:** `var(--type-display)` — Chakra Petch (titles, badges)

`html, body` use the body stack for readable prose.

## Buttons

Use `NeonButton` / classes: `neon-btn`, `neon-btn-primary`, `neon-btn-secondary`, `neon-btn-muted`, `neon-btn-danger`, `neon-btn-economy`.

One primary action per screen; destructive actions use `danger`.

## Shell checklist (new meta page)

1. Route in `lib/shell/routes.ts` + `app/<name>/page.tsx`
2. Copy in `lib/copy/shell.ts`
3. `app/<name>/layout.tsx` with `metadata.title`
4. Wrap in `AppShell` with correct `tone` and `badge` (empty string if none)
5. Reuse `SettingRow`, `SegmentedControl`, `shop-row` — no one-off tab CSS

## Play ↔ shell

Mid-run meta: pause → **Settings** via `saveRunAndLeavePlay` + `?from=play`. Shop from HUD gem tap or hub. Back uses `shellBackHref` / `navigateToPlay({ resume: true })`.

Hub components: `ProgressStrip`, `JourneyPath`, `HubCommandPalette`, `HubRewardToasts` — see [`SHELL.md`](./SHELL.md).

## Analytics

`lib/analytics/shellAnalytics.ts` — `neon:analytics` custom events; `productionSink.ts` forwards to `window.gtag` when present; `trackScreenView` from `ShellProviders`.
