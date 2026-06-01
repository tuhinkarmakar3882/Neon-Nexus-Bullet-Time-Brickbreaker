import { GAME, JARDINAIN, playfieldLayoutScale, isCompactLayout } from '../config/Constants.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const BAND_LABELS = ['GARDEN', 'GROWING', 'WILD', 'OVERGROWN', 'CHAOS', 'NEXUS'];

/**
 * Progressive difficulty — driven by level index only (not campaign seed).
 * Layout variety still uses per-run RNG; hardness scales predictably with level.
 */
export function difficultyFor(level) {
  const t = Math.max(0, level - 1);
  const band = Math.min(BAND_LABELS.length - 1, Math.floor(t / 5));
  const compact = isCompactLayout();

  return {
    level,
    band,
    label: BAND_LABELS[band],
    /** 1–10 HUD / level flash intensity — maps to level */
    rating: clamp(Math.ceil(level / 5), 1, 10),

    ballSpeedMult: clamp(1 + t * 0.014, 1, 1.48),
    bounceAccelMult: clamp(1 + t * 0.004, 1, 1.12),
    brickHpMult: clamp(1 + t * 0.018 + (level <= 5 ? 0.08 : 0), 1, 1.55),

    rowBonus: Math.min(12, Math.floor(t / 1.05) + (level <= 4 ? 0 : level <= 8 ? 1 : 2)),
    layoutRowBonus: (compact
      ? (level <= 4 ? 2 : 3) + Math.floor(t / 1.1)
      : (level <= 4 ? 1 : 2) + Math.floor(t / 3))
      + Math.floor((playfieldLayoutScale() - 1) * 4),
    layoutMaxRows: compact ? 24 : 20,
    layoutDensityBoost: (compact ? 0.14 : 0.08) + (playfieldLayoutScale() - 1) * 0.06,
    /** Small deterministic row wobble from level (not RNG) */
    rowJitter: (level % 3) - 1,
    patternDensity: clamp(1.1 + t * 0.01, 1.1, 1.24),
    sparsePatternBoost: compact
      ? clamp(0.94 + t * 0.004, 0.94, 1.04)
      : clamp(1.06 + t * 0.005, 1.06, 1.16),
    /** Gnome pot cadence — slow early, ramps to full pressure (~level 22+). */
    potThrowRateMult: clamp(0.42 + t * 0.028, 0.42, 1.05),
    potSpeedMult: clamp(0.5 + t * 0.026, 0.5, 1.12),
    movingBoost: clamp(t * 0.008, 0, 0.28),
    moveSpeedMult: clamp(1 + t * 0.01, 1, 1.45),

    gnomePopupMult: clamp(0.9 + t * 0.016, 0.9, 1.85),
    gnomeSpawnChance: clamp(0.42 + t * 0.018, 0.42, 0.88),
    gnomeMaxAlive: clamp(2 + Math.floor(t / 1.6), 2, JARDINAIN.MAX_ALIVE),
    gnomeThrowMult: clamp(1 - t * 0.012, 0.38, 1),
    gnomePressure: clamp(0.95 + t * 0.018, 0.95, 2.1),
    nestBudget: clamp(2 + Math.floor(level / 2), 2, JARDINAIN.MAX_ALIVE),

    enemyCountBonus: Math.floor(t / 2),
    enemySpawnMult: clamp(1 - t * 0.038, 0.26, 1),
    hazardSpeedMult: clamp(1 + t * 0.011, 1, 1.52),
    powerFallMult: clamp(1 + t * 0.006, 1, 1.35),

    comboStep: Math.max(5, GAME.COMBO_MULT_STEP - Math.floor(t / 8)),
    mutatorMinLevel: Math.max(5, 28 - band * 3),
    /** Chance a level rolls a mutator (level curve, not random swing) */
    mutatorChance: clamp(0.18 + t * 0.022, 0.18, 0.82),
    secondMutatorChance: level >= 18 ? 0.3 : level >= 12 ? 0.18 : 0,

    lifeRewardEvery: level <= 5 ? 2 : level <= 15 ? 3 : 4,

    zoneCount: levelZoneCount(level, compact),
    /** Per-level brick HP multiplier from layout pace (siege / standard / blitz). */
    brickHpPaceMult: 1,
    typeRolls: brickTypeRolls(level, t),
    gravityBase: levelGravityBase(level, band),
  };
}

/** How many vertical zones a non-boss level uses (level-only). */
export function levelZoneCount(level, isCompact = isCompactLayout()) {
  /** Stacked hybrid zones — early levels still use multiple distinct patterns. */
  if (isCompact) {
    if (level <= 8) return 3;
    if (level <= 14) return level % 5 === 0 ? 4 : 3;
    return level % 5 === 0 ? 4 : 3;
  }
  if (level <= 4) return 3;
  if (level <= 12) return level % 4 === 0 ? 4 : 3;
  return level % 5 === 0 ? 4 : 3;
}

/** Brick-type weights for procedural fill — scales with level only. */
export function brickTypeRolls(level, t = Math.max(0, level - 1)) {
  const diff = { movingBoost: clamp(t * 0.008, 0, 0.28) };
  const tactical = level >= 6 ? clamp(0.03 + level * 0.0035, 0, 0.14) : 0;
  const chaos = clamp(t * 0.012, 0, 0.14);
  return {
    explode: clamp(0.06 + level * 0.0032 + chaos * 0.4, 0.06, 0.18),
    silver: clamp(0.06 + level * 0.038, 0, 0.5),
    reinforced: level >= 2 ? clamp(0.08 + level * 0.009 + chaos * 0.3, 0, 0.32) : 0,
    invisible: 0,
    moving: level >= 2 ? clamp(0.06 + (level - 2) * 0.016 + diff.movingBoost, 0, 0.45) : 0,
    nest: clamp(0.08 + level * 0.005, 0.08, 0.26),
    tactical,
    mirror: tactical * 0.35,
    moss: tactical * 0.35,
    beehive: level >= 10 ? tactical * 0.4 : 0,
    seedpod: level >= 12 ? tactical * 0.35 : 0,
    linked: level >= 14 ? tactical * 0.25 : 0,
    hostage: level >= 6 ? clamp(0.03 + level * 0.002, 0, 0.1) : 0,
  };
}

/** Baseline arena gravity before per-level twist overrides. */
export function levelGravityBase(level, band = Math.min(BAND_LABELS.length - 1, Math.floor((level - 1) / 5))) {
  if (level % 11 === 0) return 0.72;
  if (level >= 22 && level % 3 === 0) return 0.65;
  if (level >= 14 && level % 2 === 0) return 1.35;
  if (band >= 3 && level % 4 === 0) return 1.12;
  if (level % 7 === 0) return 0.78;
  return 1;
}

export function scaledBallBaseSpeed(level) {
  const d = difficultyFor(level);
  return GAME.BALL_MIN_SPEED * GAME.BALL_LEVEL_BASE_MULT * d.ballSpeedMult;
}

/** Total brick rows for a level (boss or normal). */
export function levelBrickRows(level, diff, isBoss, rowCap) {
  const rowJitter = diff.rowJitter ?? 0;
  const compact = isCompactLayout();
  const base = isBoss
    ? 8 + (level % 2)
    : 6 + diff.rowBonus + diff.layoutRowBonus + rowJitter + (level % 2);
  const floor = compact ? (level <= 4 ? 5 : 6) : (level <= 4 ? 4 : 5);
  return clamp(base, floor, rowCap);
}
