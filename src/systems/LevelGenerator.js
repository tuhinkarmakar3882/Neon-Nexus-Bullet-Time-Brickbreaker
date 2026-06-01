import { GAME, BRICK, JARDINAIN, playfieldSideInset } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { themeForLevel } from '../config/Themes.js';
import { pickLevelGoal } from '../config/LevelGoals.js';
import { difficultyFor } from '../systems/DifficultyScaler.js';
import { clamp, mulberry32 } from '../utils/Helpers.js';
import { Noise } from '../utils/noise.js';

/** Level mutators — applied by ChallengeSystem on level start. */
export const MUTATORS = [
  'FastBall', 'LowVisibility', 'DoubleJardinains', 'NarrowArena',
  'WideArena', 'GnomeSwarm', 'BrickFrenzy', 'HeavyGravity',
  'PotMonsoon', 'GlassFloor', 'CannonsOnly', 'GnomeParliament', 'BrickBloom',
];

const PATTERN_DEFS = [
  { id: 'rows', minLevel: 1, weight: 8 },
  { id: 'pyramid', minLevel: 1, weight: 7 },
  { id: 'checker', minLevel: 1, weight: 6 },
  { id: 'columns', minLevel: 2, weight: 6 },
  { id: 'diamond', minLevel: 3, weight: 5 },
  { id: 'arch', minLevel: 4, weight: 6 },
  { id: 'zigzag', minLevel: 4, weight: 5 },
  { id: 'tunnel', minLevel: 5, weight: 6 },
  { id: 'wave', minLevel: 5, weight: 5 },
  { id: 'frame', minLevel: 6, weight: 5 },
  { id: 'towers', minLevel: 6, weight: 5 },
  { id: 'staircase', minLevel: 7, weight: 5 },
  { id: 'scatter', minLevel: 7, weight: 4 },
  { id: 'spiral', minLevel: 8, weight: 4 },
  { id: 'split', minLevel: 8, weight: 5 },
  { id: 'cross', minLevel: 9, weight: 4 },
  { id: 'ring', minLevel: 10, weight: 4 },
  { id: 'cascade', minLevel: 11, weight: 4 },
  { id: 'hive', minLevel: 12, weight: 4 },
  { id: 'gauntlet', minLevel: 13, weight: 3 },
  { id: 'islands', minLevel: 14, weight: 4 },
  { id: 'perlin', minLevel: 10, weight: 5 },
  { id: 'chevron', minLevel: 4, weight: 5 },
  { id: 'braid', minLevel: 6, weight: 4 },
  { id: 'bulwark', minLevel: 9, weight: 4 },
];

/** Layout families — zones pick from different groups so multi-zone levels feel distinct. */
const PATTERN_GROUPS = {
  dense: ['rows', 'pyramid', 'frame', 'fortress', 'fortressRing', 'fortressSplit', 'hive', 'cascade', 'bulwark'],
  lattice: ['checker', 'columns', 'diamond', 'cross', 'ring', 'split', 'braid'],
  organic: ['scatter', 'islands', 'perlin', 'wave', 'zigzag', 'chevron'],
  structural: ['arch', 'tunnel', 'staircase', 'towers', 'spiral', 'gauntlet'],
};

const SPARSE_PATTERN_IDS = new Set(['scatter', 'islands', 'ring', 'tunnel', 'perlin', 'zigzag']);

/** Target fill fraction per zone before gap-packing (holes stay for arch/tunnel). */
const PATTERN_FILL_TARGET = {
  rows: 0.98,
  pyramid: 0.96,
  frame: 0.96,
  fortress: 0.97,
  fortressRing: 0.95,
  fortressSplit: 0.93,
  hive: 0.94,
  cascade: 0.93,
  bulwark: 0.94,
  checker: 0.92,
  columns: 0.9,
  diamond: 0.9,
  braid: 0.91,
  chevron: 0.92,
  arch: 0.8,
  tunnel: 0.82,
  cross: 0.78,
  split: 0.88,
  wave: 0.9,
  scatter: 0.88,
  islands: 0.86,
  perlin: 0.9,
  ring: 0.85,
  zigzag: 0.9,
  staircase: 0.88,
  towers: 0.89,
  spiral: 0.87,
  gauntlet: 0.86,
};

