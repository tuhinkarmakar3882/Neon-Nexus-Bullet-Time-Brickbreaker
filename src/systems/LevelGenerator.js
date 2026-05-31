import { GAME, BRICK, JARDINAIN } from '../config/Constants.js';
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
];

const TWISTS = [
  { id: 'none', minLevel: 1, weight: 10 },
  { id: 'mirrored', minLevel: 3, weight: 4 },
  { id: 'sparse', minLevel: 4, weight: 3 },
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

/** Portrait phones get denser, multi-zone layouts earlier. */
function mobileLevelBoost(level) {
  if (!isMobileLayout()) return { rowBonus: 0, densityBoost: 0, maxRows: 16 };
  return {
    rowBonus: 2 + Math.floor(level / 3),
    densityBoost: 0.05,
    maxRows: 20,
  };
}

export function buildLevel(level, campaignSeed = 12345) {
  const diff = difficultyFor(level);
  const mobile = mobileLevelBoost(level);
  const levelSeed = (campaignSeed + level * 997) >>> 0;
  const rng = mulberry32(levelSeed);
  const noise = new Noise(levelSeed ^ 0xabc123);
  const theme = themeForLevel(level, levelSeed);
  const isBoss = level % GAME.BOSS_EVERY === 0;

  const arenaLeft = GAME.WALL_X + BRICK.GAP;
  const arenaRight = GAME.WIDTH - GAME.WALL_X - BRICK.GAP;
  const arenaW = arenaRight - arenaLeft;
  const top = GAME.WALL_TOP + BRICK.GAP * 2;

  const cols = Math.max(6, Math.floor((arenaW + BRICK.GAP) / (BRICK.WIDTH + BRICK.GAP)));
  const bw = (arenaW - (cols - 1) * BRICK.GAP) / cols;
  const bh = BRICK.HEIGHT;

  const rowJitter = (rng() * 2.4 | 0) - 1;
  const totalRows = isBoss
    ? 11 + (rng() > 0.5 ? 1 : 0) + (mobile.rowBonus > 0 ? 1 : 0)
    : clamp(
      6 + diff.rowBonus + mobile.rowBonus + rowJitter + (rng() < 0.45 ? 1 : 0) + (isMobileLayout() ? 1 : 0),
      6,
      mobile.maxRows,
    );

  const fillDensity = Math.min(1, diff.patternDensity + mobile.densityBoost);

  const twist = isBoss ? 'none' : pickWeighted(TWISTS.filter((t) => level >= t.minLevel), rng);
  const mutators = pickMutators(level, rng, diff, isBoss);
  const mutator = mutators[0] ?? null;
  const gravityScale = pickGravity(level, rng, twist, diff);
  const goal = pickLevelGoal(level, levelSeed, isBoss);

  const typeRolls = buildTypeRolls(level, diff, rng);
  let nestBudget = Math.min(diff.gnomeMaxAlive, Math.max(2, 1 + Math.floor(level / 2) + (rng() > 0.7 ? 1 : 0)));

  const bricks = [];
  const patternNames = [];
  const usedPatterns = new Set();

  if (isBoss) {
    const variant = ['fortress', 'fortressRing', 'fortressSplit'][Math.floor(rng() * 3)];
    patternNames.push(variant.toUpperCase());
    fillZone(bricks, {
      pattern: variant, zoneRows: totalRows, rowOffset: 0, cols, bw, bh,
      arenaLeft, top, level, levelSeed, noise, rng, diff, theme, typeRolls,
      nestBudget, isBoss: true, bossPlaced: { v: false },
      fillDensity,
    });
  } else {
    const zoneCount = pickZoneCount(level, rng);
    const zoneRows = splitRows(totalRows, zoneCount, rng);
    let rowOffset = 0;
    for (let z = 0; z < zoneCount; z++) {
      const pattern = pickPattern(level, rng, usedPatterns);
      usedPatterns.add(pattern);
      patternNames.push(pattern.toUpperCase());
      const budgetSlice = Math.ceil(nestBudget / (zoneCount - z));
      fillZone(bricks, {
        pattern, zoneRows: zoneRows[z], rowOffset, cols, bw, bh,
        arenaLeft, top, level, levelSeed: levelSeed + z * 1337, noise, rng, diff, theme, typeRolls,
        nestBudget: budgetSlice, isBoss: false, bossPlaced: { v: false },
        fillDensity,
      });
      nestBudget -= budgetSlice;
      rowOffset += zoneRows[z];
    }
  }

  ensurePlayable(bricks, theme, rng);
  applyTwist(bricks, twist, cols, bw, bh, arenaLeft, top, rng, level);
  placePortals(bricks, rng, level);
  clusterExplosives(bricks, rng, level);
  linkBrickPairs(bricks, rng);
  finalizeLevel(bricks, {
    theme,
    rng,
    layout: { bw, bh, arenaLeft, top, cols },
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

function pickZoneCount(level, rng) {
  if (isMobileLayout()) {
    if (level <= 2) return rng() < 0.5 ? 2 : 1;
    if (level <= 5) return rng() < 0.3 ? 2 : 3;
    if (level <= 12) return rng() < 0.2 ? 2 : rng() < 0.65 ? 3 : 4;
    return rng() < 0.12 ? 3 : 4;
  }
  if (level <= 2) return 1;
  if (level <= 4) return rng() < 0.45 ? 1 : 2;
  if (level <= 10) return rng() < 0.2 ? 1 : rng() < 0.7 ? 2 : 3;
  if (level <= 18) return rng() < 0.1 ? 2 : rng() < 0.5 ? 3 : 4;
  return rng() < 0.2 ? 3 : 4;
}

function splitRows(total, zones, rng) {
  if (zones <= 1) return [total];
  const out = new Array(zones).fill(1);
  let rem = total - zones;
  while (rem > 0) {
    const i = Math.floor(rng() * zones);
    if (out[i] < Math.ceil(total / zones) + 2) { out[i]++; rem--; }
    else rem--;
  }
  return out;
}

function pickPattern(level, rng, used) {
  const boost = isMobileLayout() ? 2 : 0;
  const pool = PATTERN_DEFS.filter((p) => level + boost >= p.minLevel && !used.has(p.id));
  return pickWeightedItem(pool.length ? pool : PATTERN_DEFS, rng).id;
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
  if (rng() < 0.32) {
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
  if (!isBoss && rng() > clamp(0.35 + (level - diff.mutatorMinLevel) * 0.04, 0.35, 0.85)) return null;
  return pool[Math.floor(rng() * pool.length)];
}

function pickGravity(level, rng, twist, diff) {
  let g = 1;
  if (twist === 'heavyGravity' || twist === 'HeavyGravity') g = 1.35;
  if (level >= 22 && rng() < 0.2) g = 0.65;
  else if (level >= 14 && rng() < 0.25) g = 1.35;
  else if (level % 11 === 0 && rng() < 0.5) g = 0.72;
  else if (rng() < 0.12) g = rng() < 0.5 ? 0.78 : 1.28;
  if (diff.band >= 3 && rng() < 0.18) g *= 1.08;
  return clamp(g, 0.6, 1.45);
}

function buildTypeRolls(level, diff, rng) {
  const bias = rng() * 0.04;
  const tactical = level >= 8 ? clamp(0.02 + level * 0.003, 0, 0.12) : 0;
  return {
    explode: clamp(0.05 + level * 0.0028 + bias, 0.05, 0.16),
    silver: clamp(0.04 + level * 0.032 + bias, 0, 0.48),
    reinforced: level >= 4 ? clamp(0.06 + level * 0.006, 0, 0.28) : 0,
    invisible: level >= 4 ? clamp(0.05 + level * 0.005, 0, 0.26) : 0,
    moving: level >= 3 ? clamp(0.05 + (level - 3) * 0.014 + diff.movingBoost, 0, 0.42) : 0,
    nest: clamp(0.08 + level * 0.005, 0.08, 0.26),
    tactical,
    mirror: tactical * 0.35,
    moss: tactical * 0.35,
    beehive: level >= 10 ? tactical * 0.4 : 0,
    seedpod: level >= 12 ? tactical * 0.35 : 0,
    linked: level >= 14 ? tactical * 0.25 : 0,
    hostage: level >= 6 ? clamp(0.03 + level * 0.002, 0, 0.1) : 0,
  };
}

function fillZone(bricks, ctx) {
  const {
    pattern, zoneRows, rowOffset, cols, bw, bh, arenaLeft, top, level, levelSeed,
    noise, rng, diff, theme, typeRolls, nestBudget, isBoss, bossPlaced,
    fillDensity = diff.patternDensity,
  } = ctx;
  let nests = nestBudget;

  for (let r = 0; r < zoneRows; r++) {
    const absR = rowOffset + r;
    for (let c = 0; c < cols; c++) {
      if (!exists(pattern, r, c, zoneRows, cols, levelSeed + rowOffset, noise, rng, fillDensity, absR)) continue;

      let type = 'normal';
      let color = theme.bricks[(absR + c) % theme.bricks.length];
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
        x: arenaLeft + c * (bw + BRICK.GAP),
        y: top + absR * (bh + BRICK.GAP),
        w: bw, h: bh, type, color, moving,
        movePhase: rng() * Math.PI * 2,
        moveSpeed: (0.65 + rng() * 1.1) * diff.moveSpeedMult,
        moveAmp: bw * (0.12 + rng() * 0.28) * (1 + diff.movingBoost * 0.5),
        zoneRow: absR,
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

function ensureMinBricks(bricks, layout, theme, rng, min = 12) {
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

function applyTwist(bricks, twist, cols, bw, bh, arenaLeft, top, rng, level) {
  if (twist === 'none' || !bricks.length) return;
  const arenaRight = arenaLeft + cols * (bw + BRICK.GAP) - BRICK.GAP;

  if (twist === 'mirrored') {
    for (const b of bricks) {
      const rel = b.x - arenaLeft;
      b.x = arenaRight - rel - b.w;
    }
  }

  if (twist === 'sparse') {
    const cands = bricks.filter((b) => !['gold', 'steel', 'boss'].includes(b.type));
    const sparseRatio = isMobileLayout() ? 0.03 + rng() * 0.04 : 0.05 + rng() * 0.06;
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
  if (level < 6 || rng() > 0.45) return;
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

function exists(pattern, r, c, rows, cols, seed, noise, rng, density = 1, absR = r) {
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
      place = c % 3 !== 1;
      break;
    case 'checker':
      place = (r + c + absR) % 2 === 0;
      break;
    case 'arch':
      place = !(r < rows - 2 && Math.abs(c - midC) < cols * 0.2);
      break;
    case 'zigzag':
      place = ((r + c + Math.floor(seed * 0.01)) % 4) < 2;
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
      place = hash(r + seed, c - seed) > 0.38;
      break;
    case 'staircase': {
      const w = Math.max(2, Math.floor(cols * 0.38));
      const start = ((r + absR) * 2) % cols;
      place = ((c - start + cols) % cols) < w;
      break;
    }
    case 'tunnel':
      place = Math.abs(c - midC) > 1.5 || r < rows * 0.28 || r > rows * 0.72;
      break;
    case 'wave':
      place = Math.abs(c - midC - Math.sin(r * 0.75 + seed * 0.02) * cols * 0.28) > 1.1;
      break;
    case 'perlin':
      place = noise.perlin2(c * 0.32 + seed * 0.01, r * 0.32 + absR * 0.1) > -0.08;
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
      place = (c + r * 2) % 5 !== 0;
      break;
    case 'hive':
      place = (c % 3 !== 1) || (r % 2 === 0);
      break;
    case 'gauntlet':
      place = Math.abs(c - midC) <= 2.5 || r < 1 || r >= rows - 1;
      break;
    case 'islands':
      place = hash(r * 3 + seed, c * 5) > 0.42 && hash(r + c, seed) > 0.35;
      break;
    default:
      place = true;
  }
  if (!place) return false;
  return density >= 1 || rng() < density;
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
