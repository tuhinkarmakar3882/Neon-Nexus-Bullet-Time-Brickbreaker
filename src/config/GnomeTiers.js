// Jardinains! 2 gnome variant definitions.

export const GNOME_TIER = {
  NORMAL: 'normal',
  HEAVY: 'heavy',
  SPEED: 'speed',
  ELITE: 'elite',
};

export const GNOME_TIERS = {
  normal: {
    label: 'Nain',
    tint: 0x86e6b0,
    throwMin: 2600,
    throwMax: 5200,
    gravityMult: 1,
    climbMult: 1,
    throwVxSpread: 80,
    projectiles: ['pot'],
    tracking: false,
  },
  heavy: {
    label: 'Heavy Nain',
    tint: 0x7aa8c8,
    throwMin: 3200,
    throwMax: 5800,
    gravityMult: 1.35,
    climbMult: 1,
    throwVxSpread: 60,
    projectiles: ['pot', 'anchor'],
    anchorWeight: 0.35,
    tracking: false,
  },
  speed: {
    label: 'Speed Nain',
    tint: 0xffd23d,
    throwMin: 1400,
    throwMax: 2800,
    gravityMult: 1,
    climbMult: 0.45,
    throwVxSpread: 140,
    projectiles: ['pot'],
    tracking: false,
  },
  elite: {
    label: 'Elite Nain',
    tint: 0xa78bfa,
    throwMin: 2200,
    throwMax: 4000,
    gravityMult: 1,
    climbMult: 1,
    throwVxSpread: 100,
    projectiles: ['pot', 'phone'],
    phoneWeight: 0.28,
    tracking: true,
  },
};

/** Pick tier from level difficulty. */
export function rollGnomeTier(level, rng = Math.random) {
  if (level < 4) return GNOME_TIER.NORMAL;
  const r = rng();
  if (level < 8) return r < 0.75 ? GNOME_TIER.NORMAL : GNOME_TIER.SPEED;
  if (level < 14) {
    if (r < 0.4) return GNOME_TIER.NORMAL;
    if (r < 0.65) return GNOME_TIER.SPEED;
    if (r < 0.85) return GNOME_TIER.HEAVY;
    return GNOME_TIER.ELITE;
  }
  if (r < 0.2) return GNOME_TIER.NORMAL;
  if (r < 0.45) return GNOME_TIER.SPEED;
  if (r < 0.75) return GNOME_TIER.HEAVY;
  return GNOME_TIER.ELITE;
}

export function pickProjectile(tierDef, rng = Math.random) {
  const pool = tierDef.projectiles ?? ['pot'];
  if (pool.includes('anchor') && rng() < (tierDef.anchorWeight ?? 0.3)) return 'anchor';
  if (pool.includes('phone') && rng() < (tierDef.phoneWeight ?? 0.25)) return 'phone';
  return 'pot';
}
