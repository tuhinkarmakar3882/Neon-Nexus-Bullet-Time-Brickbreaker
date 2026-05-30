// Curated, Arkanoid-style capsule power-ups. Tight, tactical, each with a clear
// identity, classic letter, color, and drop rarity. (Down from the original 23
// grab-bag to a focused set that reads instantly and plays well.)
//
// kind: 'timed' (occupies an active slot + expires) | 'instant' (one-shot)
// weight: relative drop frequency.

export const POWERS = {
  Laser:  { letter: 'L', color: 0xff4d4d, dur: 8000,  kind: 'timed',   weight: 12, bulletTime: false, desc: 'Paddle fires twin lasers' },
  Expand: { letter: 'E', color: 0x4d9bff, dur: 12000, kind: 'timed',   weight: 14, bulletTime: false, desc: 'Wider paddle' },
  Catch:  { letter: 'C', color: 0x4dff7a, dur: 14000, kind: 'timed',   weight: 12, bulletTime: false, desc: 'Catch & re-aim the ball' },
  Slow:   { letter: 'S', color: 0xff9f1c, dur: 12000, kind: 'timed',   weight: 12, bulletTime: false, desc: 'Slow the ball down' },
  Multi:  { letter: 'D', color: 0x2ee6e6, dur: 0,     kind: 'instant', weight: 10, bulletTime: true,  desc: 'Split into three balls' },
  Magnet: { letter: 'M', color: 0xffd23d, dur: 10000, kind: 'timed',   weight: 10, bulletTime: false, desc: 'Pull capsules toward you' },
  Shield: { letter: 'A', color: 0x66d9ff, dur: 14000, kind: 'timed',   weight: 9,  bulletTime: false, desc: 'Energy floor saves one drop' },
  Through:{ letter: 'T', color: 0xff5db1, dur: 8000,  kind: 'timed',   weight: 8,  bulletTime: true,  desc: 'Ball smashes through bricks' },
  Mega:   { letter: 'G', color: 0xffb84d, dur: 9000,  kind: 'timed',   weight: 8,  bulletTime: false, desc: 'Giant heavy ball' },
  Bomb:   { letter: 'X', color: 0xff3b3b, dur: 12000, kind: 'timed',   weight: 8,  bulletTime: false, desc: 'Explosive ball impacts' },
  Life:   { letter: 'P', color: 0xd0d6e0, dur: 0,     kind: 'instant', weight: 4,  bulletTime: false, desc: 'Extra life' },
  Warp:   { letter: 'B', color: 0xb14dff, dur: 0,     kind: 'instant', weight: 3,  bulletTime: true,  desc: 'Warp to the next level' },
};

export const POWER_KEYS = Object.keys(POWERS);

const WEIGHTED = POWER_KEYS.flatMap((k) => Array(POWERS[k].weight).fill(k));
export function rollPower() {
  return WEIGHTED[(Math.random() * WEIGHTED.length) | 0];
}

export function powerColorHex(key) {
  return '#' + (POWERS[key]?.color ?? 0xffffff).toString(16).padStart(6, '0');
}
