# Neon Nexus — Game Mechanics Reference (v2)

Player-facing rules and systems for the **Twilight Garden** Phaser build under `src/`.  
For architecture and file maps, see [`ARCHITECTURE.md`](./ARCHITECTURE.md). For the product roadmap, see [`REDESIGN.md`](./REDESIGN.md). Index: [`README.md`](./README.md).

> **Note:** The original canvas prototype is documented only as historical context in `legacy/`. This file describes the **current** game.

---

## 1. Core loop

1. **Menu** — Play, Resume, Shop, Codex, Settings.
2. **Level** — Break bricks, knock out garden gnomes, meet optional level goals.
3. **Clear** — Destroy all destructible bricks + satisfy goal → stars, treasury, next level.
4. **Fail** — Lose all lives → Game Over (free continues + rewarded options).

| Stat | Default |
|------|---------|
| Lives | 3 |
| Continues | 2 |
| Combo multiplier | Steps every 8 brick hits (max ×3) |

---

## 2. Controls

| Input | Action |
|-------|--------|
| ← / → or drag | Move paddle |
| Tap / Space / Enter | Launch ball, fire cannons, release sticky ball |
| Double-tap (in play) | Spend Nexus meter (partial slow-mo) or open power draft at full meter |
| P / Esc | Pause |

---

## 3. Jardinains (gnomes)

Gnomes **pop up** on eligible bricks during play (not pre-placed on every brick).

| Action | Result |
|--------|--------|
| **Dislodge** | ~55% chance to drop a power capsule (`GNOME_DISLODGE_DROP_CHANCE`) |
| **Juggle** | Score scales as `250 × 1.55^(n−1) × concurrency` (chain capped at 7, max 3 airborne gnomes counted) |
| **Knockout** | After **3** paddle juggles on one gnome, or knocked off screen — guaranteed power drop + Nexus + streak |

**Gnome streak meter** (left vertical HUD bar): fills from juggles/knockouts → at 100% opens a **3-choice positive power draft**.

**Tiers:** normal, heavy, speed, elite — see Codex → GNOMES tab after first knockout per tier.

---

## 4. Power-ups (44 keys)

Catalog: `src/config/PowerUps.js` (`POWER_KEYS`). Capsules show category color, Lucide icon, and polarity (positive / **cursed** stripes / wild).

### Drop sources

| Source | Chance / rule |
|--------|----------------|
| Gnome dislodge | ~55% |
| Gnome knockout | Always (if room on field) |
| Random gnome drop roll | ~35% base (`GNOME_DROP_CHANCE`) when not forced |
| Gnome streak draft | Player picks 1 of 3 |
| Combo gambit (CASH) | Combo ≥8, cashes combo for instant power |
| Silver / explosive / reinforced brick | Small % (`tryBrickPowerDrop`) |
| Blessed / mystery capsules | Visual variants; blessed biases loadout |

### Cursed capsules

Negative powers **auto-apply** after ~5s if ignored (lower arena). Grab again to clear **Flip** early.

### Fusion (tier II)

Picking a power you already have active fuses to tier II (e.g. Laser → Laser II) — see `PowerFusion.js`.

### Stacking

| Category | Rule |
|----------|------|
| Cannons (Laser, Fire, Ice, Shock, Napalm) | Latest replaces previous |
| Ball mods (Explosive, Nuke, Frost, Electric, …) | Latest replaces previous |
| Paddle / env utilities | Stack concurrently |

### Negatives (~10–24% by level)

Reduce, SlowPaddle, Flip, HeavyBall, FogSight, GnomeRush, etc.

---

## 5. Nexus meter & bullet time

**Right vertical HUD bar** — fills from combos, near-misses, gnome knockouts.

| State | Action |
|-------|--------|
| Partial fill (≥25%) | Double-tap meter → spend for **boosted Nexus slow-mo** (~0.12× time scale, ~1–1.5s, stronger FX than incidental bullet time) |
| Full meter | Auto-opens **3-choice positive power draft** (tap meter or double-tap to reopen) |

Settings toggle can disable bullet-time FX. Active slow-mo shows **SLOW-MO** or **NEXUS** on the right meter.

---

## 6. Level goals

**Primary win condition:** destroy all destructible bricks (`canCompleteLevel()`).

Bonus goals appear rarely (~10% from level 8+) for variety; fortress levels may use **Boss Perch** (~15%).

| Goal | Notes |
|------|-------|
| **Clear all** | Default — always levels 1–7; ~90% overall |
| Rescue | ≥2 gnome knockouts (bonus) |
| Silence | No pot may hit paddle (bonus) |
| Nest hunt | Destroy all nest bricks (bonus) |
| Escort | Protect lantern brick (bonus) |
| Boss perch | Knock fortress gnome off perch (boss variant) |

Goal + mutator text appears under the top HUD bar; mutator intro card at level start.

---

## 7. Mutators & biomes

Up to **2 mutators** per level (from level 31+). All **13** mutators:

FastBall · LowVisibility (Mist) · DoubleJardinains · NarrowArena · WideArena · GnomeSwarm · BrickFrenzy · HeavyGravity · PotMonsoon · GlassFloor · CannonsOnly · GnomeParliament · BrickBloom

**Seasonal mutator** injected every 7 levels from `SeasonalMutators.js`.

