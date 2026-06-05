import { GAME, BRICK, JARDINAIN, playfieldSideInset, playfieldLayoutScale, isCompactLayout } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { themeForLevel } from '../config/Themes.js';
import { pickLevelGoal } from '../config/LevelGoals.js';
import { difficultyFor, levelBrickRows } from '../systems/DifficultyScaler.js';
import { clamp, mulberry32 } from '../utils/Helpers.js';
import { Noise } from '../utils/noise.js';

/** Level mutators — applied by ChallengeSystem on level start. */
export const MUTATORS = [
  'FastBall', 'LowVisibility', 'DoubleJardinains', 'NarrowArena',
  'WideArena', 'GnomeSwarm', 'BrickFrenzy', 'HeavyGravity',
  'PotMonsoon', 'GlassFloor', 'CannonsOnly', 'GnomeParliament', 'BrickBloom',
];

const PATTERN_DEFS = [
  { id: 'blend', minLevel: 1, weight: 11 },
  { id: 'wave', minLevel: 1, weight: 10 },
  { id: 'perlin', minLevel: 1, weight: 10 },
  { id: 'emoji', minLevel: 1, weight: 9 },
  { id: 'circle', minLevel: 1, weight: 9 },
  { id: 'diamond', minLevel: 1, weight: 8 },
  { id: 'zigzag', minLevel: 1, weight: 8 },
  { id: 'chevron', minLevel: 2, weight: 8 },
  { id: 'staircase', minLevel: 2, weight: 7 },
  { id: 'spiral', minLevel: 3, weight: 7 },
  { id: 'tunnel', minLevel: 3, weight: 6 },
  { id: 'split', minLevel: 3, weight: 7 },
  { id: 'ring', minLevel: 4, weight: 5 },
  { id: 'scatter', minLevel: 4, weight: 4 },
  { id: 'braid', minLevel: 4, weight: 7 },
  { id: 'grid', minLevel: 1, weight: 4 },
  { id: 'rows', minLevel: 1, weight: 2 },
  { id: 'checker', minLevel: 1, weight: 3 },
  { id: 'pyramid', minLevel: 1, weight: 6 },
  { id: 'towers', minLevel: 5, weight: 6 },
  { id: 'frame', minLevel: 5, weight: 5 },
  { id: 'cascade', minLevel: 6, weight: 6 },
  { id: 'hive', minLevel: 6, weight: 6 },
  { id: 'islands', minLevel: 7, weight: 4 },
  { id: 'gauntlet', minLevel: 8, weight: 5 },
  { id: 'arch', minLevel: 4, weight: 4 },
  { id: 'cross', minLevel: 6, weight: 4 },
  { id: 'columns', minLevel: 1, weight: 5 },
  { id: 'bulwark', minLevel: 9, weight: 4 },
  { id: 'fortress', minLevel: 8, weight: 3 },
  { id: 'fortressRing', minLevel: 10, weight: 3 },
  { id: 'fortressSplit', minLevel: 12, weight: 2 },
];

/** 8-wide bitmask glyphs — centered in each zone (heart, star, bolt, smile, …). */
const EMOJI_GLYPHS = {
  heart: ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000'],
  star: ['00101000', '01111110', '11111111', '01111110', '11111111', '00101000'],
  bolt: ['00111000', '01111000', '11111000', '01111100', '00011110', '00001111'],
  smile: ['01111110', '11000011', '10100101', '10000001', '10100101', '01111110'],
  moon: ['00011000', '00111100', '01111110', '01111110', '00111100', '00011000'],
  skull: ['01111110', '11000011', '10111101', '10111101', '01111110', '00100100'],
};

const HYBRID_MIXER_IDS = ['blend', 'wave', 'perlin', 'emoji', 'circle', 'diamond', 'zigzag', 'chevron'];

/** Row/col/grid family — each zone rolls flush vs gapped pack (see pickLatticePackProfile). */
const LATTICE_PATTERNS = new Set(['rows', 'columns', 'checker', 'grid']);

const BORING_PATTERNS = new Set();

/** High-complexity silhouettes — weighted heavily in zone planning. */
const COMPLEX_PATTERNS = new Set([
  'blend', 'wave', 'perlin', 'emoji', 'circle', 'diamond', 'chevron', 'staircase', 'spiral',
  'gauntlet', 'hive', 'cascade', 'braid', 'split', 'zigzag', 'scatter', 'islands', 'arch',
  'tunnel', 'ring', 'cross', 'pyramid', 'towers', 'frame',
]);

/**
 * Level identity arcs — each level commits to a creative direction; zones pull from
 * different families so consecutive levels and zones diverge sharply.
 */
const LEVEL_ARC_POOLS = {
  organicStorm: ['blend', 'wave', 'perlin', 'emoji', 'scatter', 'islands', 'zigzag', 'circle'],
  sculptural: ['diamond', 'pyramid', 'chevron', 'circle', 'spiral', 'staircase', 'hive', 'cascade'],
  structural: ['arch', 'tunnel', 'gauntlet', 'ring', 'cross', 'split', 'towers', 'frame'],
  latticeMosaic: ['grid', 'checker', 'columns', 'braid', 'rows'],
  chaosTapestry: ['blend', 'perlin', 'emoji', 'diamond', 'tunnel', 'wave', 'spiral', 'braid', 'gauntlet'],
  verticalDrama: ['pyramid', 'cascade', 'staircase', 'towers', 'spiral', 'chevron', 'hive', 'frame'],
};

const LEVEL_ARC_LABELS = {
  organicStorm: 'ORGANIC',
  sculptural: 'SCULPT',
  structural: 'STRUCT',
  latticeMosaic: 'MOSAIC',
  chaosTapestry: 'CHAOS',
  verticalDrama: 'DRAMA',
};

/** Pace → preferred layout arcs (hybrid zone planning). */
const PACE_ARC_BIAS = {
  siege: ['structural', 'latticeMosaic', 'verticalDrama'],
  standard: ['organicStorm', 'sculptural', 'chaosTapestry'],
  blitz: ['organicStorm', 'chaosTapestry', 'sculptural'],
};

/** Per-zone lattice pack: flush = zero holes; others = structured or noisy gaps. */
const LATTICE_PACK_MODES = ['flush', 'swiss', 'checker', 'columns', 'rowLanes', 'perlinMesh', 'woven'];
/** Gapped modes dominate early levels; flush is rare until mid-game. */
const LATTICE_PACK_MODES_EARLY = ['swiss', 'checker', 'columns', 'rowLanes', 'perlinMesh', 'woven'];
const LATTICE_PACK_FILL = {
  flush: 0.9,
  swiss: 0.72,
  checker: 0.48,
  columns: 0.62,
  rowLanes: 0.68,
  perlinMesh: 0.74,
  woven: 0.66,
};

/** Layout families — zones pick from different groups so multi-zone levels feel distinct. */
const PATTERN_GROUPS = {
  dense: ['rows', 'pyramid', 'frame', 'fortress', 'fortressRing', 'fortressSplit', 'hive', 'cascade', 'bulwark', 'grid'],
  lattice: ['checker', 'columns', 'diamond', 'cross', 'ring', 'split', 'braid'],
  organic: ['blend', 'scatter', 'islands', 'perlin', 'wave', 'emoji', 'circle', 'zigzag', 'chevron'],
  structural: ['arch', 'tunnel', 'staircase', 'towers', 'spiral', 'gauntlet'],
};

const SPARSE_PATTERN_IDS = new Set(['scatter', 'islands']);

/** Patterns that keep intentional voids (arches, tunnels, rings, …). */
const VOID_PATTERNS = new Set(['arch', 'tunnel', 'cross', 'ring']);

/**
 * Target brick count per hybrid zone (pattern pass + gap pack).
 * Non-void zones pack flush grid cells (BRICK.GAP = 0) to this fill — density comes from
 * stacked hybrid zones, not fortress-only walls.
 */
const PATTERN_FILL_TARGET = {
  rows: 1,
  pyramid: 0.99,
  frame: 0.99,
  fortress: 0.99,
  fortressRing: 0.98,
  fortressSplit: 0.97,
  hive: 0.98,
  cascade: 0.98,
  bulwark: 0.98,
  checker: 0.98,
  columns: 0.98,
  diamond: 0.98,
  braid: 0.98,
  chevron: 0.98,
  arch: 0.78,
  tunnel: 0.8,
  cross: 0.72,
  split: 0.98,
  blend: 0.86,
  wave: 0.84,
  emoji: 0.82,
  circle: 0.8,
  scatter: 0.78,
  islands: 0.76,
  perlin: 0.85,
  grid: 0.8,
  ring: 0.8,
  zigzag: 0.98,
  staircase: 0.98,
  towers: 0.98,
  spiral: 0.97,
  gauntlet: 0.97,
};

/** Default pack target for hybrid zones (non-void). */
const HYBRID_ZONE_FILL = 0.88;

/** Brick wall height as a fraction of the playable band — every level varies within this band. */
const VERTICAL_REACH_MIN = 0.65;
const VERTICAL_REACH_MAX = 0.85;

const TWISTS = [
  { id: 'none', minLevel: 1, weight: 10 },
  { id: 'mirrored', minLevel: 3, weight: 4 },
  { id: 'sparse', minLevel: 14, weight: 1 },
  { id: 'explosiveCore', minLevel: 6, weight: 4 },
  { id: 'goldVein', minLevel: 5, weight: 3 },
  { id: 'shiftingBand', minLevel: 8, weight: 4 },
  { id: 'nestCluster', minLevel: 9, weight: 3 },
];

const TWIST_LABELS = {
  mirrored: 'MIRRORED',
  sparse: 'SPARSE',
  explosiveCore: 'BLAST CORE',
  goldVein: 'GOLD VEIN',
  shiftingBand: 'SHIFT WALL',
  nestCluster: 'NEST SWARM',
};

