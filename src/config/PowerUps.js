// Fused Jardinains + legacy Neon Nexus power catalog.
// Each power has explicit `color`, Lucide `icon`, and readable `pill` capsule label.

import { PAL, cssHex } from './Palette.js';

/** Visual stripe / chip accent by slot type */
export const CATEGORY_COLORS = {
  paddle: 0xe8b86d,
  ball: 0xd45d8c,
  env: 0x7eb87a,
  wild: 0x9b8cff,
};

export const CATEGORY_LABELS = {
  paddle: 'Paddle',
  ball: 'Ball',
  env: 'Garden',
  wild: 'Wild',
};

export const CATEGORY_ORDER = ['paddle', 'ball', 'env', 'wild'];

export const CANNON_TYPES = ['Laser', 'FireCannon', 'IceCannon', 'ShockCannon', 'NapalmCannon'];
export const BALL_MODS = [
  'ExplosiveBall', 'FrozenBall', 'ElectricBall', 'NukeBall', 'MegaBall', 'HeavyBall',
  'Teleport', 'Missile', 'Gravity', 'Echo', 'ChargeShot', 'Wrap',
];

/** Legacy save / code aliases → canonical keys */
export const POWER_ALIASES = {
  Bomb: 'ExplosiveBall',
  CannonBall: 'ElectricBall',
  FireBall: 'FireCannon',
  FrostBall: 'FrozenBall',
  Life: 'ExtraPaddle',
  Heart: 'ExtraPaddle',
  Warp: 'InstantWin',
  Velocity: 'SpeedUp',
  Chill: 'SlowDown',
  Slow: 'SlowDown',
  Multi: 'BallSplitter',
  Burst: 'BallSplitter',
  Reverse: 'Flip',
  Glue: 'Catch',
  Mega: 'MegaBall',
  Through: 'Teleport',
  Shield: 'Shield',
  Freeze: 'BrickFreeze',
};

export function resolvePowerKey(key) {
  return POWER_ALIASES[key] ?? key;
}

export function categoryColor(category) {
  return CATEGORY_COLORS[category] ?? PAL.powerPos;
}

