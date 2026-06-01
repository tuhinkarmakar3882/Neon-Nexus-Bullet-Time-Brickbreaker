import { POWERS, POWER_KEYS, resolvePowerKey } from './PowerUps.js';
import { mulberry32 } from '../utils/Helpers.js';

const FALLBACK_KEY = 'Expand';

/** Keys that may appear in random drops (excludes fusion tier & weight 0). */
export function isDroppableKey(key) {
  const k = resolvePowerKey(key);
  const def = POWERS[k];
  if (!def || def.fusionTier) return false;
  return (def.weight ?? 0) > 0;
}

export const DROPPABLE_KEYS = POWER_KEYS.filter(isDroppableKey);
const POSITIVE_KEYS = DROPPABLE_KEYS.filter((k) => POWERS[k].polarity !== 'neg');
const NEGATIVE_KEYS = DROPPABLE_KEYS.filter((k) => POWERS[k].polarity === 'neg');

function buildWeighted(keys) {
  const pool = [];
  keys.forEach((k) => {
    const w = POWERS[k]?.weight ?? 0;
    if (w <= 0) return;
    for (let i = 0; i < w; i++) pool.push(k);
  });
  return pool.length ? pool : [FALLBACK_KEY];
}

function pickFromPool(pool, rng) {
  if (!pool.length) return FALLBACK_KEY;
  return resolvePowerKey(pool[(rng() * pool.length) | 0]);
}

function resolveBlessing(keys) {
  return (keys ?? [])
    .map((k) => resolvePowerKey(k))
    .filter((k) => isDroppableKey(k) && POWERS[k].polarity !== 'neg');
}

export function rollPower(level, seed = Date.now(), blessings = []) {
  const rng = mulberry32(seed >>> 0);
  const bless = resolveBlessing(blessings);
  if (bless.length && rng() < 0.52) {
    return pickFromPool(bless, rng);
  }
  let negWeight = 0;
  if (level >= 2) negWeight = 0.1;
  if (level >= 5) negWeight = 0.16;
  if (level >= 9) negWeight = 0.24;
  const isBoss = level % 5 === 0;

  if (rng() < negWeight && NEGATIVE_KEYS.length) {
    return pickFromPool(buildWeighted(NEGATIVE_KEYS), rng);
  }

  const posKeys = levelPositiveKeys(level);
  let pool = buildWeighted(posKeys);
  if (isBoss) pool = pool.filter((k) => POWERS[k].polarity !== 'neg');
  return pickFromPool(pool, rng);
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
  const bless = resolveBlessing(blessings);
  if (bless.length && rng() < 0.72) return pickFromPool(bless, rng);
  return rollPower(level, seed ^ 0x51ed, blessings);
}

/** Brick / gnome capsule drop (seeded negative bias scales with level in rollPower). */
export function rollBrickDropPower(level, seed = Date.now(), blessings = []) {
  return rollPower(level, seed, blessings);
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
  return pickFromPool(pool, rng);
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