/** Portrait phones, tablets, and narrow playfields need denser brick walls. */
/** Rows that fit between header and paddle without clipping. */
function maxRowsForArena(top, bh) {
  const gap = BRICK.GAP;
  const bottom = (GAME.ARENA_FLOOR ?? GAME.HEIGHT) - gap * 2;
  return Math.max(6, Math.floor((bottom - top + gap) / (bh + gap)));
}

/** Max rows so the brick wall height ≤ `reach` × playable band (rest is open air above paddle). */
function maxRowsForVerticalReach(top, bh, reach = 0.75) {
  const gap = BRICK.GAP;
  const bottom = (GAME.ARENA_FLOOR ?? GAME.HEIGHT) - gap * 2;
  const playableH = Math.max(bh * 4, bottom - top);
  const maxWallH = playableH * clamp(reach, VERTICAL_REACH_MIN, VERTICAL_REACH_MAX);
  return Math.max(4, Math.floor(maxWallH / (bh + gap)));
}

/**
 * Per-level wall height in [65%, 85%] of the playable band.
 * Early levels cluster toward the low end; later levels can span the full band.
 */
function verticalReachForLevel(level, isBoss, levelSeed = 0) {
  const hash = ((levelSeed ^ level * 7919 ^ (level * 2654435761 >>> 0)) >>> 0) % 1000 / 1000;
  const progress = clamp((level - 1) / 24, 0, 1);
  const high = VERTICAL_REACH_MIN + (VERTICAL_REACH_MAX - VERTICAL_REACH_MIN) * (0.22 + progress * 0.78);
  let reach = VERTICAL_REACH_MIN + (high - VERTICAL_REACH_MIN) * hash;
  if (isBoss) reach = Math.min(VERTICAL_REACH_MAX, reach + 0.05);
  return clamp(reach, VERTICAL_REACH_MIN, VERTICAL_REACH_MAX);
}

/** Global cap on gap-pack density — jitters per level seed so density differs run-to-run. */
function levelPackDensity(level, levelSeed = 0) {
  let base = 0.78;
  if (level <= 4) base = 0.76;
  else if (level <= 10) base = 0.82;
  else if (level <= 18) base = 0.86;
  else base = 0.9;
  const jitter = (((levelSeed >>> 10) % 17) - 8) / 100;
  return clamp(base + jitter, 0.68, 0.92);
}

function pickLevelArc(level, campaignSeed, levelSeed, paceLabel = 'standard') {
  const keys = Object.keys(LEVEL_ARC_POOLS);
  const roll = ((campaignSeed >>> 0) ^ (levelSeed >>> 0) ^ level * 131) >>> 0;
  const bias = PACE_ARC_BIAS[paceLabel] ?? PACE_ARC_BIAS.standard;
  if (roll % 100 < 58) {
    const pick = bias[roll % bias.length];
    if (LEVEL_ARC_POOLS[pick]) return pick;
  }
  return keys[roll % keys.length];
}

/** Zone count varies by campaign + level so layout height/depth differs a lot. */
function pickLevelZoneCount(level, campaignSeed, baseCount, rng) {
  const roll = rng();
  let n = baseCount;
  if (level <= 10) n = baseCount + (roll < 0.35 ? 1 : 0);
  else n = baseCount + (roll < 0.38 ? 1 : roll < 0.08 ? -1 : 0);
  const parity = ((campaignSeed + level * 31) >>> 0) & 1;
  if (parity && n < 4) n += 1;
  const minZones = isCompactLayout() && level <= 20 ? 2 : 3;
  return clamp(n, minZones, 4);
}

/**
 * Brick grid that always fits inside [arenaLeft, arenaRight] — never overflows the canvas.
 * @returns {{ cols: number, bw: number, bh: number, gap: number, gridW: number, gridLeft: number, gridRight: number }}
 */
function fitBrickLayout(arenaLeft, arenaRight) {
  const gap = BRICK.GAP;
  const bh = BRICK.HEIGHT;
  const arenaW = Math.max(80, arenaRight - arenaLeft);
  const maxBw = BRICK.WIDTH;
  const minBrickW = Math.round(maxBw * (isCompactLayout() ? 0.54 : 0.62));
  const screen = playfieldLayoutScale();
  const minCols = isCompactLayout() ? 6 : Math.round(clamp(6, 5, 7));
  const maxCols = isCompactLayout()
    ? Math.round(clamp(6 + screen * 3.6, 7, 11))
    : Math.round(clamp(8 + screen * 5.5, 10, 16));

  let cols = clamp(
    Math.floor((arenaW + gap) / (minBrickW + gap)),
    minCols,
    maxCols,
  );
  let bw = (arenaW - (cols - 1) * gap) / cols;
  while (cols > minCols && bw < maxBw * 0.88) {
    cols -= 1;
    bw = (arenaW - (cols - 1) * gap) / cols;
  }
  bw = Math.min(maxBw, bw);

  const gridW = cols * bw + (cols - 1) * gap;
  const gridLeft = arenaLeft + Math.max(0, (arenaW - gridW) * 0.5);
  const gridRight = gridLeft + gridW;
  return { cols, bw, bh, gap, gridW, gridLeft, gridRight };
}

/** Playable brick band — header to paddle floor, full playfield width. */
export function getPlayfieldBrickBounds() {
  const side = playfieldSideInset();
  return {
    left: side,
    right: GAME.WIDTH - side,
    top: GAME.WALL_TOP + BRICK.GAP * 2,
    bottom: (GAME.ARENA_FLOOR ?? GAME.HEIGHT) - BRICK.GAP * 2,
  };
}

function brickMotionExtent(b) {
  const amp = (b.moving || b.type === 'shifting') ? (b.moveAmp ?? 0) : 0;
  return {
    minX: b.x - amp,
    maxX: b.x + b.w + amp,
    minY: b.y,
    maxY: b.y + b.h,
  };
}

/** Drop or trim bricks that spill past the playable band (twists / moving bricks). */
function clampBricksInArena(bricks, bounds = null) {
  const { left, right, top, bottom } = bounds ?? getPlayfieldBrickBounds();
  for (let i = bricks.length - 1; i >= 0; i--) {
    const b = bricks[i];
    const ext = brickMotionExtent(b);
    if (ext.minX < left - 0.5 || ext.maxX > right + 0.5 || ext.minY < top - 0.5 || ext.maxY > bottom + 0.5) {
      const fitsStatic = b.x >= left - 0.5 && b.x + b.w <= right + 0.5
        && b.y >= top - 0.5 && b.y + b.h <= bottom + 0.5;
      if (fitsStatic) {
        const cx = b.x + b.w / 2;
        const maxAmp = Math.max(0, Math.min(cx - left - b.w * 0.05, right - cx - b.w * 0.05));
        b.moveAmp = Math.min(b.moveAmp ?? 0, maxAmp);
        const ext2 = brickMotionExtent(b);
        if (ext2.minX >= left - 0.5 && ext2.maxX <= right + 0.5) continue;
      }
      bricks.splice(i, 1);
      continue;
    }
    const cx = b.x + b.w / 2;
    const maxAmp = Math.max(0, Math.min(cx - left - b.w * 0.05, right - cx - b.w * 0.05));
    if ((b.moveAmp ?? 0) > maxAmp) b.moveAmp = maxAmp;
  }
}

/** Remove stacked bricks on the same grid cell (pack + pattern overlap). */
function dedupeBrickCells(bricks) {
  const seen = new Map();
  for (let i = bricks.length - 1; i >= 0; i--) {
    const b = bricks[i];
    const gr = b.zoneRow;
    const gc = b.col;
    if (gr == null || gc == null) continue;
    const key = `${gr},${gc}`;
    if (seen.has(key)) {
      bricks.splice(i, 1);
    } else {
      seen.set(key, true);
    }
  }
}

