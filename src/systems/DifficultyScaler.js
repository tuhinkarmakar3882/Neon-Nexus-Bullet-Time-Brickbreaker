import { GAME, JARDINAIN } from '../config/Constants.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const BAND_LABELS = ['GARDEN', 'GROWING', 'WILD', 'OVERGROWN', 'CHAOS', 'NEXUS'];

/** Progressive difficulty curve — returns multipliers & caps for a given level. */
export function difficultyFor(level) {
  const t = Math.max(0, level - 1);
  const band = Math.min(BAND_LABELS.length - 1, Math.floor(t / 5));

  return {
    level,
    band,
    label: BAND_LABELS[band],
    /** 1–10 intensity shown in level flash / HUD */
    rating: clamp(Math.round(1 + t * 0.22 + (level % 5 === 0 ? 1 : 0)), 1, 10),

    /** Ball base speed multiplier */
    ballSpeedMult: clamp(1 + t * 0.014, 1, 1.48),
    /** Per-paddle-return acceleration multiplier */
    bounceAccelMult: clamp(1 + t * 0.004, 1, 1.12),
    /** Extra HP on multi-hit bricks */
    brickHpMult: clamp(1 + t * 0.018, 1, 1.55),

    /** Extra brick rows stacked on generator base */
    rowBonus: Math.min(8, Math.floor(t / 1.6)),
    /** Pattern fill density (1 = no gaps removed) */
    patternDensity: clamp(0.94 + t * 0.003, 0.94, 1),
    /** Moving / shifting brick chance boost */
    movingBoost: clamp(t * 0.008, 0, 0.28),
    /** Shifting brick glide speed scale */
    moveSpeedMult: clamp(1 + t * 0.01, 1, 1.45),

    /** Gnome pressure — higher = more pop-ups, faster throws */
    gnomePopupMult: clamp(0.9 + t * 0.016, 0.9, 1.85),
    gnomeSpawnChance: clamp(0.42 + t * 0.018, 0.42, 0.88),
    gnomeMaxAlive: clamp(2 + Math.floor(t / 1.6), 2, JARDINAIN.MAX_ALIVE),
    gnomeThrowMult: clamp(1 - t * 0.012, 0.38, 1),
    gnomePressure: clamp(0.95 + t * 0.018, 0.95, 2.1),

    /** Enemies & hazards */
    enemyCountBonus: Math.floor(t / 2),
    enemySpawnMult: clamp(1 - t * 0.038, 0.26, 1),
    hazardSpeedMult: clamp(1 + t * 0.011, 1, 1.52),
    powerFallMult: clamp(1 + t * 0.006, 1, 1.35),

    /** Combo multiplier steps in slightly faster at high level */
    comboStep: Math.max(5, GAME.COMBO_MULT_STEP - Math.floor(t / 8)),

    /** Mutators kick in earlier as levels climb */
    mutatorMinLevel: Math.max(5, 28 - band * 3),

    /** Life reward: +1 every N levels cleared (not every level) */
    lifeRewardEvery: level <= 5 ? 2 : level <= 15 ? 3 : 4,
  };
}

export function scaledBallBaseSpeed(level) {
  const d = difficultyFor(level);
  return GAME.BALL_MIN_SPEED * GAME.BALL_LEVEL_BASE_MULT * d.ballSpeedMult;
}
