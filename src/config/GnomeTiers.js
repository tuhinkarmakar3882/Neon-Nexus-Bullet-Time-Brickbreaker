// Jardinains! 2 gnome variant definitions.

export const GNOME_TIER = {
  NORMAL: 'normal',
  HEAVY: 'heavy',
  SPEED: 'speed',
  ELITE: 'elite',
  SNIPER: 'sniper',
  VOLLEY: 'volley',
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
  sniper: {
    label: 'Sniper Nain',
    tint: 0x66ccaa,
    throwMin: 3800,
    throwMax: 6200,
    gravityMult: 0.85,
    climbMult: 1.1,
    throwVxSpread: 40,
    projectiles: ['pot'],
    tracking: true,
  },
  volley: {
    label: 'Volley Nain',
    tint: 0xff9966,
    throwMin: 900,
    throwMax: 1800,
    gravityMult: 0.75,
    climbMult: 0.35,
    throwVxSpread: 180,
    projectiles: ['pot'],
    tracking: false,
  },
};

/** Pick tier from level difficulty. */
export function rollGnomeTier(level, rng = Math.random) {
  if (level < 4) return GNOME_TIER.NORMAL;
  const r = rng();
  if (level < 8) return r < 0.75 ? GNOME_TIER.NORMAL : GNOME_TIER.SPEED;
  if (level < 10) {
    if (r < 0.35) return GNOME_TIER.NORMAL;
    if (r < 0.6) return GNOME_TIER.SPEED;
    if (r < 0.8) return GNOME_TIER.HEAVY;
    return GNOME_TIER.ELITE;
  }
  if (level < 14) {
    if (r < 0.28) return GNOME_TIER.NORMAL;
    if (r < 0.48) return GNOME_TIER.SPEED;
    if (r < 0.65) return GNOME_TIER.HEAVY;
    if (r < 0.82) return GNOME_TIER.ELITE;
    if (r < 0.92) return GNOME_TIER.SNIPER;
    return GNOME_TIER.VOLLEY;
  }
  if (level < 18) {
    if (r < 0.15) return GNOME_TIER.NORMAL;
    if (r < 0.32) return GNOME_TIER.SPEED;
    if (r < 0.52) return GNOME_TIER.HEAVY;
    if (r < 0.68) return GNOME_TIER.ELITE;
    if (r < 0.82) return GNOME_TIER.SNIPER;
    return GNOME_TIER.VOLLEY;
  }
  if (r < 0.1) return GNOME_TIER.NORMAL;
  if (r < 0.22) return GNOME_TIER.SPEED;
  if (r < 0.42) return GNOME_TIER.HEAVY;
  if (r < 0.58) return GNOME_TIER.ELITE;
  if (r < 0.76) return GNOME_TIER.SNIPER;
  return GNOME_TIER.VOLLEY;
}

export function pickProjectile(tierDef, rng = Math.random) {
  const pool = tierDef.projectiles ?? ['pot'];
  if (pool.includes('anchor') && rng() < (tierDef.anchorWeight ?? 0.3)) return 'anchor';
  if (pool.includes('phone') && rng() < (tierDef.phoneWeight ?? 0.25)) return 'phone';
  return 'pot';
}