/** Exported — every brick (incl. motion) must stay inside the playfield. */
export function validateBricksInViewport(bricks, bounds = null) {
  const b = bounds ?? getPlayfieldBrickBounds();
  const issues = [];
  if (!bricks?.length) {
    issues.push('empty');
    return { valid: false, issues };
  }
  for (const brick of bricks) {
    const ext = brickMotionExtent(brick);
    if (ext.minX < b.left - 0.5 || ext.maxX > b.right + 0.5) issues.push('horizontal_overflow');
    if (ext.minY < b.top - 0.5 || ext.maxY > b.bottom + 0.5) issues.push('vertical_overflow');
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

export function buildLevel(level, campaignSeed = 12345) {
  const diff = difficultyFor(level);
  const levelSeed = (campaignSeed + level * 997) >>> 0;
  const rng = mulberry32(levelSeed);
  const noise = new Noise(levelSeed ^ 0xabc123);
  const theme = themeForLevel(level, levelSeed);
  const isBoss = level % GAME.BOSS_EVERY === 0;

  const side = playfieldSideInset();
  const arenaLeft = side;
  const arenaRight = GAME.WIDTH - side;
  const top = GAME.WALL_TOP + BRICK.GAP * 2;

  const { cols, bw, bh, gridLeft, gridRight } = fitBrickLayout(arenaLeft, arenaRight);
  const arenaMaxRows = maxRowsForArena(top, bh);
  const verticalReach = verticalReachForLevel(level, isBoss, levelSeed);
  const reachRowCap = maxRowsForVerticalReach(top, bh, verticalReach);
  const rowCap = Math.min(diff.layoutMaxRows, arenaMaxRows, reachRowCap);

  const paceRoll = rng();
  const paceLabel = paceRoll < 0.28 ? 'siege' : paceRoll < 0.72 ? 'standard' : 'blitz';
  let paceRowMult = paceLabel === 'siege' ? 1.1 : paceLabel === 'blitz' ? 0.92 : 1;
  if (level <= 10) paceRowMult = Math.min(paceRowMult, isCompactLayout() ? 1.04 : 1.02);
  const hpPaceMult = paceLabel === 'siege' ? 1.14 : paceLabel === 'blitz' ? 0.92 : 1;
  diff.brickHpPaceMult = hpPaceMult;

  const minRows = isCompactLayout() ? (level <= 4 ? 5 : 6) : (level <= 4 ? 4 : 5);
  let totalRows = levelBrickRows(level, diff, isBoss, rowCap);
  totalRows = clamp(Math.round(totalRows * paceRowMult), minRows, rowCap);

  const bottom = (GAME.ARENA_FLOOR ?? GAME.HEIGHT) - BRICK.GAP * 2;
  const maxWallH = (bottom - top) * verticalReach;
  let rowMetrics = buildRowMetrics(totalRows, bw, bh, top, levelSeed, maxWallH, campaignSeed);
  totalRows = rowMetrics.length;
  const arenaW = gridRight - gridLeft;

  const screenFill = playfieldLayoutScale();
  const fillDensity = Math.min(
    1,
    (diff.patternDensity + diff.layoutDensityBoost * 0.4) * clamp(0.94 + (screenFill - 1) * 0.1, 0.94, 1.06),
  );

  const twist = isBoss ? 'none' : pickWeighted(TWISTS.filter((t) => level >= t.minLevel), rng);
  const mutators = pickMutators(level, rng, diff, isBoss);
  const mutator = mutators[0] ?? null;
  const gravityScale = pickGravity(level, rng, twist, diff);
  const goal = pickLevelGoal(level, levelSeed, isBoss);

  const typeRolls = diff.typeRolls;
  let nestBudget = Math.min(diff.gnomeMaxAlive, diff.nestBudget);

  const bricks = [];
  const patternNames = [];

  if (isBoss) {
    const variant = ['fortress', 'fortressRing', 'fortressSplit'][Math.floor(rng() * 3)];
    patternNames.push(variant.toUpperCase());
    fillZone(bricks, {
      pattern: variant, zoneRows: totalRows, rowOffset: 0, cols, bw, bh,
      arenaLeft: gridLeft, arenaW, top, level, levelSeed, noise, rng, diff, theme, typeRolls,
      nestBudget, isBoss: true, bossPlaced: { v: false },
      fillDensity,
      sparsePatternBoost: diff.sparsePatternBoost,
      level,
      hpPaceMult,
      rowMetrics,
    });
    packZoneGaps(bricks, {
      pattern: variant, zoneRows: totalRows, rowOffset: 0, cols, bw, bh,
      arenaLeft: gridLeft, arenaW, top, level, levelSeed, noise, theme, rng, diff,
      rowMetrics,
    });
  } else {
    const layoutArc = pickLevelArc(level, campaignSeed, levelSeed, paceLabel);
    const zoneCount = Math.min(
      pickLevelZoneCount(level, campaignSeed, diff.zoneCount, rng),
      Math.max(2, Math.floor(totalRows / 2)),
    );
    const zoneRows = splitRows(totalRows, zoneCount, rng, { layoutArc, paceLabel });
    const zonePatterns = pickZonePatterns(level, levelSeed, zoneCount, rng, campaignSeed, layoutArc, paceLabel);
    patternNames.push(LEVEL_ARC_LABELS[layoutArc] ?? layoutArc.toUpperCase());
    let rowOffset = 0;
    for (let z = 0; z < zoneCount; z++) {
      const pattern = zonePatterns[z];
      patternNames.push(pattern.toUpperCase());
      const budgetSlice = Math.ceil(nestBudget / (zoneCount - z));
      const zoneSeed = (levelSeed + z * 1337 + pattern.length * 97 + (campaignSeed >>> 0) * 17) >>> 0;
      const layoutVariant = (levelSeed + z * 41 + level * 13) & 7;
      const latticePack = pickLatticePackProfile(pattern, zoneSeed, level, layoutVariant, z);
      if (latticePack) {
        patternNames[patternNames.length - 1] = `${pattern.toUpperCase()}·${latticePack.mode.toUpperCase()}`;
      }
      fillZone(bricks, {
        pattern, zoneRows: zoneRows[z], rowOffset, cols, bw, bh,
        arenaLeft: gridLeft, arenaW, top, level, levelSeed: zoneSeed, noise, rng, diff, theme, typeRolls,
        nestBudget: budgetSlice, isBoss: false, bossPlaced: { v: false },
        fillDensity,
        sparsePatternBoost: diff.sparsePatternBoost,
        level,
        zoneIndex: z,
        layoutVariant,
        latticePack,
        hpPaceMult,
        rowMetrics,
      });
      packZoneGaps(bricks, {
        pattern, zoneRows: zoneRows[z], rowOffset, cols, bw, bh,
        arenaLeft: gridLeft, arenaW, top, level, levelSeed: zoneSeed, noise, theme, rng, diff,
        layoutVariant,
        latticePack,
        hpPaceMult,
        rowMetrics,
      });
      scatterZoneHoles(bricks, {
        zoneRows: zoneRows[z], rowOffset, cols, arenaLeft: gridLeft,
        level, levelSeed: zoneSeed,
      });
      nestBudget -= budgetSlice;
      rowOffset += zoneRows[z];
    }
  }

  ensurePlayable(bricks, theme, rng);
  applyTwist(bricks, twist, cols, bw, bh, gridLeft, top, rng, level, gridRight);
  placePortals(bricks, rng, level);
  clusterExplosives(bricks, rng, level);
  linkBrickPairs(bricks, rng);
  const playBounds = getPlayfieldBrickBounds();
  clampBricksInArena(bricks, playBounds);
  dedupeBrickCells(bricks);
  finalizeLevel(bricks, {
    theme,
    rng,
    playBounds,
    layout: { bw, bh, arenaLeft: gridLeft, arenaRight, gridRight, top, cols, arenaW },
    level,
    isBoss,
    goal,
    mutators,
  });

  const layoutLabel = patternNames.join(' + ');
  const twistLabel = TWIST_LABELS[twist] ?? null;

  return {
    bricks,
    isBoss,
    theme,
    levelSeed,
    gravityScale,
    mutator,
    mutators,
    goal,
    difficulty: diff,
    layoutLabel,
    layoutArc: isBoss ? 'BOSS' : (patternNames[0] ?? null),
    twistLabel,
    paceLabel,
    hpPaceMult,
  };
}

/**
 * Split total rows across hybrid zones — arc/pace bias row budget per band.
 * Siege stacks depth low; blitz keeps the upper band busier; verticalDrama grows upward.
 */
function splitRows(total, zones, rng, opts = {}) {
  if (zones <= 1) return [total];
  zones = Math.min(zones, Math.max(1, total));
  const out = new Array(zones).fill(1);
  let rem = total - zones;
  const { layoutArc, paceLabel } = opts;
  const weights = out.map((_, i) => {
    const t = zones <= 1 ? 0.5 : i / (zones - 1);
    let w = 1;
    if (paceLabel === 'siege') w += (1 - t) * 1.35;
    else if (paceLabel === 'blitz') w += t * 1.25;
    if (layoutArc === 'verticalDrama') w += t * 1.1 + (i === zones - 1 ? 0.45 : 0);
    if (layoutArc === 'latticeMosaic') w += 0.35;
    if (layoutArc === 'structural' && i === 0) w += 0.5;
    return Math.max(0.25, w);
  });
  let guard = 0;
  while (rem > 0 && guard++ < 512) {
    const roll = rng() * weights.reduce((s, w) => s + w, 0);
    let acc = 0;
    let slot = 0;
    for (let i = 0; i < zones; i++) {
      acc += weights[i];
      if (roll <= acc) { slot = i; break; }
    }
    out[slot]++;
    rem--;
  }
  return out;
}

function patternGroup(id) {
  for (const [group, ids] of Object.entries(PATTERN_GROUPS)) {
    if (ids.includes(id)) return group;
  }
  return 'dense';
}

function pickLatticePackProfile(pattern, zoneSeed, level, layoutVariant = 0, zoneIndex = 0) {
  if (!LATTICE_PATTERNS.has(pattern)) return null;
  const roll = (zoneSeed + layoutVariant * 19 + level * 11 + zoneIndex * 97) >>> 0;
  let mode;
  if (level <= 8) {
    const earlyPool = [...LATTICE_PACK_MODES_EARLY, 'flush', 'woven'];
    mode = earlyPool[roll % earlyPool.length];
  } else {
    mode = LATTICE_PACK_MODES[roll % LATTICE_PACK_MODES.length];
  }
  let fill = LATTICE_PACK_FILL[mode] ?? 0.72;
  if (level > 16) fill = Math.min(0.95, fill + 0.06);
  if (level > 28) fill = Math.min(1, fill + 0.05);
  return { mode, fill };
}

function zoneFillTarget(pattern, level, latticePack) {
  if (latticePack) return latticePack.fill;
  return patternFillTarget(pattern, level);
}

function patternFillTarget(pattern, level) {
  if (VOID_PATTERNS.has(pattern)) {
    const base = PATTERN_FILL_TARGET[pattern] ?? 0.75;
    return Math.min(0.88, base + Math.min(0.03, (level - 1) * 0.002));
  }
  const base = PATTERN_FILL_TARGET[pattern] ?? HYBRID_ZONE_FILL;
  return Math.min(1, base + Math.min(0.02, (level - 1) * 0.0015));
}

function boostPatternWeights(pool, arcPool, zoneIndex, level) {
  return pool.map((p) => {
    let w = p.weight ?? 1;
    const group = patternGroup(p.id);
    if (COMPLEX_PATTERNS.has(p.id)) w *= 2.9;
    if (arcPool.includes(p.id)) w *= zoneIndex === 0 ? 2.5 : 1.55;
    if (group === 'organic' || group === 'structural') w *= 1.65;
    if (group === 'lattice') w *= 1.35;
    if (PATTERN_GROUPS.dense.includes(p.id)) w *= 0.42;
    if (VOID_PATTERNS.has(p.id) && level >= 3) w *= 1.35;
    if (SPARSE_PATTERN_IDS.has(p.id) && level >= 4) w *= 1.2;
    if (HYBRID_MIXER_IDS.includes(p.id)) w *= 1.45;
    return { ...p, weight: w };
  });
}

/** Replace zone at index if it shares a layout family with another zone (force contrast). */
function contrastPickZone(out, index, eligible, used, usedGroups, rng, arcPool) {
  const otherGroups = new Set();
  for (let i = 0; i < out.length; i++) {
    if (i !== index) otherGroups.add(patternGroup(out[i]));
  }
  let pool = eligible.filter((p) => !used.has(p.id) && !otherGroups.has(patternGroup(p.id)));
  if (!pool.length) {
    pool = eligible.filter((p) => !used.has(p.id) && !out.includes(p.id));
  }
  if (!pool.length) return out[index];
  pool = boostPatternWeights(pool, arcPool, index, 99);
  return pickWeightedItem(pool, rng).id;
}

/**
 * Plan hybrid zones — unique pattern per zone, different families, arc-biased complex layouts.
 */
function pickZonePatterns(level, levelSeed, zoneCount, rng, campaignSeed, layoutArc, paceLabel = 'standard') {
  const arc = layoutArc ?? pickLevelArc(level, campaignSeed, levelSeed, paceLabel);
  const arcPool = LEVEL_ARC_POOLS[arc] ?? LEVEL_ARC_POOLS.chaosTapestry;
  const pacePool = paceLabel === 'siege'
    ? [...arcPool, ...PATTERN_GROUPS.structural, ...PATTERN_GROUPS.lattice]
    : paceLabel === 'blitz'
      ? [...arcPool, ...PATTERN_GROUPS.organic, 'scatter', 'islands']
      : arcPool;
  const boost = isCompactLayout() ? 1 : 0;
  let eligible = PATTERN_DEFS.filter((p) => level + boost >= p.minLevel && !BORING_PATTERNS.has(p.id));
  if (level <= 6) {
    eligible = eligible.filter((p) => !['fortress', 'fortressRing', 'fortressSplit'].includes(p.id));
  }
  const used = new Set();
  const usedGroups = new Set();
  const out = [];
  let latticeZones = 0;
  const maxLattice = arc === 'latticeMosaic' ? 2 : (zoneCount >= 3 ? 2 : 1);

  for (let z = 0; z < zoneCount; z++) {
    let pool = eligible.filter((p) => !used.has(p.id));
    const freshGroup = pool.filter((p) => !usedGroups.has(patternGroup(p.id)));
    if (freshGroup.length) pool = freshGroup;

    const arcHits = pool.filter((p) => pacePool.includes(p.id));
    if (arcHits.length && (z === 0 || rng() < 0.62)) pool = arcHits;

    if (latticeZones >= maxLattice) {
      pool = pool.filter((p) => !LATTICE_PATTERNS.has(p.id));
    }

    pool = boostPatternWeights(pool, arcPool, z, level);
    if (!pool.length) {
      pool = boostPatternWeights(
        eligible.filter((p) => !used.has(p.id)),
        arcPool,
        z,
        level,
      );
    }
    const picked = pickWeightedItem(pool, rng).id;
    if (LATTICE_PATTERNS.has(picked)) latticeZones++;
    out.push(picked);
    used.add(picked);
    usedGroups.add(patternGroup(picked));
  }

  for (let z = 1; z < out.length; z++) {
    if (patternGroup(out[z]) === patternGroup(out[z - 1]) || out[z] === out[z - 1]) {
      const prev = out[z];
      out[z] = contrastPickZone(out, z, eligible, used, usedGroups, rng, arcPool);
      used.delete(prev);
      used.add(out[z]);
      usedGroups.add(patternGroup(out[z]));
    }
  }

  if (zoneCount >= 2) {
    const signature = HYBRID_MIXER_IDS[((campaignSeed ^ levelSeed ^ level * 53) >>> 0) % HYBRID_MIXER_IDS.length];
    if (eligible.some((p) => p.id === signature) && !out.includes(signature)) {
      const slot = zoneCount >= 3
        ? 1 + (((levelSeed + campaignSeed + level * 29) >>> 0) % (out.length - 1))
        : ((levelSeed + campaignSeed + level * 29) >>> 0) % out.length;
      used.delete(out[slot]);
      out[slot] = signature;
      usedGroups.add(patternGroup(signature));
    }
  }

  for (let z = 2; z < out.length; z++) {
    if (patternGroup(out[z]) === patternGroup(out[z - 2])) {
      const prev = out[z];
      out[z] = contrastPickZone(out, z, eligible, used, usedGroups, rng, arcPool);
      used.delete(prev);
      used.add(out[z]);
      usedGroups.add(patternGroup(out[z]));
    }
  }

  /** Blend transition band between contrasting families (readable hybrid hand-off). */
  if (zoneCount >= 3) {
    for (let z = 1; z < out.length - 1; z++) {
      const gPrev = patternGroup(out[z - 1]);
      const gNext = patternGroup(out[z + 1]);
      if (gPrev !== gNext && gPrev !== 'organic' && gNext !== 'organic' && eligible.some((p) => p.id === 'blend')) {
        const roll = ((levelSeed + z * 73 + (campaignSeed >>> 0)) >>> 0) % 100;
        if (roll < 42) {
          used.delete(out[z]);
          out[z] = 'blend';
          used.add('blend');
          usedGroups.add('organic');
        }
      }
    }
  }

  return out;
}

function pickWeightedItem(items, rng) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function pickWeighted(items, rng) {
  const item = pickWeightedItem(items, rng);
  return item.id ?? item;
}

function pickMutators(level, rng, diff, isBoss) {
  const first = pickMutator(level, rng, diff, isBoss);
  if (!first) return [];
  const out = [first];
  if (isBoss || level < diff.mutatorMinLevel + 6) return out;
  const levelRoll = ((level * 1103515245 + 12345) >>> 0) / 0xffffffff;
  if (levelRoll < diff.secondMutatorChance) {
    const pool = MUTATORS.filter((m) => m !== first);
    const second = pool[Math.floor(rng() * pool.length)];
    if (second) out.push(second);
  }
  return out;
}

function pickMutator(level, rng, diff, isBoss) {
  if (level < diff.mutatorMinLevel && !isBoss) return null;
  const pool = MUTATORS.filter((_, i) => {
    if (level < 12 && (i === 4 || i === 6)) return false;
    if (level < 18 && i === 7) return false;
    return true;
  });
  if (!pool.length) return null;
  const levelRoll = ((level * 2654435761 + 0x9e3779b9) >>> 0) / 0xffffffff;
  if (!isBoss && levelRoll > diff.mutatorChance) return null;
  return pool[Math.floor(rng() * pool.length)];
}

function pickGravity(level, rng, twist, diff) {
  let g = diff.gravityBase ?? 1;
  if (twist === 'heavyGravity' || twist === 'HeavyGravity') g = Math.max(g, 1.35);
  if (twist === 'shiftingBand' && level >= 8) g *= 1.05;
  return clamp(g, 0.6, 1.45);
}

/** Per-row height/width + y (cumulative) — rows are not uniform slabs. */
function buildRowMetrics(totalRows, baseBw, baseBh, top, levelSeed, maxWallH, campaignSeed = 0) {
  const rng = mulberry32((levelSeed ^ campaignSeed ^ 0x8b33c1) >>> 0);
  const gap = BRICK.GAP;
  const rows = [];
  let y = top;
  for (let r = 0; r < totalRows; r++) {
    const band = r % 4;
    const hScale = band === 0 ? 0.92 + rng() * 0.1
      : band === 1 ? 0.96 + rng() * 0.12
        : band === 2 ? 0.9 + rng() * 0.1
          : 0.94 + rng() * 0.14;
    const wScale = band === 1 ? 0.96 + rng() * 0.1 : 0.92 + rng() * 0.12;
    const bh = Math.max(Math.round(baseBh * 0.9), Math.round(baseBh * hScale));
    const bw = Math.max(Math.round(baseBw * 0.88), Math.min(BRICK.WIDTH, Math.round(baseBw * wScale)));
    if (rows.length >= 5 && y + bh > top + maxWallH) break;
    rows.push({ absR: rows.length, y, bw, bh });
    y += bh + gap;
  }
  if (!rows.length) rows.push({ absR: 0, y: top, bw: baseBw, bh: baseBh });
  return rows;
}

/** Slight per-column width jitter inside a row; row is centered in the arena. */
function brickSpecAtCell(arenaLeft, arenaW, cols, rowMetrics, absR, c) {
  const row = rowMetrics[absR];
  if (!row) {
    const bh = BRICK.HEIGHT;
    const bw = BRICK.WIDTH;
    return {
      x: arenaLeft + c * (bw + BRICK.GAP),
      y: absR * (bh + BRICK.GAP),
      w: bw,
      h: bh,
      zoneRow: absR,
      col: c,
    };
  }
  const gap = BRICK.GAP;
  const widths = [];
  for (let i = 0; i < cols; i++) {
    const jitter = (hash(i * 5 + absR, row.bw + c) - 0.5) * 0.08;
    widths.push(clamp(
      Math.round(row.bw * (1 + jitter)),
      Math.round(row.bw * 0.9),
      BRICK.WIDTH,
    ));
  }
  let span = widths.reduce((s, w) => s + w, 0) + Math.max(0, cols - 1) * gap;
  if (span > arenaW + 0.5) {
    const scale = arenaW / span;
    for (let i = 0; i < widths.length; i++) {
      widths[i] = Math.max(1, Math.round(widths[i] * scale));
    }
    span = widths.reduce((s, w) => s + w, 0) + Math.max(0, cols - 1) * gap;
  }
  let x = arenaLeft + Math.max(0, (arenaW - span) * 0.5);
  for (let i = 0; i < c; i++) x += widths[i] + gap;
  return {
    x,
    y: row.y,
    w: widths[c],
    h: row.bh,
    zoneRow: absR,
    col: c,
  };
}

const ROW_TYPE_STYLES = [
  { explode: 2.6, silver: 0.2, reinforced: 0.7, moving: 0.5 },
  { explode: 0.45, silver: 2.4, reinforced: 1.9, moving: 0.35 },
  { explode: 0.65, silver: 0.9, reinforced: 1.1, moving: 2.4 },
  { explode: 0.55, silver: 1.2, reinforced: 0.85, moving: 0.8 },
  { explode: 1.1, silver: 1.15, reinforced: 1.15, moving: 1.1 },
];

/** Row-to-row brick variety — not every row shares the same type mix. */
function typeRollsForRow(baseRolls, absR, levelSeed) {
  const style = ROW_TYPE_STYLES[(absR + (levelSeed >>> 0)) % ROW_TYPE_STYLES.length];
  const out = { ...baseRolls };
  for (const key of Object.keys(style)) {
    if (out[key] == null) continue;
    out[key] = clamp((out[key] ?? 0) * style[key], 0, 0.52);
  }
  return out;
}

function pickEmojiGlyph(seed) {
  const keys = Object.keys(EMOJI_GLYPHS);
  return keys[((seed >>> 0) % keys.length + keys.length) % keys.length];
}

function emojiCell(glyphName, r, c, rows, cols) {
  const glyph = EMOJI_GLYPHS[glyphName];
  if (!glyph?.length) return false;
  const gh = glyph.length;
  const gw = glyph[0].length;
  const row0 = Math.max(0, Math.floor((rows - gh) / 2));
  const col0 = Math.max(0, Math.floor((cols - gw) / 2));
  const gr = r - row0;
  const gc = c - col0;
  if (gr < 0 || gc < 0 || gr >= gh || gc >= gw) return false;
  return glyph[gr][gc] === '1';
}

/**
 * Top up each hybrid zone to its fill target. With BRICK.GAP = 0, packed cells are flush.
 * Lattice zones: flush = solid wall; swiss/checker/columns = structured gaps, then partial pack.
 */
function packZoneGaps(bricks, ctx) {
  const {
    pattern, zoneRows, rowOffset, cols, bw, bh, arenaLeft, arenaW, top, level, levelSeed, noise, theme, rng, diff,
    layoutVariant = 0, latticePack: latticePackIn, rowMetrics = [],
  } = ctx;
  const latticePack = latticePackIn ?? pickLatticePackProfile(pattern, levelSeed ?? 0, level, layoutVariant);
  const target = Math.floor(
    cols * zoneRows * zoneFillTarget(pattern, level, latticePack) * levelPackDensity(level, levelSeed),
  );
  const voidPattern = VOID_PATTERNS.has(pattern);
  const isLattice = LATTICE_PATTERNS.has(pattern);
  const packSeed = (levelSeed ?? level * 17) + rowOffset;

  const inZone = bricks.filter((b) => {
    const gr = b.zoneRow ?? 0;
    return gr >= rowOffset && gr < rowOffset + zoneRows;
  });
  if (inZone.length >= target) return;

  const occupied = new Set();
  for (const b of inZone) {
    const gr = b.zoneRow ?? 0;
    const gc = b.col ?? 0;
    occupied.add(`${gr},${gc}`);
  }

  const cellAllowed = (r, c, absR) => {
    if (voidPattern) {
      return exists(pattern, r, c, zoneRows, cols, packSeed, noise, rng, 1, absR, 1.1, level, latticePack);
    }
    if (isLattice) {
      if (latticePack?.mode === 'flush') return true;
      return latticeCell(pattern, latticePack.mode, r, c, zoneRows, cols, packSeed, noise, absR, level);
    }
    return true;
  };

  const empties = [];
  for (let r = 0; r < zoneRows; r++) {
    const absR = rowOffset + r;
    for (let c = 0; c < cols; c++) {
      if (occupied.has(`${absR},${c}`)) continue;
      if (!cellAllowed(r, c, absR)) continue;
      empties.push({ r, c, absR });
    }
  }

  for (let i = empties.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [empties[i], empties[j]] = [empties[j], empties[i]];
  }

  let need = target - inZone.length;
  for (const { absR, c } of empties) {
    if (need <= 0) break;
    bricks.push({
      ...brickSpecAtCell(arenaLeft, arenaW, cols, rowMetrics, absR, c),
      type: 'normal',
      color: theme.bricks[(absR + c + rowOffset) % theme.bricks.length],
      moving: false,
      movePhase: rng() * Math.PI * 2,
      moveSpeed: (0.65 + rng() * 0.8) * diff.moveSpeedMult,
      moveAmp: 0,
      hpPaceMult: ctx.hpPaceMult ?? 1,
    });
    need--;
  }
}

/** Punch random holes after packing so layouts aren’t perfect rectangles. */
function scatterZoneHoles(bricks, ctx) {
  const {
    zoneRows, rowOffset, cols, level, levelSeed,
  } = ctx;
  const holeJitter = (((levelSeed ?? 0) >>> 4) % 9) / 100;
  let holeRate = clamp(
    (level <= 6 ? 0.16 : level <= 14 ? 0.12 : 0.08) + holeJitter - 0.04,
    0.06,
    0.22,
  );
  if (isCompactLayout()) holeRate *= level <= 14 ? 0.32 : 0.55;
  const minKeep = Math.max(
    8,
    Math.floor(cols * zoneRows * (isCompactLayout() && level <= 14 ? 0.58 : 0.45)),
  );

  const candidates = [];
  for (let i = 0; i < bricks.length; i++) {
    const b = bricks[i];
    const gr = b.zoneRow ?? 0;
    if (gr < rowOffset || gr >= rowOffset + zoneRows) continue;
    if (['gold', 'steel', 'boss', 'portal', 'hostage'].includes(b.type)) continue;
    candidates.push(i);
  }
  if (candidates.length <= minKeep) return;

  const removeN = Math.min(
    candidates.length - minKeep,
    Math.floor(candidates.length * holeRate),
  );
  const holeRng = mulberry32((levelSeed ^ 0xca5cad) >>> 0);
  const toRemove = new Set();
  let guard = 0;
  while (toRemove.size < removeN && guard++ < removeN * 8) {
    toRemove.add(candidates[(holeRng() * candidates.length) | 0]);
  }
  for (const idx of [...toRemove].sort((a, b) => b - a)) {
    bricks.splice(idx, 1);
  }
}

function fillZone(bricks, ctx) {
  const {
    pattern, zoneRows, rowOffset, cols, bw, bh, arenaLeft, arenaW, top, level, levelSeed,
    noise, rng, diff, theme, typeRolls, nestBudget, isBoss, bossPlaced,
    fillDensity = diff.patternDensity,
    sparsePatternBoost = 1.05,
    zoneIndex = 0,
    layoutVariant = 0,
    latticePack: latticePackIn = null,
    hpPaceMult = 1,
    rowMetrics = [],
  } = ctx;
  let nests = nestBudget;
  const colorOffset = zoneIndex * 2 + (layoutVariant & 1);
  const latticePack = latticePackIn ?? pickLatticePackProfile(pattern, levelSeed, level, layoutVariant);

  for (let r = 0; r < zoneRows; r++) {
    const absR = rowOffset + r;
    const rowRolls = typeRollsForRow(typeRolls, absR, levelSeed);
    const rowBw = rowMetrics[absR]?.bw ?? bw;
    for (let c = 0; c < cols; c++) {
      if (!exists(pattern, r, c, zoneRows, cols, levelSeed + rowOffset, noise, rng, fillDensity, absR, sparsePatternBoost, level, latticePack)) continue;

      let type = 'normal';
      let color = theme.bricks[(absR + c + colorOffset) % theme.bricks.length];
      let moving = false;

      if (isGold(pattern, r, c, zoneRows, cols, level, absR)) {
        type = rng() < 0.38 ? 'steel' : 'gold';
        color = type === 'steel' ? PAL.steel : PAL.gold;
      } else if (isBoss && !bossPlaced.v && r === Math.floor(zoneRows / 2) && c === Math.floor(cols / 2)) {
        type = 'boss';
        color = 0xffc8a0;
        bossPlaced.v = true;
      } else {
        const roll = rng();
        let t = rowRolls.explode;
        if (roll < t) { type = 'explosive'; color = PAL.explosive; }
        else if (roll < (t += rowRolls.silver)) { type = 'silver'; color = PAL.silver; }
        else if (roll < (t += rowRolls.reinforced)) { type = 'reinforced'; color = theme.bricks[(absR + c + 1) % theme.bricks.length]; }
        else if (nests > 0 && roll < (t += rowRolls.nest)) {
          if (rng() < rowRolls.hostage) { type = 'hostage'; color = 0x886644; }
          else { type = 'nest'; color = theme.bricks[(absR + 3) % theme.bricks.length]; }
          nests--;
        }
        else if (level >= 8 && roll < (t += rowRolls.tactical)) {
          const sub = rng();
          if (sub < rowRolls.mirror / rowRolls.tactical) { type = 'mirror'; color = 0xccccff; }
          else if (sub < (rowRolls.mirror + rowRolls.moss) / rowRolls.tactical) { type = 'moss'; color = 0x5a8860; }
          else if (sub < (rowRolls.mirror + rowRolls.moss + rowRolls.beehive) / rowRolls.tactical) { type = 'beehive'; color = 0xffcc44; }
          else if (sub < (rowRolls.mirror + rowRolls.moss + rowRolls.beehive + rowRolls.seedpod) / rowRolls.tactical) { type = 'seedpod'; color = 0x88cc66; }
          else { type = 'linked'; color = 0xaa88ff; }
        }
        else if (rng() < rowRolls.moving) {
          type = rng() < 0.55 ? 'shifting' : 'normal';
          moving = true;
        }
      }

      bricks.push({
        ...brickSpecAtCell(arenaLeft, arenaW, cols, rowMetrics, absR, c),
        type, color, moving,
        movePhase: rng() * Math.PI * 2,
        moveSpeed: (0.65 + rng() * 1.1) * diff.moveSpeedMult,
        moveAmp: rowBw * (0.12 + rng() * 0.28) * (1 + diff.movingBoost * 0.5),
        hpPaceMult,
      });
    }
  }
}

function ensurePlayable(bricks, theme, rng) {
  const destructible = bricks.filter((b) => isDestructibleType(b.type) && b.type !== 'hostage');
  if (destructible.length > 0) return;
  if (!bricks.length) return;
  for (const b of bricks) {
    if (WALL_TYPES.has(b.type)) {
      b.type = 'normal';
      b.color = theme.bricks[0];
      b.moving = false;
      return;
    }
  }
  bricks[0].type = 'normal';
  bricks[0].color = theme.bricks[0];
  bricks[0].moving = false;
}

const WALL_TYPES = new Set(['gold', 'steel']);
const NON_BALL_TYPES = new Set(['gold', 'steel', 'hostage']);

function isDestructibleType(type) {
  return !WALL_TYPES.has(type);
}

function isBallClearableType(type, cannonsOnly = false) {
  if (!isDestructibleType(type)) return false;
  if (type === 'hostage') return false;
  if (cannonsOnly && type === 'silver') return false;
  return true;
}

function isColumnBlocker(type) {
  return WALL_TYPES.has(type) || type === 'hostage';
}

function brickColumnIndex(b, arenaLeft, cellW) {
  return Math.round((b.x + b.w / 2 - arenaLeft) / cellW);
}

function groupBricksByColumn(bricks, arenaLeft, cellW) {
  const map = new Map();
  for (const b of bricks) {
    const c = brickColumnIndex(b, arenaLeft, cellW);
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(b);
  }
  return map;
}

function demoteWallBrick(b, theme, rng) {
  b.type = rng() < 0.3 ? 'explosive' : 'reinforced';
  b.color = b.type === 'explosive'
    ? PAL.explosive
    : theme.bricks[(b.zoneRow ?? 0) % theme.bricks.length];
  delete b.portalId;
  delete b.portalLinkIndex;
}

function demoteToNormal(b, theme, rng, preferExplosive = false) {
  if (preferExplosive && rng() < 0.35) {
    b.type = 'explosive';
    b.color = PAL.explosive;
  } else {
    b.type = 'normal';
    b.color = theme.bricks[(b.zoneRow ?? 0) % theme.bricks.length];
  }
  b.moving = false;
  delete b.portalId;
  delete b.portalLinkIndex;
  delete b.linkedPartnerIndex;
}

function bottomBand(bricks, bh) {
  if (!bricks.length) return [];
  const maxY = Math.max(...bricks.map((b) => b.y));
  return bricks.filter((b) => b.y >= maxY - bh * 0.45);
}

/** True if a normal ball can eventually break this brick (ignores cannons-only silver). */
function hasReachableDestructible(bricks, arenaLeft, cellW, cannonsOnly = false) {
  for (const col of groupBricksByColumn(bricks, arenaLeft, cellW).values()) {
    col.sort((a, b) => b.y - a.y);
    for (const b of col) {
      if (!isBallClearableType(b.type, cannonsOnly)) continue;
      const blockedBelow = col.some(
        (x) => x.y > b.y + b.h * 0.15 && isColumnBlocker(x.type),
      );
      if (!blockedBelow) return true;
    }
  }
  return false;
}

function countBallClearable(bricks, cannonsOnly = false) {
  return bricks.filter((b) => isBallClearableType(b.type, cannonsOnly)).length;
}

function ensureClearPath(bricks, theme, rng, layout, cannonsOnly = false) {
  if (!bricks.length) return;
  const { bw, bh, arenaLeft } = layout;
  const cellW = bw + BRICK.GAP;

  for (const col of groupBricksByColumn(bricks, arenaLeft, cellW).values()) {
    col.sort((a, b) => b.y - a.y);
    for (let i = 0; i < col.length; i++) {
      const b = col[i];
      if (!isColumnBlocker(b.type)) continue;
      const hasAbove = col.slice(i + 1).some((x) => isDestructibleType(x.type));
      if (hasAbove) demoteWallBrick(b, theme, rng);
    }
  }

  const band = bottomBand(bricks, bh);
  const breakableBottom = band.filter((b) => isBallClearableType(b.type, cannonsOnly));
  const minBottom = Math.max(2, Math.ceil(band.length * 0.22));
  if (breakableBottom.length < minBottom) {
    let need = minBottom - breakableBottom.length;
    for (const b of band.filter((x) => isColumnBlocker(x.type) || (cannonsOnly && x.type === 'silver'))) {
      if (need <= 0) break;
      demoteToNormal(b, theme, rng, true);
      need--;
    }
  }

  if (!hasReachableDestructible(bricks, arenaLeft, cellW, cannonsOnly)) {
    for (const col of groupBricksByColumn(bricks, arenaLeft, cellW).values()) {
      col.sort((a, b) => b.y - a.y);
      if (!col.some((b) => isBallClearableType(b.type, cannonsOnly))) continue;
      for (const b of col) {
        if (isColumnBlocker(b.type) || (cannonsOnly && b.type === 'silver')) {
          demoteToNormal(b, theme, rng, true);
        }
        if (hasReachableDestructible(bricks, arenaLeft, cellW, cannonsOnly)) break;
      }
      if (hasReachableDestructible(bricks, arenaLeft, cellW, cannonsOnly)) break;
    }
  }

  if (!hasReachableDestructible(bricks, arenaLeft, cellW, cannonsOnly)) {
    const maxY = Math.max(...bricks.map((b) => b.y));
    const fallback = bricks
      .filter((b) => isDestructibleType(b.type))
      .sort((a, b) => b.y - a.y)[0];
    if (fallback) {
      demoteToNormal(fallback, theme, rng, true);
      fallback.y = maxY;
    } else if (bricks[0]) {
      demoteToNormal(bricks[0], theme, rng, true);
    }
  }
}

function ensureCannonsOnlyReachable(bricks, theme, rng, layout) {
  if (hasReachableDestructible(bricks, layout.arenaLeft, layout.bw + BRICK.GAP, true)) return;
  const silvers = bricks.filter((b) => b.type === 'silver');
  const convert = Math.max(2, Math.ceil(silvers.length * 0.4));
  for (let i = 0; i < convert && i < silvers.length; i++) {
    demoteToNormal(silvers[i], theme, rng);
  }
  ensureClearPath(bricks, theme, rng, layout, true);
}

function ensureMinBricks(bricks, layout, theme, rng, min = 18) {
  const compact = isCompactLayout();
  const target = Math.max(
    compact ? 22 : 18,
    Math.floor(layout.cols * (compact ? 2.4 : 2.0)),
  );
  if (bricks.length >= target) return;
  min = target;
  if (bricks.length >= min) return;
  const { arenaLeft, top, bw, bh, cols, arenaW } = layout;
  const bottom = (GAME.ARENA_FLOOR ?? GAME.HEIGHT) - BRICK.GAP * 2;
  const right = layout.gridRight ?? layout.arenaRight ?? (GAME.WIDTH - playfieldSideInset());
  let row = 0;
  const maxFillRows = compact ? 14 : 12;
  while (bricks.length < min && row < maxFillRows) {
    const y = top + row * (bh + BRICK.GAP);
    if (y + bh > bottom + 0.5) break;
    for (let c = 0; c < cols && bricks.length < min; c++) {
      const spec = arenaW != null
        ? brickSpecAtCell(arenaLeft, arenaW, cols, [], row, c)
        : {
          x: arenaLeft + c * (bw + BRICK.GAP),
          y,
          w: bw,
          h: bh,
          zoneRow: row,
          col: c,
        };
      if (spec.x + spec.w > right + 0.5 || spec.y + spec.h > bottom + 0.5) continue;
      bricks.push({
        ...spec,
        type: 'normal',
        color: theme.bricks[c % theme.bricks.length],
        moving: false,
        moveAmp: 0,
      });
    }
    row++;
  }
}

function ensureDestructibleQuota(bricks, theme, rng, min = 8) {
  let count = bricks.filter((b) => isBallClearableType(b.type, false)).length;
  if (count >= min) return;
  for (const b of [...bricks].sort((a, b) => b.y - a.y)) {
    if (count >= min) break;
    if (!isBallClearableType(b.type, false) && b.type !== 'boss') {
      demoteToNormal(b, theme, rng);
      count++;
    }
  }
}

function ensureBossPresent(bricks, theme) {
  if (bricks.some((b) => b.type === 'boss')) return;
  const pick = bricks.find((b) => b.type === 'reinforced')
    ?? bricks[Math.floor(bricks.length / 2)]
    ?? bricks[0];
  if (!pick) return;
  pick.type = 'boss';
  pick.color = 0xffc8a0;
  pick.moving = false;
}

function ensureGoalBricks(bricks, goal, theme, rng) {
  if (!goal || !bricks.length) return;
  if (goal.type === 'nestHunt' && !bricks.some((b) => b.type === 'nest')) {
    const pick = bricks.find((b) => b.type === 'normal') ?? bricks[0];
    if (pick) {
      pick.type = 'nest';
      pick.color = theme.bricks[(pick.zoneRow ?? 0) % theme.bricks.length];
    }
  }
  if (goal.type === 'escort') {
    const candidates = bricks.filter((b) => b.type === 'normal' || b.type === 'reinforced');
    if (!candidates.length) {
      const pick = bricks.find((b) => isBallClearableType(b.type, false)) ?? bricks[0];
      if (pick) demoteToNormal(pick, theme, rng);
    }
  }
}

function fixLinkedOrphans(bricks, theme) {
  const linked = bricks.filter((b) => b.type === 'linked');
  for (let i = 0; i < linked.length; i += 2) {
    if (i + 1 < linked.length) continue;
    const orphan = linked[i];
    orphan.type = 'normal';
    orphan.color = theme.bricks[(orphan.zoneRow ?? 0) % theme.bricks.length];
    orphan.linkedPartnerIndex = null;
  }
  for (let i = 0; i + 1 < linked.length; i += 2) {
    const a = linked[i];
    const b = linked[i + 1];
    a.linkedPartnerIndex = bricks.indexOf(b);
    b.linkedPartnerIndex = bricks.indexOf(a);
  }
}

function fixPortalLinks(bricks, theme, rng) {
  fixPortalPairs(bricks, rng);
  for (const b of bricks) {
    if (b.type !== 'portal') continue;
    const partner = b.portalLinkIndex != null ? bricks[b.portalLinkIndex] : null;
    const valid = partner
      && partner.type === 'portal'
      && partner.portalId === b.portalId
      && partner !== b;
    if (!valid) {
      demoteToNormal(b, theme, rng);
    }
  }
  fixPortalPairs(bricks, rng);
}

function sanitizeHostagePlacement(bricks, theme, rng, layout) {
  const { bh } = layout;
  const band = bottomBand(bricks, bh);
  for (const b of band) {
    if (b.type !== 'hostage') continue;
    const col = groupBricksByColumn(bricks, layout.arenaLeft, layout.bw + BRICK.GAP)
      .get(brickColumnIndex(b, layout.arenaLeft, layout.bw + BRICK.GAP)) ?? [];
    const hasAbove = col.some((x) => x !== b && x.y < b.y - bh * 0.2 && isDestructibleType(x.type));
    if (hasAbove) demoteToNormal(b, theme, rng);
  }
}

/** Run all post-generation validation/repair passes until the layout is playable. */
function finalizeLevel(bricks, opts) {
  const { theme, rng, layout, isBoss, goal, mutators, playBounds } = opts;
  const cannonsOnly = mutators?.includes('CannonsOnly');
  const bounds = playBounds ?? getPlayfieldBrickBounds();

  for (let pass = 0; pass < 6; pass++) {
    ensureMinBricks(bricks, layout, theme, rng);
    dedupeBrickCells(bricks);
    ensureDestructibleQuota(bricks, theme, rng, Math.max(8, Math.floor(layout.cols * 1.2)));
    ensurePlayable(bricks, theme, rng);
    if (isBoss) ensureBossPresent(bricks, theme);
    ensureGoalBricks(bricks, goal, theme, rng);
    sanitizeHostagePlacement(bricks, theme, rng, layout);
    fixPortalLinks(bricks, theme, rng);
    fixLinkedOrphans(bricks, theme);
    ensureOneExplosive(bricks, rng);
    ensureClearPath(bricks, theme, rng, layout, false);
    if (cannonsOnly) ensureCannonsOnlyReachable(bricks, theme, rng, layout);
    clampBricksInArena(bricks, bounds);
    dedupeBrickCells(bricks);

    const play = validateLevel(bricks, { layout, cannonsOnly, isBoss, goal });
    const view = validateBricksInViewport(bricks, bounds);
    if (play.valid && view.valid) return;
  }

  // Last-resort: flatten front row to normals
  const maxY = Math.max(...bricks.map((b) => b.y), 0);
  for (const b of bricks.filter((x) => x.y >= maxY - layout.bh * 0.5)) {
    if (!isBallClearableType(b.type, cannonsOnly)) demoteToNormal(b, theme, rng, true);
  }
  ensureClearPath(bricks, theme, rng, layout, cannonsOnly);
  clampBricksInArena(bricks, bounds);
  dedupeBrickCells(bricks);
}

/** Exported for tests — returns { valid, issues[] }. */
export function validateLevel(bricks, opts = {}) {
  const { layout, cannonsOnly = false, isBoss = false, goal = null } = opts;
  const issues = [];
  if (!bricks?.length) {
    issues.push('empty');
    return { valid: false, issues };
  }
  if (layout) {
    const cellW = layout.bw + BRICK.GAP;
    if (!hasReachableDestructible(bricks, layout.arenaLeft, cellW, cannonsOnly)) {
      issues.push('no_ball_reachable_destructible');
    }
    const clearable = countBallClearable(bricks, cannonsOnly);
    if (clearable < Math.min(6, Math.floor(bricks.length * 0.2))) {
      issues.push('too_few_clearable');
    }
  }
  if (!bricks.some((b) => isDestructibleType(b.type))) issues.push('no_destructible');
  if (!bricks.some((b) => b.type === 'explosive')) issues.push('no_explosive');
  if (isBoss && !bricks.some((b) => b.type === 'boss')) issues.push('missing_boss');
  if (goal?.type === 'nestHunt' && !bricks.some((b) => b.type === 'nest')) issues.push('missing_nest');

  const portals = bricks.filter((b) => b.type === 'portal');
  const portalIds = new Map();
  for (const p of portals) {
    if (!portalIds.has(p.portalId)) portalIds.set(p.portalId, []);
    portalIds.get(p.portalId).push(p);
  }
  for (const [, group] of portalIds) {
    if (group.length !== 2) issues.push('orphan_portal');
  }

  const linked = bricks.filter((b) => b.type === 'linked');
  if (linked.length % 2 !== 0) issues.push('orphan_linked');

  const viewport = validateBricksInViewport(bricks);
  for (const v of viewport.issues) issues.push(v);

  return { valid: issues.length === 0, issues };
}

function applyTwist(bricks, twist, cols, bw, bh, arenaLeft, top, rng, level, gridRight) {
  if (twist === 'none' || !bricks.length) return;
  const arenaRight = gridRight ?? (arenaLeft + cols * (bw + BRICK.GAP) - BRICK.GAP + bw);

  if (twist === 'mirrored') {
    for (const b of bricks) {
      const rel = b.x - arenaLeft;
      b.x = arenaRight - rel - b.w;
    }
  }

  if (twist === 'sparse') {
    const cands = bricks.filter((b) => !['gold', 'steel', 'boss'].includes(b.type));
    const sparseRatio = 0.02 + rng() * 0.025;
    const remove = Math.floor(cands.length * sparseRatio);
    for (let i = 0; i < remove && cands.length; i++) {
      const idx = bricks.indexOf(cands.splice(Math.floor(rng() * cands.length), 1)[0]);
      if (idx >= 0) bricks.splice(idx, 1);
    }
  }

  if (twist === 'explosiveCore') {
    const cx = bricks.reduce((s, b) => s + b.x + b.w / 2, 0) / bricks.length;
    const cy = bricks.reduce((s, b) => s + b.y + b.h / 2, 0) / bricks.length;
    bricks
      .filter((b) => Math.hypot(b.x + b.w / 2 - cx, b.y + b.h / 2 - cy) < bw * 2.2)
      .forEach((b) => { if (b.type !== 'gold' && b.type !== 'steel') { b.type = 'explosive'; b.color = PAL.explosive; } });
  }

  if (twist === 'goldVein' && level >= 3) {
    const row = bricks.filter((b) => b.type === 'normal');
    const pick = row[Math.floor(rng() * row.length)];
    if (pick) {
      pick.type = rng() < 0.5 ? 'gold' : 'steel';
      pick.color = pick.type === 'steel' ? PAL.steel : PAL.gold;
    }
  }

  if (twist === 'shiftingBand') {
    const midY = bricks.map((b) => b.y).sort((a, b) => a - b)[Math.floor(bricks.length / 2)] ?? top;
    bricks.filter((b) => Math.abs(b.y - midY) < bh * 1.2).forEach((b) => {
      if (b.type !== 'gold' && b.type !== 'steel') {
        b.type = 'shifting';
        b.moving = true;
        b.moveAmp = bw * (0.22 + rng() * 0.2);
      }
    });
  }

  if (twist === 'nestCluster') {
    let placed = 0;
    const anchor = bricks.filter((b) => b.type === 'normal')[Math.floor(rng() * bricks.length)];
    if (anchor) {
      for (const b of bricks) {
        if (placed >= 3) break;
        if (Math.hypot(b.x - anchor.x, b.y - anchor.y) < bw * 2.5 && b.type === 'normal') {
          b.type = 'nest';
          placed++;
        }
      }
    }
  }
}

function clusterExplosives(bricks, rng, level) {
  if (level < 4 || rng() > (level >= 12 ? 0.62 : 0.5)) return;
  const ex = bricks.filter((b) => b.type === 'explosive');
  if (ex.length < 2) return;
  const seed = ex[Math.floor(rng() * ex.length)];
  for (const b of bricks) {
    if (b === seed || b.type !== 'normal') continue;
    if (Math.hypot(b.x - seed.x, b.y - seed.y) < seed.w * 2.2 && rng() < 0.35) {
      b.type = 'explosive';
      b.color = PAL.explosive;
    }
  }
}

function linkBrickPairs(bricks, rng) {
  const linked = bricks.filter((b) => b.type === 'linked');
  for (let i = 0; i + 1 < linked.length; i += 2) {
    const a = linked[i];
    const b = linked[i + 1];
    a.linkedPartnerIndex = bricks.indexOf(b);
    b.linkedPartnerIndex = bricks.indexOf(a);
  }
}

function placePortals(bricks, rng, level) {
  if (level < 8) return;
  const pairCount = level >= 20 && rng() < 0.35 ? 2 : 1;
  for (let p = 0; p < pairCount; p++) {
    const eligible = bricks.filter((b) => ['normal', 'reinforced', 'silver', 'shifting'].includes(b.type) && !b.portalId);
    if (eligible.length < 2) break;
    let a = null;
    let b = null;
    for (let t = 0; t < 24; t++) {
      a = eligible[(rng() * eligible.length) | 0];
      b = eligible[(rng() * eligible.length) | 0];
      if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) >= 140) break;
      a = null;
      b = null;
    }
    if (!a || !b) break;
    const ia = bricks.indexOf(a);
    const ib = bricks.indexOf(b);
    const pid = `p${(rng() * 1e6) | 0}`;
    a.type = 'portal';
    a.color = 0x72f2eb;
    a.portalId = pid;
    a.portalLinkIndex = ib;
    b.type = 'portal';
    b.color = 0x72f2eb;
    b.portalId = pid;
    b.portalLinkIndex = ia;
  }
}

