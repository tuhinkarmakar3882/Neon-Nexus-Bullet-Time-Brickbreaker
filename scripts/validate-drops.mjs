/**
 * Validate power-up drop tables — no fusion tier in rolls, all keys resolve.
 * Usage: node scripts/validate-drops.mjs
 */
import { POWERS } from '../src/config/PowerUps.js';
import {
  rollPower,
  rollPositivePower,
  rollPositivePowerDraft,
  rollBlessedPower,
  isDroppableKey,
  DROPPABLE_KEYS,
} from '../src/config/DropTables.js';

let failures = 0;

function fail(msg) {
  failures++;
  console.error(`FAIL: ${msg}`);
}

const fusionInPool = DROPPABLE_KEYS.filter((k) => POWERS[k].fusionTier);
if (fusionInPool.length) {
  fail(`fusion keys in droppable pool: ${fusionInPool.join(', ')}`);
}

const zeroWeightInPool = DROPPABLE_KEYS.filter((k) => (POWERS[k].weight ?? 0) <= 0);
if (zeroWeightInPool.length) {
  fail(`zero-weight keys in droppable pool: ${zeroWeightInPool.join(', ')}`);
}

const ROLLS = 12000;
const levels = [1, 3, 5, 8, 12, 20, 50];

for (const level of levels) {
  for (let i = 0; i < ROLLS / levels.length; i++) {
    const seed = (level * 9973 + i * 2654435761) >>> 0;
    for (const key of [
      rollPower(level, seed),
      rollPositivePower(level, seed ^ 0xabc),
      rollBlessedPower(level, seed ^ 0xdef, ['Laser', 'Missile']),
    ]) {
      if (!POWERS[key]) fail(`invalid key "${key}" at level ${level}`);
      if (!isDroppableKey(key)) fail(`non-droppable key "${key}" rolled at level ${level}`);
      if (POWERS[key].fusionTier) fail(`fusion key "${key}" rolled at level ${level}`);
    }
    const draft = rollPositivePowerDraft(level, seed, 3);
    if (draft.length !== 3) fail(`draft length ${draft.length} at level ${level}`);
    draft.forEach((k) => {
      if (!isDroppableKey(k)) fail(`draft picked non-droppable "${k}"`);
    });
  }
}

if (failures === 0) {
  console.log(`OK: ${DROPPABLE_KEYS.length} droppable powers, ${ROLLS} rolls, 0 failures`);
} else {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
