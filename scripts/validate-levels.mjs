/**
 * Stress-test level generation for softlock / invalid layout edge cases.
 * Usage: node scripts/validate-levels.mjs
 */
import { buildLevel, validateLevel } from '../src/systems/LevelGenerator.js';
import { BRICK, GAME } from '../src/config/Constants.js';

const MAX_LEVEL = 50;
const SEEDS_PER_LEVEL = 200;
const CAMPAIGN_SEEDS = [12345, 67890, 0xdeadbeef, 0xcafebabe];

let failures = 0;
const issueCounts = new Map();

function layoutFromBuild(bricks) {
  if (!bricks.length) return null;
  const bw = bricks[0].w;
  const bh = bricks[0].h;
  const arenaLeft = GAME.WALL_X + BRICK.GAP;
  const top = Math.min(...bricks.map((b) => b.y));
  const cols = Math.max(6, Math.floor(
    (GAME.WIDTH - GAME.WALL_X * 2 - BRICK.GAP * 2 + BRICK.GAP) / (bw + BRICK.GAP),
  ));
  return { bw, bh, arenaLeft, top, cols };
}

for (const campaignSeed of CAMPAIGN_SEEDS) {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    for (let i = 0; i < SEEDS_PER_LEVEL; i++) {
      const seed = (campaignSeed + i * 7919) >>> 0;
      const data = buildLevel(level, seed);
      const layout = layoutFromBuild(data.bricks);
      const cannonsOnly = data.mutators?.includes('CannonsOnly') ?? false;
      const result = validateLevel(data.bricks, {
        layout,
        cannonsOnly,
        isBoss: data.isBoss,
        goal: data.goal,
      });
      if (result.valid) continue;
      failures++;
      for (const issue of result.issues) {
        issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
      }
      if (failures <= 8) {
        console.error(`FAIL L${level} seed=${seed} mutators=${data.mutators?.join(',')} issues=${result.issues.join(',')}`);
      }
    }
  }
}

const total = MAX_LEVEL * SEEDS_PER_LEVEL * CAMPAIGN_SEEDS.length;
console.log(`Validated ${total} levels (${MAX_LEVEL} levels × ${SEEDS_PER_LEVEL} seeds × ${CAMPAIGN_SEEDS.length} campaigns)`);
if (failures) {
  console.error(`${failures} invalid layouts:`);
  for (const [issue, count] of [...issueCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.error(`  ${issue}: ${count}`);
  }
  process.exit(1);
}
console.log('All levels passed validation.');
