# Neon Nexus: Bullet-Time Brick Breaker — Game Mechanics Reference

This document is a complete reverse-engineered specification of the original game
(`legacy/worker.js` + `legacy/app-worker-based.js`, with `legacy/app.js` being the
single-threaded mirror). It is the design source-of-truth for the Phaser rewrite under
`src/`.

---

## 1. High-level Concept

A neon, arcade brick-breaker. The player controls a paddle at the bottom of the screen,
launches a ball, and clears every brick on the field to advance levels. Destroying bricks
randomly drops **power-up capsules**. Picking a capsule applies an effect and (optionally)
briefly triggers **Bullet Time** (global slow-motion). Enemy "cannon" bricks shoot back.

- **Goal per level:** destroy all bricks (`bricks.length <= 0`).
- **Lives:** start with `3`. Losing all balls costs a life. `0` lives → Game Over.
- **Continues:** `3` continues available after Game Over (`canContinue`).
- **Score:** `+10` per brick (laser/ball), `+5` per black-hole kill, `+10` per echo kill.
  Getting stunned by an enemy bullet costs `-10` (floored at 0).
- **Level up:** on clear, `level++` and `lives++`, a "level complete" modal shows for 3s,
  a fresh procedural layout is generated, and a random background track plays.

---

## 2. Core Entities

### Paddle
- Base width `120`, height `18`, move speed `9`.
- Controlled by **mouse** (pointer-lock, relative `movementX`), **touch** (absolute x),
  or **keyboard** (`ArrowLeft` / `ArrowRight`).
- State flags: `sticky` (Glue), `magnet` (Magnet), `isReversed` (Reverse), `stun` (frames),
  `isLaserActive`, `isMissileActive`, `isGravityActive`.
- Color reflects state: stunned `#5a5a5a`, sticky = Glue color, reversed = Reverse color,
  otherwise white.

### Ball
- Radius `8`. Speed scales with screen height (`MIN_SPEED`..`MAX_SPEED`, exponential map).
- Starts **stuck** to the paddle; `release()` launches it. Launch angle is derived from where
  it sits on the paddle, clamped to `MAX_BOUNCE_ANGLE = 60°`.
- Paddle bounce: relative hit position → reflection angle (max 60°), preserving speed.
- Wall behaviour: bounces off side/top walls; with **Wrap** active, side walls are Pac-Man
  style wrap-around. Falling below the bottom edge loses the ball.
- Modifiers: `missile` (boomerang curve back toward paddle, `strength -0.075`),
  `gravity` (curve toward paddle, `strength +0.075`), `chargeReady` (one-shot brick destroyer),
  teleport (passes through bricks instead of bouncing).
- Ball color: charged `#FFAC33`, teleport `#72F2EB`, missile = Missile color, else white.

### Brick (types)
| Type      | HP | Behaviour | Color |
|-----------|----|-----------|-------|
| `static`  | 1  | Stationary. | translucent purple |
| `moving`  | 1  | Oscillates horizontally `sin(t/600)*50`. | orange |
| `explode` | 1  | On death: screen shake, ripple, particles, **splash kills all bricks within radius 90**. | yellow |
| `cannon`  | 1  | Periodically fires an **enemy bullet** downward (`RATE 2500ms` scaled by level). | violet |
| `boss`    | 3  | Takes 3 hits; color changes per remaining HP. | peach → orange → red |

Spawn weights (`_randomBrickType`): explode 5%, moving 5%, cannon 3%, boss 2%, else static.

### Bullet
- `player` bullets (from Laser) travel up, destroy bricks. `enemy` bullets (from cannon)
  travel down; hitting the paddle triggers **enemy stun**.

### Power capsule
- Falls at speed `2`. Attracted to the paddle when **Magnet** is active.
- Collected when it overlaps the paddle; applies its power.

### Particle
- Small square, random velocity, fades over `life` frames. Capped at `MAX_PARTICLES = 150`.

---

## 3. Bullet Time / Time Scale
- Global `timeScale` multiplies all motion. Normal `1`, bullet-time `0.25` for `1200ms`.
- Triggered when picking up a power-up (if enabled) and on explosions / stuns.
- A delta-time helper caps frame delta at 4 frames and multiplies by `timeScale`.

---

## 4. Level Generation
A level is built from 2–4 stacked **zones** (`_createZones`), each filled with a distinct,
non-repeating layout chosen from a pool:
- `grid` — rows/cols grid with 10% random gaps.
- `circle` — 16 bricks around a ring.
- `diamond` — concentric diamond rows.
- `tunnel` — grid with a vertical empty channel (cols 5–7).
- `wave` — grid rows offset by a sine wave.
- `perlin` — Perlin-noise mask (`noise.perlin2`) decides which cells get a brick.

Power-up drop chance per brick decays with level: `getProbability(level)` (≈0.7 → min 0.1).
Cannon fire-rate and black-hole radius also scale with level via `getDecreasingProbability`.

---

## 5. Power-Ups (complete catalogue)

All durations in milliseconds from `CFG.DUR`. "Active" power-ups appear lit in the sidebar.