/** Revert orphan portals (never leave a single portal brick). */
function fixPortalPairs(bricks, rng) {
  const byId = new Map();
  for (const b of bricks) {
    if (b.type !== 'portal' || !b.portalId) continue;
    if (!byId.has(b.portalId)) byId.set(b.portalId, []);
    byId.get(b.portalId).push(b);
  }
  for (const group of byId.values()) {
    if (group.length === 2) continue;
    for (const b of group) {
      b.type = 'normal';
      b.color = b.color === 0x72f2eb ? PAL.accent2 : b.color;
      b.portalId = null;
      b.portalLinkIndex = null;
    }
  }
}

function ensureOneExplosive(bricks, rng) {
  if (bricks.some((b) => b.type === 'explosive')) return;
  const pool = bricks.filter((b) => !['gold', 'steel', 'boss', 'portal', 'hostage'].includes(b.type));
  if (!pool.length) return;
  const pick = pool[(rng() * pool.length) | 0];
  pick.type = 'explosive';
  pick.color = PAL.explosive;
}

function hash(a, b) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Light per-cell dropout for organic patterns (extra randomness before pack). */
function layoutJitter(r, c, seed, level, rate = 0.08) {
  const cut = rate + Math.min(0.04, level * 0.002);
  return hash(r * 3 + seed, c * 5 + level) > cut;
}

