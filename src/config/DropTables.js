import { POWERS, POWER_KEYS } from './PowerUps.js';
import { mulberry32 } from '../utils/Helpers.js';

const POSITIVE_KEYS = POWER_KEYS.filter((k) => POWERS[k].polarity !== 'neg');
const NEGATIVE_KEYS = POWER_KEYS.filter((k) => POWERS[k].polarity === 'neg');

function buildWeighted(keys) {
  const pool = [];
  keys.forEach((k) => {
    const w = POWERS[k].weight || 1;
    for (let i = 0; i < w; i++) pool.push(k);
  });
  return pool.length ? pool : POSITIVE_KEYS;
}

export function rollPower(level, seed = Date.now(), blessings = []) {
  const rng = mulberry32(seed >>> 0);
  const bless = (blessings ?? []).filter((k) => POWERS[k] && POWERS[k].polarity !== 'neg');
  if (bless.length && rng() < 0.52) {
    return bless[(rng() * bless.length) | 0];
  }
  let negWeight = 0;
  if (level >= 2) negWeight = 0.1;
  if (level >= 5) negWeight = 0.16;
  if (level >= 9) negWeight = 0.24;
  const isBoss = level % 5 === 0;

  if (rng() < negWeight && NEGATIVE_KEYS.length) {
    const pool = buildWeighted(NEGATIVE_KEYS);
    return pool[(rng() * pool.length) | 0];
  }

  let posKeys = POSITIVE_KEYS.filter((k) => {
    if (level < 10 && k === 'InstantWin') return false;
    if (level < 6 && k === 'Joker') return false;
    if (level < 8 && k === 'BlackHole') return false;
    return true;
  });
  let pool = buildWeighted(posKeys);
  if (isBoss) pool = pool.filter((k) => POWERS[k].polarity !== 'neg');
  return pool[(rng() * pool.length) | 0];
}

/** Pick capsule visual variant — blessed / mystery / normal (cursed = negative polarity). */
export function rollCapsuleVariant(level, seed = Date.now()) {
  const rng = mulberry32(seed >>> 0);
  if (level < 4) return 'normal';
  const r = rng();
  if (r < 0.1) return 'mystery';
  if (r < 0.22) return 'blessed';
  return 'normal';
}

/** Blessed drops bias toward loadout blessings or any positive. */
export function rollBlessedPower(level, seed, blessings = []) {
  const rng = mulberry32(seed >>> 0);
  const bless = (blessings ?? []).filter((k) => POWERS[k] && POWERS[k].polarity !== 'neg');
  if (bless.length && rng() < 0.72) return bless[(rng() * bless.length) | 0];
  return rollPower(level, seed ^ 0x51ed, blessings);
}

/** ~15% chance any brick/gnome drop is a negative capsule (after level 2). */
export function rollBrickDropPower(level, seed = Date.now()) {
  return rollPower(level, seed);
}

function levelPositiveKeys(level) {
  return POSITIVE_KEYS.filter((k) => {
    if (level < 10 && k === 'InstantWin') return false;
    if (level < 6 && k === 'Joker') return false;
    if (level < 8 && k === 'BlackHole') return false;
    return true;
  });
}

export function rollPositivePower(level, seed = Date.now()) {
  const pool = buildWeighted(levelPositiveKeys(level));
  const rng = mulberry32(seed >>> 0);
  return pool[(rng() * pool.length) | 0];
}

/** Pick `count` distinct positive powers for meter-reward draft UI. */
export function rollPositivePowerDraft(level, seed = Date.now(), count = 3) {
  const picks = [];
  let i = 0;
  while (picks.length < count && i < 48) {
    const k = rollPositivePower(level, (seed ^ (i * 0x9e3779b1) ^ 0xabc123) >>> 0);
    if (!picks.includes(k)) picks.push(k);
    i++;
  }
  const fallback = levelPositiveKeys(level);
  while (picks.length < count && fallback.length) {
    const k = fallback[picks.length % fallback.length];
    if (!picks.includes(k)) picks.push(k);
  }
  return picks;
}

/** Pick `count` distinct powers for gnome-streak draft UI. */
export function rollPowerDraft(level, seed = Date.now(), count = 3, blessings = []) {
  return rollPositivePowerDraft(level, seed, count);
}

export { NEGATIVE_KEYS, POSITIVE_KEYS };
