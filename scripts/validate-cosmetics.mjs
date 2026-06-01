/**
 * Validate Garden Shop cosmetic ids and level generation for all equip combos.
 * Usage: node scripts/validate-cosmetics.mjs
 */
import { PADDLE_HULLS, BALL_TRAILS, GARDEN_THEMES, resolveEquippedCosmetics } from '../src/config/Cosmetics.js';
import { MetaProgress } from '../src/systems/MetaProgress.js';
import { buildLevel, validateLevel } from '../src/systems/LevelGenerator.js';
import { computeLayout, GAME } from '../src/config/Constants.js';

let failures = 0;

function fail(msg) {
  failures++;
  console.error(`FAIL: ${msg}`);
}

const bad = resolveEquippedCosmetics(
  { hull: 'invalid', trail: 'void', theme: 'neon' },
  { hull: ['wood', 'void'], trail: ['comet', 'void'], theme: ['default', 'neon'] },
);
if (bad.hull !== 'wood') fail(`bad hull fallback got ${bad.hull}`);
if (bad.trail !== 'void') fail(`bad trail should keep void when owned`);
if (bad.theme !== 'neon') fail(`bad theme should keep neon when owned`);
const unowned = resolveEquippedCosmetics({ hull: 'midnight', trail: 'void', theme: 'neon' }, { hull: ['wood'], trail: ['comet'], theme: ['default'] });
if (unowned.hull !== 'wood' || unowned.trail !== 'comet' || unowned.theme !== 'default') {
  fail(`unowned should fall back to defaults`);
}

for (const h of PADDLE_HULLS) {
  for (const t of BALL_TRAILS) {
    for (const th of GARDEN_THEMES) {
      MetaProgress.unlockCosmetic('hull', h.id);
      MetaProgress.unlockCosmetic('trail', t.id);
      MetaProgress.unlockCosmetic('theme', th.id);
      if (!MetaProgress.equipCosmetic('hull', h.id)) fail(`equip hull ${h.id}`);
      if (!MetaProgress.equipCosmetic('trail', t.id)) fail(`equip trail ${t.id}`);
      if (!MetaProgress.equipCosmetic('theme', th.id)) fail(`equip theme ${th.id}`);
      const eq = MetaProgress.getEquipped();
      if (eq.hull !== h.id || eq.trail !== t.id || eq.theme !== th.id) {
        fail(`equipped mismatch ${h.id}/${t.id}/${th.id}`);
      }
    }
  }
}

computeLayout(390, 844, { top: 0, bottom: 0, left: 0, right: 0 });
GAME.IS_PORTRAIT = true;
for (let level = 1; level <= 30; level++) {
  const { bricks, difficulty } = buildLevel(level, 42);
  const issues = validateLevel(bricks);
  if (issues.length) fail(`level ${level}: ${issues.join('; ')}`);
  if (!difficulty?.typeRolls) fail(`level ${level}: missing typeRolls`);
}

if (failures === 0) {
  const combos = PADDLE_HULLS.length * BALL_TRAILS.length * GARDEN_THEMES.length;
  console.log(`OK: ${combos} cosmetic combos, levels 1–30, 0 failures`);
} else {
  process.exit(1);
}