/** Grid / rows / columns / checker — pack mode sets holes vs solid. */
function latticeCell(pattern, mode, r, c, rows, cols, seed, noise, absR, level) {
  switch (mode) {
    case 'flush':
      return true;
    case 'swiss':
      return hash(r + seed * 0.3, c - seed * 0.17 + absR) > 0.18 + Math.min(0.08, level * 0.004);
    case 'checker':
      return (r + c + absR + (seed & 1)) % 2 === 0;
    case 'columns':
      return c % 4 !== 2 && (c + seed) % 7 !== 4;
    case 'rowLanes':
      return r % 3 !== 1 || (c + absR) % 2 === 0;
    case 'perlinMesh':
      return noise.perlin2(c * 0.34 + seed * 0.01, r * 0.34 + absR * 0.07) > -0.08
        && hash(r * 2 + seed, c) > 0.05;
    case 'woven':
      return ((r + c + absR) % 5 !== 0) && ((r * 2 + c) % 7 !== 2);
    default:
      return true;
  }
}

function exists(pattern, r, c, rows, cols, seed, noise, rng, density = 1, absR = r, sparsePatternBoost = 1.05, level = 1, latticePack = null) {
  if (latticePack && LATTICE_PATTERNS.has(pattern)) {
    if (!latticeCell(pattern, latticePack.mode, r, c, rows, cols, seed, noise, absR, level)) return false;
    return layoutJitter(r, c, seed, level, 0.1);
  }
  const midC = (cols - 1) / 2;
  const midR = (rows - 1) / 2;
  let place = true;
  switch (pattern) {
    case 'grid':
      place = hash(r + seed, c + absR) > 0.06;
      break;
    case 'blend': {
      const mix = (r * 7 + c * 3 + (seed & 15)) % 5;
      if (mix === 0) place = true;
      else if (mix === 1) place = (r + c + absR) % 3 !== 0;
      else if (mix === 2) place = noise.perlin2(c * 0.3 + seed * 0.01, r * 0.3 + absR * 0.08) > -0.12;
      else if (mix === 3) {
        place = Math.abs(c - midC - Math.sin(r * 0.65 + seed * 0.02) * cols * 0.28) <= cols * 0.42 + 1.2;
      } else place = c % 5 !== 2;
      break;
    }
    case 'emoji': {
      const glyph = pickEmojiGlyph(seed + level * 41);
      place = emojiCell(glyph, r, c, rows, cols)
        || noise.perlin2(c * 0.34 + seed * 0.01, r * 0.34 + absR * 0.06) > 0.08;
      break;
    }
    case 'circle': {
      const nx = (c - midC) / (midC || 1);
      const ny = (r - midR) / (midR || 1);
      place = nx * nx + ny * ny <= 1.08;
      break;
    }
    case 'rows':
      place = r % 5 !== 3 || c % 2 === 0;
      break;
    case 'fortress':
      place = true;
      break;
    case 'fortressRing':
      place = r === 0 || r === rows - 1 || c === 0 || c === cols - 1 || (r === midR | 0);
      break;
    case 'fortressSplit':
      place = c < cols * 0.42 || c > cols * 0.58 || r < 2 || r > rows - 3;
      break;
    case 'pyramid':
      place = Math.abs(c - midC) <= (rows - 1 - r) + 0.5;
      break;
    case 'diamond':
      place = Math.abs(c - midC) / (midC || 1) + Math.abs(r - midR) / (midR || 1) <= 1.05;
      break;
    case 'columns':
      place = c % 3 !== 1;
      break;
    case 'checker':
      place = (r + c + absR) % 2 === 0;
      break;
    case 'arch':
      place = !(r < rows - 2 && Math.abs(c - midC) < cols * 0.2);
      break;
    case 'zigzag':
      place = ((r + c + Math.floor(seed * 0.01)) % 6) < 5;
      break;
    case 'spiral': {
      const ring = Math.min(r, c, rows - 1 - r, cols - 1 - c);
      place = ring % 2 === 0;
      break;
    }
    case 'frame':
      place = r === 0 || r === rows - 1 || c === 0 || c === cols - 1 || (r === (midR | 0) && c % 2 === 0);
      break;
    case 'towers':
      place = c % 4 < 2;
      break;
    case 'scatter':
      place = hash(r + seed, c - seed) > 0.08;
      break;
    case 'staircase': {
      const w = Math.max(2, Math.floor(cols * 0.38));
      const start = ((r + absR) * 2) % cols;
      place = ((c - start + cols) % cols) < w;
      break;
    }
    case 'tunnel':
      place = Math.abs(c - midC) > 1.2 || r < rows * 0.22 || r > rows * 0.78;
      break;
    case 'wave':
      place = Math.abs(c - midC - Math.sin(r * 0.72 + seed * 0.02) * cols * 0.3) <= cols * 0.45 + 1.6;
      break;
    case 'perlin':
      place = noise.perlin2(c * 0.28 + seed * 0.01, r * 0.28 + absR * 0.08) > -0.15;
      break;
    case 'split':
      place = c < cols * 0.38 || c > cols * 0.62;
      break;
    case 'cross':
      place = Math.abs(c - midC) <= 1.2 || Math.abs(r - midR) <= 0.8;
      break;
    case 'ring':
      place = Math.abs(Math.abs(c - midC) - cols * 0.28) < 1.3 || Math.abs(Math.abs(r - midR) - rows * 0.32) < 0.9;
      break;
    case 'cascade':
      place = (c + r * 2) % 8 !== 0;
      break;
    case 'hive':
      place = (c % 4 !== 1) || (r % 2 === 0) || (c + r) % 5 === 0;
      break;
    case 'gauntlet':
      place = Math.abs(c - midC) <= 2.5 || r < 1 || r >= rows - 1;
      break;
    case 'islands':
      place = hash(r * 3 + seed, c * 5) > 0.1 && hash(r + c, seed) > 0.1;
      break;
    case 'chevron':
      place = Math.abs(c - midC) <= r * 0.52 + 1.1 || Math.abs(c - midC) <= (rows - 1 - r) * 0.48 + 1;
      break;
    case 'braid':
      place = ((c + r + absR) % 5 !== 0) || ((c - r + cols) % 6 !== 1);
      break;
    case 'bulwark':
      place = c < 2 || c >= cols - 2 || (c + r) % 3 === 0;
      break;
    default:
      place = true;
  }
  if (!place) return false;
  if (!VOID_PATTERNS.has(pattern) && !LATTICE_PATTERNS.has(pattern)) {
    const jitterRate = isCompactLayout() && level <= 10 ? 0.05 : 0.07;
    if (!layoutJitter(r, c, seed, level, jitterRate)) return false;
  }
  if (SPARSE_PATTERN_IDS.has(pattern)) {
    const keep = Math.min(1, density * sparsePatternBoost * (level <= 6 ? 1.12 : 1.04));
    return rng() < keep;
  }
  return true;
}

function isGold(pattern, r, c, rows, cols, level, absR = r) {
  if (level < 2) return false;
  if (pattern === 'fortress' || pattern === 'fortressRing') {
    if (r === 0 || c === 0 || c === cols - 1) return true;
    if ((c === Math.floor(cols * 0.33) || c === Math.floor(cols * 0.66)) && r % 2 === 0) return true;
    return false;
  }
  if (pattern === 'fortressSplit' && (r === 0 || r === rows - 1)) return true;
  if (pattern === 'columns' && c % 3 === 0 && r === Math.floor(rows / 2)) return true;
  if (pattern === 'towers' && c % 4 === 0 && r % 3 === 0) return true;
  if (pattern === 'goldVein' && absR % 7 === 0 && c % 5 === 0) return level >= 4;
  return false;
}
