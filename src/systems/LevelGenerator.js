import { GAME, BRICK, JARDINAIN } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { themeFor } from '../config/Themes.js';
import { clamp } from '../utils/Helpers.js';

// Tactical, Arkanoid-flavoured layouts with PER-LEVEL THEMES so every level is
// visually distinct. Layout pattern and theme advance on different cycles, so
// the theme×pattern combination doesn't repeat for ~60 levels.

const PATTERNS = ['rows', 'pyramid', 'diamond', 'columns', 'checker', 'arch',
  'zigzag', 'spiral', 'frame', 'towers', 'scatter', 'staircase'];

export function buildLevel(level) {
  const theme = themeFor(level);
  const isBoss = level % GAME.BOSS_EVERY === 0;
  const pattern = isBoss ? 'fortress' : PATTERNS[(level * 5) % PATTERNS.length];

  const arenaLeft = GAME.WALL_X + BRICK.GAP;
  const arenaRight = GAME.WIDTH - GAME.WALL_X - BRICK.GAP;
  const arenaW = arenaRight - arenaLeft;
  const top = GAME.WALL_TOP + BRICK.GAP * 2;

  const cols = Math.max(6, Math.floor((arenaW + BRICK.GAP) / (BRICK.WIDTH + BRICK.GAP)));
  const bw = (arenaW - (cols - 1) * BRICK.GAP) / cols;
  const bh = BRICK.HEIGHT;
  const rows = isBoss ? 8 : clamp(4 + ((level + 1) % 5), 4, 8);

  const silverChance = clamp(0.05 + level * 0.025, 0, 0.34);
  const explodeChance = 0.055;
  let nestBudget = Math.min(JARDINAIN.MAX_ALIVE, 1 + Math.floor(level / 2));

  const seed = level * 97.13;
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!exists(pattern, r, c, rows, cols, seed)) continue;

      let type = 'normal';
      let color = theme.bricks[r % theme.bricks.length];

      if (isGold(pattern, r, c, rows, cols, level)) { type = 'gold'; color = PAL.gold; }
      else {
        const roll = Math.random();
        if (roll < explodeChance) { type = 'explosive'; color = PAL.explosive; }
        else if (roll < explodeChance + silverChance) { type = 'silver'; color = PAL.silver; }
        else if (nestBudget > 0 && Math.random() < 0.12) { type = 'nest'; color = theme.bricks[(r + 3) % theme.bricks.length]; nestBudget--; }
      }

      bricks.push({ x: arenaLeft + c * (bw + BRICK.GAP), y: top + r * (bh + BRICK.GAP), w: bw, h: bh, type, color });
    }
  }

  if (!bricks.some((b) => b.type !== 'gold')) {
    bricks.forEach((b) => { if (Math.random() < 0.4) { b.type = 'normal'; b.color = theme.bricks[0]; } });
  }
  return { bricks, isBoss, theme };
}

function hash(a, b) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function exists(pattern, r, c, rows, cols, seed) {
  const midC = (cols - 1) / 2;
  const midR = (rows - 1) / 2;
  switch (pattern) {
    case 'rows':
    case 'fortress':
      return true;
    case 'pyramid':
      return Math.abs(c - midC) <= (rows - 1 - r) + 0.5;
    case 'diamond':
      return Math.abs(c - midC) / midC + Math.abs(r - midR) / midR <= 1.05;
    case 'columns':
      return c % 3 !== 1;
    case 'checker':
      return (r + c) % 2 === 0;
    case 'arch':
      return !(r < rows - 2 && Math.abs(c - midC) < cols * 0.18);
    case 'zigzag':
      return ((r + c) % 4) < 2;
    case 'spiral': {
      const ring = Math.min(r, c, rows - 1 - r, cols - 1 - c);
      return ring % 2 === 0;
    }
    case 'frame':
      return r === 0 || r === rows - 1 || c === 0 || c === cols - 1 || (r === midR | 0 && c % 2 === 0);
    case 'towers':
      return c % 4 < 2;
    case 'scatter':
      return hash(r + seed, c - seed) > 0.4;
    case 'staircase': {
      const w = Math.max(2, Math.floor(cols * 0.4));
      const start = (r * 2) % cols;
      return ((c - start + cols) % cols) < w;
    }
    default:
      return true;
  }
}

function isGold(pattern, r, c, rows, cols, level) {
  if (level < 2) return false;
  if (pattern === 'fortress') {
    if (r === 0 || c === 0 || c === cols - 1) return true;
    if ((c === Math.floor(cols * 0.33) || c === Math.floor(cols * 0.66)) && r % 2 === 0) return true;
    return false;
  }
  if (pattern === 'columns' && c % 3 === 0 && r === Math.floor(rows / 2)) return true;
  if (pattern === 'towers' && c % 4 === 0 && r % 3 === 0) return true;
  return false;
}