export const POWERS = {
  // —— Paddle (Jardinains cannons + legacy utility) ——
  Laser:        { pill: 'LASER',    short: 'LS', category: 'paddle', color: 0xff5a5f, dur: 10000, kind: 'timed', weight: 12, polarity: 'pos', icon: 'zap',       cannon: 'laser',  desc: 'Twin lasers — auto-fire from paddle' },
  FireCannon:   { pill: 'FIRE',     short: 'FC', category: 'paddle', color: 0xff8a5a, dur: 9000,  kind: 'timed', weight: 8,  polarity: 'pos', icon: 'flame',     cannon: 'fire',   desc: 'Fire shots — explode on impact' },
  NapalmCannon: { pill: 'NAPALM',   short: 'NA', category: 'paddle', color: 0xff4400, dur: 8000,  kind: 'timed', weight: 5,  polarity: 'pos', icon: 'droplets',  cannon: 'napalm', desc: 'Napalm — burn bricks over time' },
  IceCannon:    { pill: 'ICE',      short: 'IC', category: 'paddle', color: 0x5aa0ff, dur: 9000,  kind: 'timed', weight: 8,  polarity: 'pos', icon: 'snowflake', cannon: 'ice',    desc: 'Ice shots — freeze targets' },
  ShockCannon:  { pill: 'SHOCK',    short: 'SK', category: 'paddle', color: 0xc084fc, dur: 9000,  kind: 'timed', weight: 7,  polarity: 'pos', icon: 'bolt',      cannon: 'shock',  desc: 'Shock bolts — bounce & zap steel' },
  Catch:        { pill: 'STICKY',   short: 'CT', category: 'paddle', color: 0x00c48c, dur: 14000, kind: 'timed', weight: 12, polarity: 'pos', icon: 'hand',      sticky: true,       desc: 'Sticky paddle — tap to release' },
  Expand:       { pill: 'WIDE',     short: 'EX', category: 'paddle', color: 0x6699ff, dur: 12000, kind: 'timed', weight: 14, polarity: 'pos', icon: 'maximize',  desc: 'Wider paddle (+35%)' },
  Reduce:       { pill: 'SHRINK',   short: 'SM', category: 'paddle', color: 0x9d4edd, dur: 8000,  kind: 'timed', weight: 5,  polarity: 'neg', icon: 'shrink',    desc: 'Shrinks paddle (−35%)' },
  FastPaddle:   { pill: 'FAST',     short: 'FP', category: 'paddle', color: 0x0077ff, dur: 10000, kind: 'timed', weight: 9,  polarity: 'pos', icon: 'gauge-up',  desc: 'Faster paddle movement' },
  SlowPaddle:   { pill: 'SLOW',     short: 'PL', category: 'paddle', color: 0xffb3c1, dur: 8000,  kind: 'timed', weight: 4,  polarity: 'neg', icon: 'gauge-down', desc: 'Slower paddle movement' },
  Flip:         { pill: 'FLIP',     short: 'RV', category: 'paddle', color: 0xc084fc, dur: 6000,  kind: 'timed', weight: 4,  polarity: 'neg', icon: 'flip',      toggle: true,       desc: 'Reversed controls — grab again to fix' },
  Magnet:       { pill: 'MAGNET',   short: 'MG', category: 'paddle', color: 0xffd93d, dur: 9000,  kind: 'timed', weight: 8,  polarity: 'pos', icon: 'magnet',    desc: 'Pulls falling power-ups toward paddle' },

  // —— Ball (Jardinains elements + legacy ball mods) ——
  ExplosiveBall: { pill: 'BLAST',   short: 'BO', category: 'ball', color: 0xff7a3d, dur: 12000, kind: 'timed', weight: 9, polarity: 'pos', icon: 'bomb',      ballMod: 'explosive', desc: '3×3 grid blast on contact' },
  NukeBall:      { pill: 'NUKE',    short: 'NK', category: 'ball', color: 0xff2244, dur: 8000,  kind: 'timed', weight: 4, polarity: 'pos', icon: 'crosshair', ballMod: 'nuke',      desc: 'Cross blast — row & column' },
  FrozenBall:    { pill: 'FROST',   short: 'FZ', category: 'ball', color: 0x1fb6ff, dur: 10000, kind: 'timed', weight: 8, polarity: 'pos', icon: 'snowflake', ballMod: 'frost',     desc: 'Freeze, shatter & spread frost' },
  ElectricBall:  { pill: 'ZAP',     short: 'EL', category: 'ball', color: 0xe0e0ff, dur: 10000, kind: 'timed', weight: 7, polarity: 'pos', icon: 'zap',       ballMod: 'electric',  desc: 'One-hit any brick — zaps gnomes' },
  MegaBall:      { pill: 'MEGA',    short: 'GB', category: 'ball', color: 0xffcc44, dur: 12000, kind: 'timed', weight: 7, polarity: 'pos', icon: 'disc',      ballMod: 'mega',      desc: 'Giant ball — 2× size, double brick damage' },
  HeavyBall:     { pill: 'HEAVY',   short: 'HV', category: 'ball', color: 0x888899, dur: 9000,  kind: 'timed', weight: 5, polarity: 'neg', icon: 'snail',     ballMod: 'heavy',     desc: 'Sluggish ball — 45% slower movement' },
  Teleport:      { pill: 'PHASE',   short: 'TP', category: 'ball', color: 0x72f2eb, dur: 8000,  kind: 'timed', weight: 6, polarity: 'pos', icon: 'ghost',     ballMod: 'teleport',  desc: 'Phases through bricks while breaking them' },
  Missile:       { pill: 'HOMING',  short: 'MS', category: 'ball', color: 0x00ff8b, dur: 7000,  kind: 'timed', weight: 6, polarity: 'pos', icon: 'rocket',    ballMod: 'missile',   desc: 'Ball curves back toward paddle' },
  Gravity:       { pill: 'GRAVITY', short: 'GR', category: 'ball', color: 0xd88bff, dur: 5000,  kind: 'timed', weight: 5, polarity: 'pos', icon: 'orbit',     ballMod: 'gravity',   desc: 'Ball arcs toward the paddle' },
  Echo:          { pill: 'ECHO',    short: 'EC', category: 'ball', color: 0xe0e0e0, dur: 8000,  kind: 'timed', weight: 5, polarity: 'pos', icon: 'radar',     ballMod: 'echo',      desc: 'Orbiting echo nodes break nearby bricks' },
  ChargeShot:    { pill: 'CHARGE',  short: 'CH', category: 'ball', color: 0xffac33, dur: 15000, kind: 'timed', weight: 6, polarity: 'pos', icon: 'crosshair', ballMod: 'charge',    desc: 'Next brick hit is an instant kill' },
  Wrap:          { pill: 'WRAP',    short: 'WR', category: 'ball', color: 0xffe156, dur: 15000, kind: 'timed', weight: 5, polarity: 'pos', icon: 'repeat',    ballMod: 'wrap',      desc: 'Ball wraps around side walls' },
  BallSplitter:  { pill: 'SPLIT',   short: '2X', category: 'ball', color: 0xff4ecd, dur: 0,     kind: 'instant', weight: 10, polarity: 'pos', icon: 'copy',    bulletTime: true,       desc: 'Doubles all active balls' },

  // —— Environment (Jardinains + legacy field effects) ——
  Earthquake:  { pill: 'QUAKE',    short: 'EQ', category: 'env', color: 0xffb24d, dur: 0,     kind: 'instant', weight: 5, polarity: 'pos', icon: 'activity',  desc: 'Knocks every gnome off their perch' },
  TimeFreeze:  { pill: 'FREEZE',   short: 'TF', category: 'env', color: 0x00ffff, dur: 5000,  kind: 'timed', weight: 6, polarity: 'pos', icon: 'snowflake', timeFreeze: true,         desc: 'Freezes gnomes mid-air for 5s' },
  SpeedUp:     { pill: 'HASTE',    short: 'SU', category: 'env', color: 0x007fff, dur: 8000,  kind: 'timed', weight: 10, polarity: 'pos', icon: 'gauge-up',  envSpeed: 1.5,           desc: 'Speeds up ball & hazards' },
  SlowDown:    { pill: 'SLOW-MO',  short: 'SD', category: 'env', color: 0x5be7c4, dur: 10000, kind: 'timed', weight: 10, polarity: 'pos', icon: 'thermometer', envSpeed: 0.5,        desc: 'Slows ball & hazards' },
  FogSight:    { pill: 'FOG',      short: 'FG', category: 'env', color: 0x667788, dur: 8000,  kind: 'timed', weight: 5, polarity: 'neg', icon: 'cloud',     fog: true,              desc: 'Thick fog — harder to see bricks & hazards' },
  GnomeRush:   { pill: 'GNOMES',   short: 'GN', category: 'env', color: 0xff4466, dur: 0,     kind: 'instant', weight: 5, polarity: 'neg', icon: 'activity',  desc: 'Instantly summons extra Jardinains' },
  ExtraPaddle: { pill: '+LIFE',    short: '+1', category: 'env', color: 0x55ff55, dur: 0,     kind: 'instant', weight: 5, polarity: 'pos', icon: 'heart',     desc: 'Extra life for this run' },
  Shield:      { pill: 'SHIELD',   short: 'SH', category: 'env', color: 0xddddff, dur: 14000, kind: 'timed', weight: 9, polarity: 'pos', icon: 'shield',    desc: 'One safety bounce at the floor' },
  InstantWin:  { pill: 'WIN',      short: 'WN', category: 'env', color: 0xff4fa3, dur: 0,     kind: 'instant', weight: 2, polarity: 'pos', icon: 'fast-forward', bulletTime: true,   desc: 'Instantly clears the level' },
  BlackHole:   { pill: 'VOID',     short: 'BH', category: 'env', color: 0xbe0000, dur: 4000,  kind: 'timed', weight: 4, polarity: 'pos', icon: 'circle-dot', blackHole: true,         desc: 'Vortex sucks in & destroys nearby bricks' },
  BrickFreeze: { pill: 'LOCK',     short: 'BF', category: 'env', color: 0x1fb6ff, dur: 10000, kind: 'timed', weight: 5, polarity: 'pos', icon: 'snowflake', brickFreeze: true,       desc: 'Freezes moving & shifting bricks' },
  Squeeze:     { pill: 'SQUEEZE',  short: 'SQ', category: 'env', color: 0xff4500, dur: 5000,  kind: 'timed', weight: 4, polarity: 'pos', icon: 'minimize',  squeeze: true,             desc: 'All bricks shrink to 70% size' },
  Shuffle:     { pill: 'MIX',      short: 'SF', category: 'env', color: 0xff8800, dur: 0,     kind: 'instant', weight: 3, polarity: 'pos', icon: 'shuffle',   desc: 'Re-rolls every brick type' },
  Joker:       { pill: 'WILD',     short: 'JK', category: 'wild', color: 0xa3ff12, dur: 0,     kind: 'instant', weight: 4, polarity: 'wild', icon: 'sparkles', joker: true,            desc: 'Applies a random other power-up' },

  // —— Fusion tier II (duplicate pickup upgrades) ——
  LaserII:       { pill: 'LASER II', short: 'L2', category: 'paddle', color: 0xff3355, dur: 14000, kind: 'timed', weight: 0, polarity: 'pos', icon: 'zap',       cannon: 'laser',  fusionTier: 2, laserWidth: 1.6, desc: 'Laser II — wider twin beams' },
  SuperCatch:    { pill: 'SUPER GLUE', short: 'SG', category: 'paddle', color: 0x00e8a8, dur: 18000, kind: 'timed', weight: 0, polarity: 'pos', icon: 'hand',      sticky: true, fusionTier: 2, desc: 'Super glue — long sticky catch' },
  WideGarden:    { pill: 'WIDE II',  short: 'WG', category: 'paddle', color: 0x4488ff, dur: 14000, kind: 'timed', weight: 0, polarity: 'pos', icon: 'maximize', expandMult: 1.55, fusionTier: 2, desc: 'Wide Garden — +55% paddle width' },
  ElectricBallII:{ pill: 'ZAP II',   short: 'E2', category: 'ball',   color: 0xffffff, dur: 12000, kind: 'timed', weight: 0, polarity: 'pos', icon: 'zap',       ballMod: 'electric', fusionTier: 2, desc: 'Electric II — chain zaps nearby bricks' },
  ShieldII:      { pill: 'SHIELD II', short: 'S2', category: 'env',    color: 0xffffff, dur: 18000, kind: 'timed', weight: 0, polarity: 'pos', icon: 'shield',    shieldHits: 2, fusionTier: 2, desc: 'Shield II — two safety bounces' },
};