| Power | Color | Dur (ms) | Effect |
|-------|-------|----------|--------|
| **Expand**     | `#0099FF` | 10000 | Paddle width ×1.3 (capped at 3× base / half screen). |
| **Reduce**     | `#FF00AA` | 10000 | Paddle width ×0.8 (floored at 0.2× base). |
| **Magnet**     | `#FFFF00` | 9000  | Falling capsules are pulled toward the paddle. |
| **Glue**       | `#FFD700` | 15000 | Ball sticks to paddle on contact; re-launch with click/Space. |
| **Laser**      | `#FF0066` | 7000  | Paddle auto-fires twin lasers every 200ms. |
| **Shield**     | `#DDDDFF` | 15000 | A one-shot floor that bounces the ball once instead of losing it. |
| **Flip**       | `#FF007F` | 7000  | Flips the view (`rotateX(180deg)`) — disorienting control invert. |
| **Velocity**   | `#007FFF` | 10000 | Ball speed ×1.2 (capped at MAX_SPEED). |
| **Chill**      | `#00FFAA` | 15000 | Ball speed ×0.7 (floored at MIN_SPEED), restored after. |
| **Burst**      | `#FF00FF` | 5000  | Splits the main ball into +2 extra balls (±0.3 rad). |
| **Heart**      | `#55FF55` | —     | +1 life. |
| **Joker**      | `#00FF00` | 10000 | Applies a random *other* power-up. |
| **Reverse**    | `#FF0055` | 5000  | Paddle controls inverted. |
| **Wrap**       | `#FFFF33` | 15000 | Ball wraps around the side walls (Pac-Man). |
| **Freeze**     | `#00FFFF` | 10000 | Freezes brick behaviour (moving/cannon) for the duration. |
| **ChargeShot** | `#FFC300` | 15000 | Next brick hit is a one-shot kill (turns it into an explode). |
| **BlackHole**  | `#FF0000` | 4000  | Spawns a vortex at a random brick that pulls in & destroys nearby bricks. |
| **Missile**    | `#FF5733` | 7000  | Ball boomerangs back toward the paddle. |
| **Gravity**    | `#AA00FF` | 5000  | Ball curves toward the paddle. |
| **Echo**       | `#E0E0FF` | 8000  | 8 orbiting echo nodes around the ball destroy bricks they touch. |
| **Teleport**   | `#00FFF0` | 8000  | Ball passes through bricks (no bounce) while destroying them. |
| **Squeeze**    | `#FF4500` | 5000  | All bricks shrink to 70% for 5s, then restore. |
| **Shuffle**    | `#FF8800` | 5000  | Randomly re-rolls every brick's type. |

> Note: the original's `COLORS` map had several mislabeled comments (e.g. "Chill" commented
> as orange but valued teal). The rewrite keeps the **values**, fixes the labels, and adds a
> distinct color for `Shuffle` (the original reused/omitted it).

---

## 6. Visual / Audio Feedback
- **Flash text** center-screen on power-up pickup and on life loss/level events.
- **Screen shake** on explosions; **hue-rotate "hit"** flash on enemy stun.
- **Shockwave ripples** on explosions (concentric dashed arcs).
- **Confetti** on level clear (legacy single-thread version only).
- **Background music**: random track per level from a Pixabay CDN playlist.
- Neon glow via canvas `shadowBlur`/`shadowColor` in the original.

---

## 7. Settings (persisted in `localStorage`)
- `isSoundEnabled` — mute/unmute background music.
- `isBulletTimeEnabled` — enable/disable slow-mo triggers.
- `isFlashTextEnabled` — enable/disable center flash text.

---

## 8. Bugs found in the original (fixed in the rewrite)

1. **Double game loop.** `Game` constructor calls `startLoop()` *and* the `INIT` handler calls
   `game.startLoop()` again, running two `requestAnimationFrame` loops → effectively double
   speed and double updates.
2. **Procedural layout ignores zone X.** Grid/tunnel layouts hard-code `20 + c*bw` instead of
   using `zone.x`, so multi-zone procedural levels overlap/misalign bricks.
3. **`levelType` computed but never used** in `buildLevel` — always falls back to procedural.
4. **`_blackHoleAngle` never initialized** → `NaN` rotation on first BlackHole.
5. **BlackHole on empty/short brick arrays** → `rand(0, -1)` / `NaN` index.
6. **Power expiry double-bookkeeping.** Powers are tracked both in the `active` map (expiry via
   `performance.now()`) and via individual `setTimeout`s; `setTimeout`s keep running while the
   game is paused, desyncing state.
7. **Bullet-time fires on every pickup**, including instant powers, making the game feel sludgy.
8. **Particle cap splice is wrong**: `splice(len - MAX, len)` removes the wrong slice.
9. **Mouse vs keyboard paddle fight.** Mouse path writes `paddleX` while keyboard writes
   `paddle.x`; they overwrite each other frame to frame.
10. **Ball/paddle collision ignores ball radius** on the x-axis test, allowing edge clipping.
11. **`RESIZE` case missing `break`** → falls through into `keydown` handling.
12. **Explode splash** silently sets `alive=false` without awarding score or chaining, and can
    recurse oddly with overlapping explode bricks.
13. **Squeeze restore uses global `game`** and can stack if picked up repeatedly, permanently
    shrinking bricks.
14. **No upper bound on ball/paddle speed coupling** when Velocity + paddle bounce combine,
    occasionally producing near-horizontal "stuck" balls (no minimum vertical velocity).

The rewrite (`src/`) reimplements all mechanics on **Phaser 3** with a single fixed-step update
loop, a unified input controller, a timer system that respects pause, a minimum vertical-velocity
guard, correct zone-aware level generation, WebGL bloom/glow for the neon look, and stubbed
monetization + cross-platform (PWA/Capacitor) packaging.
