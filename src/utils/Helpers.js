export function mulberry32(seed) {
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (a, b) => Math.random() * (b - a) + a;
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

// Brick power-up drop ceiling — actual rate is min(this, budget / bricks left) in GameScene.
export function dropChance(level, min = 0.02, max = 0.06, rate = 0.11) {
  const t = Math.max(0, (level ?? 1) - 1);
  return Math.max(min, max * Math.exp(-rate * t));
}

/** Max brick-sourced capsules per level (dense boards use scaled per-brick chance). */
export function brickPowerDropBudget(level) {
  const lv = level ?? 1;
  if (lv % 5 === 0) return 4;
  if (lv < 6) return 2;
  return 3;
}

// Cannon fire-rate / black-hole scaling: shrinks toward `min` as level rises.
export function levelScale(level, min = 0.35, max = 1, rate = 0.3) {
  const v = max - (max - min) * (1 - Math.exp(-rate * level));
  return Math.max(min, v);
}

export function hexToCss(hex) {
  return '#' + (hex & 0xffffff).toString(16).padStart(6, '0');
}

// Tasteful, readable color blends for gradients.
export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
