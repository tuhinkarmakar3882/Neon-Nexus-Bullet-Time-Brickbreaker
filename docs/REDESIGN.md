# Neon Nexus — Arkanoid Reforged (Redesign)

A ground-up gameplay + visual redesign taking direct inspiration from **Arkanoid**
(tight enclosed arena, Vaus craft, falling letter capsules, silver/gold bricks) and
**Jardinains!** (creatures that live in the bricks and lob projectiles at your paddle).

## Visual direction
- Premium, restrained palette (`src/config/Palette.js`) — deep desaturated space, a few
  confident accents, tasteful brick hues instead of pure RGB neon.
- **Nine-slice glass panels** for bricks and a **metallic Vaus paddle** with an energy
  groove, generated as crisp canvas textures and scaled without blur.
- **Energy-orb ball** with halo + comet trail, soft **drop shadows** for depth, and an
  enclosed **arena frame** with energy edges.
- **Tuned bloom (0.65)** + vignette — glow that reads premium, not the washed-out look.
- Verified objectively via `scripts/visualcheck.mjs` (renderer snapshot → pixel sampling):
  ~9 distinct hues in-game, balanced brightness, no blow-out.

## Mechanics (tactical)
- **Enclosed arena**: side + top walls; ball launches from the Vaus; aim dots while held.
- **Brick families**:
  - *Normal* — colored, 1 hit.
  - *Silver* — armoured, 2+ hits scaling with level (shows cracks + HP pips).
  - *Gold* — **indestructible** structural obstacles (level layouts route around them).
  - *Explosive* — chain-detonates neighbours.
  - *Nest* — houses a **Jardinain**.
- **Jardinains**: perch on bricks, bob, and **lob flowerpots** at the paddle (a hit stuns
  you + score penalty). Knock them off with the ball/laser for **+250** and a ragdoll fling.
- **Combos**: consecutive brick breaks without touching the paddle ramp a score multiplier
  (up to x8) with floating score pop-ups. Touching the paddle resets the combo — risk/reward.
- **Level layouts**: rows, pyramid, diamond, columns, checker, arch, and a **fortress** every
  5th level (gold border + pillars + extra nests).
- Clear = destroy all *destructible* bricks (gold is permanent cover, never blocks a clear).

## Power-up capsules (curated, Arkanoid-style)
Down from a 23-item grab-bag to 12 distinct, readable capsules with classic letters:

| Letter | Name | Effect |
|---|---|---|
| L | Laser | Vaus fires twin lasers |
| E | Expand | Wider paddle |
| C | Catch | Catch & re-aim the ball |
| S | Slow | Slow the ball |
| D | Multi | Split into three balls |
| M | Magnet | Pull capsules toward you |
| A | Shield | Energy floor saves one drop |
| T | Through | Ball smashes through bricks |
| G | Mega | Giant heavy ball (2 damage) |
| X | Bomb | Explosive ball impacts |
| P | Life | Extra life |
| B | Warp | Skip to the next level |

Capsules tumble down, are caught by the paddle, show a live timer chip in the HUD, and each
has strong pickup feedback (flash, SFX, bullet-time on the big ones).

## Game loop / UX
- Level intro flash (LEVEL n / FORTRESS), launch hint, aim indicator.
- **Level-clear summary** with clear bonus + running score.
- Ship-icon lives, score, level, brick count, combo, pause — readable HUD above the arena.
- Continues + rewarded-ad continue, high score, pause/settings, responsive full-screen layout.

## Verification
- `npm run test:smoke` — full flow + all 12 capsules, zero console/page errors.
- `node scripts/diag.mjs` — every capsule mutates state; layout fills the viewport.
- `node scripts/visualcheck.mjs` — objective render sanity (content / variety / brightness).