const TWISTS = [
  { id: 'none', minLevel: 1, weight: 10 },
  { id: 'mirrored', minLevel: 3, weight: 4 },
  { id: 'sparse', minLevel: 14, weight: 1 },
  { id: 'explosiveCore', minLevel: 6, weight: 4 },
  { id: 'invisibleCrown', minLevel: 7, weight: 3 },
  { id: 'goldVein', minLevel: 5, weight: 3 },
  { id: 'shiftingBand', minLevel: 8, weight: 4 },
  { id: 'nestCluster', minLevel: 9, weight: 3 },
];

const TWIST_LABELS = {
  mirrored: 'MIRRORED',
  sparse: 'SPARSE',
  explosiveCore: 'BLAST CORE',
  invisibleCrown: 'GHOST CROWN',
  goldVein: 'GOLD VEIN',
  shiftingBand: 'SHIFT WALL',
  nestCluster: 'NEST SWARM',
};

function isMobileLayout() {
  return GAME.IS_PORTRAIT;
}

/** Rows that fit between header and paddle without clipping. */
function maxRowsForArena(top, bh) {
  const gap = BRICK.GAP;
  const bottom = (GAME.ARENA_FLOOR ?? GAME.HEIGHT) - gap * 2;
  return Math.max(6, Math.floor((bottom - top + gap) / (bh + gap)));
}

/**
 * Brick grid that always fits inside [arenaLeft, arenaRight] — never overflows the canvas.
 * @returns {{ cols: number, bw: number, bh: number, gap: number, gridW: number, gridLeft: number, gridRight: number }}
 */
function fitBrickLayout(arenaLeft, arenaRight) {
  const gap = BRICK.GAP;
  const bh = BRICK.HEIGHT;
  const arenaW = Math.max(80, arenaRight - arenaLeft);
  const minCols = isMobileLayout() ? 6 : 7;
  const maxCols = Math.floor((arenaW + gap) / (BRICK.WIDTH * 0.58 + gap));
  const idealCell = BRICK.WIDTH * 0.9;
  const minBw = BRICK.WIDTH * 0.66;

  let cols = Math.max(
    minCols,
    Math.min(maxCols, Math.floor((arenaW + gap) / (idealCell + gap))),
  );
  let bw = (arenaW - (cols - 1) * gap) / cols;

  while (cols > 4 && bw < minBw) {
    cols -= 1;
    bw = (arenaW - (cols - 1) * gap) / cols;
  }
  while (cols > 4 && cols * bw + (cols - 1) * gap > arenaW + 0.25) {
    cols -= 1;
    bw = (arenaW - (cols - 1) * gap) / cols;
  }
  bw = Math.min(BRICK.WIDTH, bw);

  const gridW = cols * bw + (cols - 1) * gap;
  const gridLeft = arenaLeft + Math.max(0, (arenaW - gridW) / 2);
  const gridRight = gridLeft + gridW;
  return { cols, bw, bh, gap, gridW, gridLeft, gridRight };
}