export const WEAPON_KEYS = [...CANNON_TYPES, ...BALL_MODS];
export const POWER_KEYS = Object.keys(POWERS);

export function powerFillColor(key) {
  const k = resolvePowerKey(key);
  const def = POWERS[k];
  if (!def) return PAL.powerPos;
  if (def.color != null) return def.color;
  if (def.polarity === 'neg') return PAL.powerNeg;
  if (def.polarity === 'wild') return PAL.powerWild;
  return PAL.powerPos;
}

export function polarityColor(polarity) {
  if (polarity === 'neg') return PAL.powerNeg;
  if (polarity === 'wild') return PAL.powerWild;
  return PAL.powerPos;
}

export function powerColorHex(key) {
  return cssHex(powerFillColor(key));
}

export function polarityCss(polarity) {
  return cssHex(polarityColor(polarity));
}

/** Icon tint on colored capsule — always high-contrast white */
export function powerIconTint() {
  return 0xffffff;
}

/** Text on colored capsule badge */
export function powerBadgeTextColor(polarity) {
  if (polarity === 'neg' || polarity === 'wild') return '#ffffff';
  return '#05060a';
}

export function powerDisplayName(key) {
  const k = resolvePowerKey(key);
  return k.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
}

/** Readable capsule label (no cryptic abbreviations). */
export function powerPillLabel(key) {
  const k = resolvePowerKey(key);
  const def = POWERS[k];
  if (def?.pill) return def.pill;
  const words = powerDisplayName(k).split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 10);
  return `${words[0]} ${words[1] ?? ''}`.trim().slice(0, 12);
}