**Biomes** shift every 10 levels: Garden → Nexus → Frost → Ember (`Themes.js`).

---

## 8. Stars, treasury & meta

| System | Rule |
|--------|------|
| **3-star levels** | 1★ for clear; +1★ par time (`90s + 8s × level`); +1★ no lives lost; +1★ ≥1 knockout (max 3★) |
| **Treasury** | Stars ×50, combo bank milestones, shop currency |
| **Gnome contracts** | Optional per-level bonus — no pot hits, elite knockout, juggle chain (`GnomeContracts.js`) |
| **Codex journal** | Stats + achievements |

Persistence: `MetaProgress.js` → `localStorage['nn_meta_v1']`.

---

## 9. Brick specials (tactical)

Beyond normal/silver/reinforced: explosive, invisible, nest, boss, gold, steel, **portal**, shifting, **mirror**, **moss**, **beehive**, **seedpod**, **linked**, **hostage**.

| Special | Behavior |
|---------|----------|
| **Portal** | Linked pair (level ≥8). Teleports ball/gnome to partner; exit spawns **outside** the exit brick with a short grace cooldown to prevent ping-pong loops |
| Mirror | Reflects ball angle |
| Moss | Slows ball on contact |

Fortress every **5** levels.

---

## 10. Ball readability

Chaos is intentional — readability is handled in `Ball.js`:

| Feature | Purpose |
|---------|---------|
| **Dark rim** (`ball-rim`) | High-contrast outline on busy brick fields |
| **Brighter default halo** | Unmodded ball stays visible without power tint |
| **Identity tints** | Each ball gets a distinct ring/trail hue (white, sky, gold, violet, …) when several are on screen |
| **Power tint** | Active mods override identity with category color (frost, electric, mega, etc.) |

---

## 11. HUD layout

| Zone | Content |
|------|---------|
| **Top bar** | Score, level, bricks, lives, pause, gems/treasury |
| **Left vertical meter** | Gnome streak (fill bottom→top), CASH gambit button |
| **Right vertical meter** | Nexus meter, slow-mo / NEXUS label |
| **Below bar** | Goal line, mutator line |
| **Immersive mode** | Settings toggle hides chrome; tap top to peek |

Active powers are read from **power-up pills in the arena** (not HUD chips).

---

## 12. Monetization (cosmetic-first)

Demo ad provider in dev; swap for AdMob/AdSense in production.

| Moment | Reward |
|--------|--------|
| Game Over | Rewarded continue or **revive + 2 powers** |
| Level clear | Optional 2× clear bonus (rewarded) |
| Every 2 levels | Interstitial (90s cap; skipped with Remove Ads) |
| Menu | Banner slot |
| Shop | Paddle hulls, ball trails, garden themes (treasury / premium) |

---

## 13. Settings (persisted)

Sound, music, volumes, bullet time, flash text, particles, scanlines, reduced FX, haptics, **immersive HUD**, remove ads IAP.

---

## 14. VFX, sound & animation

All audio is **Web Audio synthesis** (`AudioManager.js`). All motion is **tween + particle** based — no sprite sheets.

### Sound highlights

| Moment | Audio |
|--------|-------|
| Brick hits | Pitch rises with combo |
| Power pickup | Category stinger (paddle / ball / wild / env) |
| Cursed pickup | Downward “wrong note” sweep |
| Gnome pop-up | `gnomePop()` sweep |
| Juggle chain | `juggle(n)` — pitch climbs with depth |
| Knockout | `wowHit()` + `explode()` |
| Near-miss | `clutch()` + CLUTCH! callout |
| Nexus / slow-mo | `bulletTime()` wash; player Nexus spend uses stronger slow-mo scale |
| Boss clear | `fortressShatter()` + arena shard burst |
| Level clear | 5-note `levelUp()` arpeggio |

Background music: **Pixabay ambient loops** ([`MusicCatalog.js`](../src/config/MusicCatalog.js)) — rotates per level/biome. SFX remain procedural Web Audio in [`AudioManager.js`](../src/systems/AudioManager.js).

### Visual highlights

| Moment | FX |
|--------|-----|
| Level start | Bricks stagger-drop in; difficulty tier pulse |
| Gnome spawn | Rise-pop + green ripple ring |
| Knockout | Hit-stop slow-mo, confetti, radial blast, camera tilt |
| Near-miss | Blue ripple + sparks + Nexus meter fill |
| Big power | Screen punch, radial ring, optional confetti |
| Cursed power | Red flash, paddle wobble, CURSED! surge text |
| Fortress win | Wall shards, arena fade, screen punch |
| Nexus burst | Row fire blasts + full slow-mo |

Toggle **Reduced FX** in Settings to cut particles and bloom. Toggle **Bullet Time** to disable slow-mo overlay (meter still fills).

Full catalog: [`ARCHITECTURE.md` §18](./ARCHITECTURE.md#18-audio-vfx--animation).

---

## 15. Legacy prototype

`docs/GAME_MECHANICS.md` previously described the original 23-power canvas game. Fixed differences in v2:

- Gnome-centric economy (not random brick drops as primary)
- 44 power keys + tier-II fusion
- Custom Phaser physics, pause-safe timers
- Procedural fortress layouts, level goals, mutators
- Meta progression, shop/cosmetics

See [`legacy/`](../legacy/) for the old implementation only.
