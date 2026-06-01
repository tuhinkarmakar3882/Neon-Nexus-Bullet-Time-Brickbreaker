/**
 * Stress-test level generation for softlock / invalid layout edge cases.
 * Usage: node scripts/validate-levels.mjs
 */
import {
  buildLevel,
  validateLevel,
  validateBricksInViewport,
  getPlayfieldBrickBounds,
} from '../src/systems/LevelGenerator.js';
import { BRICK, GAME, computeLayout, playfieldSideInset } from '../src/config/Constants.js';

const MAX_LEVEL = 50;
const SEEDS_PER_LEVEL = 120;
const CAMPAIGN_SEEDS = [12345, 67890, 0xdeadbeef, 0xcafebabe];
const VIEWPORTS = [
  { w: 390, h: 844, label: 'mobile', domHud: true },
  { w: 1280, h: 720, label: 'desktop', domHud: false },
];

let failures = 0;
const issueCounts = new Map();
let sparseLayouts = 0;
let totalLayouts = 0;
let viewportFailures = 0;
const layoutFingerprints = new Map();
let duplicateLayouts = 0;

function layoutFromBuild(bricks) {
  if (!bricks.length) return null;
  const bw = bricks[0].w;
  const bh = bricks[0].h;
  const arenaLeft = playfieldSideInset();
  const top = Math.min(...bricks.map((b) => b.y));
  const cols = Math.max(6, Math.floor(
    (GAME.WIDTH - playfieldSideInset() * 2 + BRICK.GAP) / (bw + BRICK.GAP),
  ));
  return { bw, bh, arenaLeft, top, cols };
}

for (const vp of VIEWPORTS) {
  GAME.USE_DOM_HUD = vp.domHud;
  computeLayout(vp.w, vp.h, { top: 0, bottom: 0, left: 0, right: 0 });
  GAME.IS_PORTRAIT = vp.w / vp.h < 0.82;

  for (const campaignSeed of CAMPAIGN_SEEDS) {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (let i = 0; i < SEEDS_PER_LEVEL; i++) {
        const seed = (campaignSeed + i * 7919) >>> 0;
        const data = buildLevel(level, seed);
        const layout = layoutFromBuild(data.bricks);
        const cannonsOnly = data.mutators?.includes('CannonsOnly') ?? false;
        totalLayouts++;
        const minBricks = Math.max(14, (layout?.cols ?? 6) * 2);
        if (data.bricks.length < minBricks) sparseLayouts++;

        const bounds = getPlayfieldBrickBounds();
        const viewport = validateBricksInViewport(data.bricks, bounds);
        const result = validateLevel(data.bricks, {
          layout,
          cannonsOnly,
          isBoss: data.isBoss,
          goal: data.goal,
        });
        const fp = data.bricks
          .map((b) => `${b.zoneRow ?? -1}:${b.col ?? -1}:${b.type}`)
          .sort()
          .join('|');
        const fpKey = `${vp.label}:L${level}:${fp}`;
        if (layoutFingerprints.has(fpKey)) duplicateLayouts++;
        else layoutFingerprints.set(fpKey, seed);

        if (viewport.valid && result.valid) continue;

        if (!viewport.valid) viewportFailures++;
        failures++;
        const issues = [...new Set([...viewport.issues, ...result.issues])];
        for (const issue of issues) {
          issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
        }
        if (failures <= 8) {
          console.error(
            `FAIL [${vp.label}] L${level} seed=${seed} mutators=${data.mutators?.join(',')} issues=${issues.join(',')}`,
          );
        }
      }
    }
  }
}

const total = totalLayouts;
console.log(`Validated ${total} levels (${VIEWPORTS.length} viewports × ${MAX_LEVEL} levels × ${SEEDS_PER_LEVEL} seeds × ${CAMPAIGN_SEEDS.length} campaigns)`);
console.log(`Sparse layouts (< min brick target): ${sparseLayouts} / ${totalLayouts}`);
console.log(`Viewport violations: ${viewportFailures}`);
console.log(`Duplicate layout fingerprints (same level+shape): ${duplicateLayouts}`);
if (failures) {
  console.error(`${failures} invalid layouts:`);
  for (const [issue, count] of [...issueCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.error(`  ${issue}: ${count}`);
  }
  process.exit(1);
}
console.log('All levels passed validation.');