/** Drop or trim bricks that spill past the playable band (twists / moving bricks). */
function clampBricksInArena(bricks, left, right, top) {
  const bottom = (GAME.ARENA_FLOOR ?? GAME.HEIGHT) - BRICK.GAP * 2;
  for (let i = bricks.length - 1; i >= 0; i--) {
    const b = bricks[i];
    const edgeR = b.x + b.w;
    const edgeB = b.y + b.h;
    if (b.x < left - 0.5 || edgeR > right + 0.5 || b.y < top - 0.5 || edgeB > bottom + 0.5) {
      bricks.splice(i, 1);
      continue;
    }
    const cx = b.x + b.w / 2;
    const maxAmp = Math.max(0, Math.min(cx - left, right - cx) - b.w * 0.08);
    if (b.moveAmp > maxAmp) b.moveAmp = maxAmp;
  }
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
  const rowCap = Math.min(diff.layoutMaxRows, arenaMaxRows);

  const baseRows = isBoss
    ? 10 + (level % 2)
    : 7 + diff.rowBonus + diff.layoutRowBonus + (diff.rowJitter ?? 0) + (level % 2);
  const totalRows = clamp(baseRows, 7, rowCap);

  const fillDensity = Math.min(1, diff.patternDensity + diff.layoutDensityBoost + (level <= 4 ? 0.02 : 0));

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
      arenaLeft: gridLeft, top, level, levelSeed, noise, rng, diff, theme, typeRolls,
      nestBudget, isBoss: true, bossPlaced: { v: false },
      fillDensity,
      sparsePatternBoost: diff.sparsePatternBoost,
      level,
    });
    packZoneGaps(bricks, {
      pattern: variant, zoneRows: totalRows, rowOffset: 0, cols, bw, bh,
      arenaLeft: gridLeft, top, level, levelSeed, noise, theme, rng, diff,
    });
  } else {
    const zoneCount = diff.zoneCount;
    const zoneRows = splitRows(totalRows, zoneCount, rng);
    const zonePatterns = pickZonePatterns(level, levelSeed, zoneCount, rng);
    let rowOffset = 0;
    for (let z = 0; z < zoneCount; z++) {
      const pattern = zonePatterns[z];
      patternNames.push(pattern.toUpperCase());
      const budgetSlice = Math.ceil(nestBudget / (zoneCount - z));
      const zoneSeed = (levelSeed + z * 1337 + pattern.length * 97) >>> 0;
      fillZone(bricks, {
        pattern, zoneRows: zoneRows[z], rowOffset, cols, bw, bh,
        arenaLeft: gridLeft, top, level, levelSeed: zoneSeed, noise, rng, diff, theme, typeRolls,
        nestBudget: budgetSlice, isBoss: false, bossPlaced: { v: false },
        fillDensity,
        sparsePatternBoost: diff.sparsePatternBoost,
        level,
        zoneIndex: z,
        layoutVariant: (levelSeed + z * 41) & 7,
      });
      packZoneGaps(bricks, {
        pattern, zoneRows: zoneRows[z], rowOffset, cols, bw, bh,
        arenaLeft: gridLeft, top, level, levelSeed: zoneSeed, noise, theme, rng, diff,
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
  clampBricksInArena(bricks, arenaLeft, arenaRight, top);
  finalizeLevel(bricks, {
    theme,
    rng,
    layout: { bw, bh, arenaLeft: gridLeft, arenaRight, top, cols },
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
    twistLabel,
  };
}

function splitRows(total, zones, rng) {
  if (zones <= 1) return [total];
  const minPerZone = total >= zones * 3 ? 3 : 2;
  const out = new Array(zones).fill(minPerZone);
  let rem = total - minPerZone * zones;
  while (rem > 0) {
    const i = Math.floor(rng() * zones);
    if (out[i] < Math.ceil(total / zones) + 3) { out[i]++; rem--; }
    else rem--;
  }
  return out;
}

function patternGroup(id) {
  for (const [group, ids] of Object.entries(PATTERN_GROUPS)) {
    if (ids.includes(id)) return group;
  }
  return 'dense';
}

function patternFillTarget(pattern, level) {
  const base = PATTERN_FILL_TARGET[pattern] ?? 0.92;
  return Math.min(0.98, base + Math.min(0.04, (level - 1) * 0.002));
}

/**
 * Pick `zoneCount` patterns: level signature + weighted picks from unused layout families.
 */
function pickZonePatterns(level, levelSeed, zoneCount, rng) {
  const boost = isMobileLayout() ? 1 : 0;
  const eligible = PATTERN_DEFS.filter((p) => level + boost >= p.minLevel);
  const used = new Set();
  const usedGroups = new Set();
  const out = [];

  const earlyIds = new Set(['rows', 'pyramid', 'checker', 'columns', 'chevron', 'wave', 'frame']);
  const sigPool = level <= 6
    ? eligible.filter((p) => earlyIds.has(p.id))
    : eligible;
  const sigIdx = (level * 23 + (levelSeed >>> 4) + (levelSeed & 0xff)) % Math.max(1, sigPool.length);
  const signature = sigPool[sigIdx]?.id ?? eligible[0]?.id;
  if (signature) {
    out.push(signature);
    used.add(signature);
    usedGroups.add(patternGroup(signature));
  }

  while (out.length < zoneCount) {
    let pool = eligible.filter((p) => !used.has(p.id));
    const altGroup = pool.filter((p) => !usedGroups.has(patternGroup(p.id)));
    if (altGroup.length >= 2) pool = altGroup;
    if (!pool.length) {
      used.clear();
      usedGroups.clear();
      pool = [...eligible];
    }
    const picked = pickWeightedItem(pool, rng).id;
    out.push(picked);
    used.add(picked);
    usedGroups.add(patternGroup(picked));
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

function brickAtCell(arenaLeft, top, bw, bh, absR, c, rowShift = 0) {
  return {
    x: arenaLeft + c * (bw + BRICK.GAP) + rowShift,
    y: top + absR * (bh + BRICK.GAP),
    w: bw,
    h: bh,
    zoneRow: absR,
  };
}

/** Fill intentional gaps in a zone up to pattern-specific density (keeps arch/tunnel holes). */
function packZoneGaps(bricks, ctx) {
  const {
    pattern, zoneRows, rowOffset, cols, bw, bh, arenaLeft, top, level, levelSeed, noise, theme, rng, diff,
  } = ctx;
  const cellW = bw + BRICK.GAP;
  const cellH = bh + BRICK.GAP;
  const target = Math.floor(cols * zoneRows * patternFillTarget(pattern, level));

  const inZone = bricks.filter((b) => {
    const gr = Math.round((b.y - top) / cellH);
    return gr >= rowOffset && gr < rowOffset + zoneRows;
  });
  if (inZone.length >= target) return;

  const occupied = new Set();
  for (const b of inZone) {
    const gr = Math.round((b.y - top) / cellH);
    const gc = Math.round((b.x - arenaLeft) / cellW);
    occupied.add(`${gr},${gc}`);
  }

  const empties = [];
  for (let r = 0; r < zoneRows; r++) {
    const absR = rowOffset + r;
    for (let c = 0; c < cols; c++) {
      if (occupied.has(`${absR},${c}`)) continue;
      if (!exists(pattern, r, c, zoneRows, cols, (levelSeed ?? level * 17) + rowOffset, noise, rng, 1, absR, 1.1, level)) continue;
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
    const rowShift = (absR % 2 === 1) ? cellW * 0.05 : 0;
    bricks.push({
      ...brickAtCell(arenaLeft, top, bw, bh, absR, c, rowShift),
      type: 'normal',
      color: theme.bricks[(absR + c + rowOffset) % theme.bricks.length],
      moving: false,
      movePhase: rng() * Math.PI * 2,
      moveSpeed: (0.65 + rng() * 0.8) * diff.moveSpeedMult,
      moveAmp: 0,
    });
    need--;
  }
}

function fillZone(bricks, ctx) {
  const {
    pattern, zoneRows, rowOffset, cols, bw, bh, arenaLeft, top, level, levelSeed,
    noise, rng, diff, theme, typeRolls, nestBudget, isBoss, bossPlaced,
    fillDensity = diff.patternDensity,
    sparsePatternBoost = 1.05,
    zoneIndex = 0,
    layoutVariant = 0,
  } = ctx;
  let nests = nestBudget;
  const cellW = bw + BRICK.GAP;
  const colorOffset = zoneIndex * 2 + (layoutVariant & 1);

  for (let r = 0; r < zoneRows; r++) {
    const absR = rowOffset + r;
    const rowShift = (absR % 2 === 1)
      ? cellW * (0.04 + (layoutVariant % 4) * 0.015)
      : 0;
    for (let c = 0; c < cols; c++) {
      if (!exists(pattern, r, c, zoneRows, cols, levelSeed + rowOffset, noise, rng, fillDensity, absR, sparsePatternBoost, level)) continue;

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
        let t = typeRolls.explode;
        if (roll < t) { type = 'explosive'; color = PAL.explosive; }
        else if (roll < (t += typeRolls.silver)) { type = 'silver'; color = PAL.silver; }
        else if (roll < (t += typeRolls.reinforced)) { type = 'reinforced'; color = theme.bricks[(absR + c + 1) % theme.bricks.length]; }
        else if (roll < (t += typeRolls.invisible)) { type = 'invisible'; color = theme.bricks[(absR + c + 2) % theme.bricks.length]; }
        else if (nests > 0 && roll < (t += typeRolls.nest)) {
          if (rng() < typeRolls.hostage) { type = 'hostage'; color = 0x886644; }
          else { type = 'nest'; color = theme.bricks[(absR + 3) % theme.bricks.length]; }
          nests--;
        }
        else if (level >= 8 && roll < (t += typeRolls.tactical)) {
          const sub = rng();
          if (sub < typeRolls.mirror / typeRolls.tactical) { type = 'mirror'; color = 0xccccff; }
          else if (sub < (typeRolls.mirror + typeRolls.moss) / typeRolls.tactical) { type = 'moss'; color = 0x5a8860; }
          else if (sub < (typeRolls.mirror + typeRolls.moss + typeRolls.beehive) / typeRolls.tactical) { type = 'beehive'; color = 0xffcc44; }
          else if (sub < (typeRolls.mirror + typeRolls.moss + typeRolls.beehive + typeRolls.seedpod) / typeRolls.tactical) { type = 'seedpod'; color = 0x88cc66; }
          else { type = 'linked'; color = 0xaa88ff; }
        }
        else if (rng() < typeRolls.moving) {
          type = rng() < 0.55 ? 'shifting' : 'normal';
          moving = true;
        }
      }

      bricks.push({
        ...brickAtCell(arenaLeft, top, bw, bh, absR, c, rowShift),
        type, color, moving,
        movePhase: rng() * Math.PI * 2,
        moveSpeed: (0.65 + rng() * 1.1) * diff.moveSpeedMult,
        moveAmp: bw * (0.12 + rng() * 0.28) * (1 + diff.movingBoost * 0.5),
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
  const target = Math.max(min, Math.floor(layout.cols * 2.2));
  if (bricks.length >= target) return;
  min = target;
  if (bricks.length >= min) return;
  const { arenaLeft, top, bw, bh, cols } = layout;
  let row = 0;
  while (bricks.length < min && row < 10) {
    for (let c = 0; c < cols && bricks.length < min; c++) {
      bricks.push({
        x: arenaLeft + c * (bw + BRICK.GAP),
        y: top + row * (bh + BRICK.GAP),
        w: bw,
        h: bh,
        type: 'normal',
        color: theme.bricks[c % theme.bricks.length],
        moving: false,
        zoneRow: row,
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
  const { theme, rng, layout, isBoss, goal, mutators } = opts;
  const cannonsOnly = mutators?.includes('CannonsOnly');
  const cellW = layout.bw + BRICK.GAP;

  for (let pass = 0; pass < 5; pass++) {
    ensureMinBricks(bricks, layout, theme, rng);
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

    const valid = validateLevel(bricks, { layout, cannonsOnly, isBoss, goal }).valid;
    if (valid) return;
  }

  // Last-resort: flatten front row to normals
  const maxY = Math.max(...bricks.map((b) => b.y), 0);
  for (const b of bricks.filter((x) => x.y >= maxY - layout.bh * 0.5)) {
    if (!isBallClearableType(b.type, cannonsOnly)) demoteToNormal(b, theme, rng, true);
  }
  ensureClearPath(bricks, theme, rng, layout, cannonsOnly);
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

  if (twist === 'invisibleCrown') {
    const minY = Math.min(...bricks.map((b) => b.y));
    bricks.filter((b) => b.y <= minY + bh * 0.5).forEach((b) => {
      if (b.type !== 'gold' && b.type !== 'steel' && b.type !== 'boss') {
        b.type = 'invisible';
      }
    });
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

function exists(pattern, r, c, rows, cols, seed, noise, rng, density = 1, absR = r, sparsePatternBoost = 1.05, level = 1) {
  const midC = (cols - 1) / 2;
  const midR = (rows - 1) / 2;
  let place = true;
  switch (pattern) {
    case 'rows':
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
      place = c % 4 !== 2;
      break;
    case 'checker':
      place = (r + c + absR) % 2 === 0;
      break;
    case 'arch':
      place = !(r < rows - 2 && Math.abs(c - midC) < cols * 0.2);
      break;
    case 'zigzag':
      place = ((r + c + Math.floor(seed * 0.01)) % 5) < 3;
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
      place = hash(r + seed, c - seed) > 0.2;
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
      place = Math.abs(c - midC - Math.sin(r * 0.75 + seed * 0.02) * cols * 0.26) > 0.85;
      break;
    case 'perlin':
      place = noise.perlin2(c * 0.32 + seed * 0.01, r * 0.32 + absR * 0.1) > -0.18;
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
      place = (c + r * 2) % 6 !== 0;
      break;
    case 'hive':
      place = (c % 3 !== 1) || (r % 2 === 0) || (c + r) % 4 === 0;
      break;
    case 'gauntlet':
      place = Math.abs(c - midC) <= 2.5 || r < 1 || r >= rows - 1;
      break;
    case 'islands':
      place = hash(r * 3 + seed, c * 5) > 0.24 && hash(r + c, seed) > 0.22;
      break;
    case 'chevron':
      place = Math.abs(c - midC) <= r * 0.52 + 1.1 || Math.abs(c - midC) <= (rows - 1 - r) * 0.48 + 1;
      break;
    case 'braid':
      place = ((c + r + absR) % 3 !== 0) || ((c - r + cols) % 4 !== 1);
      break;
    case 'bulwark':
      place = c < 2 || c >= cols - 2 || (c + r) % 3 === 0;
      break;
    default:
      place = true;
  }
  if (!place) return false;
  if (SPARSE_PATTERN_IDS.has(pattern)) {
    const keep = Math.min(1, density * sparsePatternBoost * (level <= 4 ? 1.06 : 1));
    return rng() < keep;
  }
  if (level <= 3 && ['checker', 'columns', 'zigzag'].includes(pattern)) {
    return rng() < Math.min(1, 0.92 + density * 0.08);
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
