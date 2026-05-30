import { GAME, BRICK } from '../config/Constants.js';
import { rand, randInt, pick } from '../utils/Helpers.js';

// Generates brick layout data: [{ x, y, w, h, type }]. Pure data — the scene
// turns these into Brick game objects. Zone-aware and never produces an empty
// field. Scales with the responsive design resolution.

const LAYOUTS = ['grid', 'circle', 'diamond', 'tunnel', 'wave', 'perlin'];

export function randomBrickType() {
  const r = Math.random();
  const w = BRICK.WEIGHTS;
  let acc = 0;
  if (r < (acc += w.explode)) return 'explode';
  if (r < (acc += w.moving)) return 'moving';
  if (r < (acc += w.cannon)) return 'cannon';
  if (r < (acc += w.boss)) return 'boss';
  return 'static';
}

export function buildLevel(level) {
  const fieldTop = BRICK.TOP_MARGIN;
  const fieldHeight = GAME.HEIGHT * 0.5;
  const fieldLeft = Math.round(GAME.WIDTH * 0.04);
  const fieldWidth = GAME.WIDTH - fieldLeft * 2;

  const zoneCount = randInt(2, 3);
  const zoneHeight = fieldHeight / zoneCount;
  const pool = [...LAYOUTS];
  const bricks = [];

  for (let i = 0; i < zoneCount; i++) {
    const zone = {
      x: fieldLeft,
      y: fieldTop + i * zoneHeight,
      width: fieldWidth,
      height: zoneHeight - BRICK.GAP,
    };
    const idx = (Math.random() * pool.length) | 0;
    const layout = pool.length ? pool.splice(idx, 1)[0] : pick(LAYOUTS);
    generateZone(bricks, zone, layout, level);
  }

  if (bricks.length === 0) {
    generateZone(bricks, { x: fieldLeft, y: fieldTop, width: fieldWidth, height: zoneHeight }, 'grid', level);
  }
  return bricks;
}

function place(bricks, x, y, w, h) {
  bricks.push({ x, y, w, h, type: randomBrickType() });
}

function generateZone(bricks, zone, layout, level) {
  switch (layout) {
    case 'grid': return gridLayout(bricks, zone);
    case 'circle': return circleLayout(bricks, zone);
    case 'diamond': return diamondLayout(bricks, zone);
    case 'tunnel': return tunnelLayout(bricks, zone);
    case 'wave': return waveLayout(bricks, zone, level);
    case 'perlin': return perlinLayout(bricks, zone, level);
    default: return gridLayout(bricks, zone);
  }
}

function colsRows(zone) {
  const cols = Math.max(4, Math.floor(zone.width / (BRICK.WIDTH + BRICK.GAP)));
  const rows = Math.max(1, Math.floor(zone.height / (BRICK.HEIGHT + BRICK.GAP)));
  const bw = (zone.width - (cols - 1) * BRICK.GAP) / cols;
  return { cols, rows, bw, bh: BRICK.HEIGHT };
}

function gridLayout(bricks, zone) {
  const { cols, rows, bw, bh } = colsRows(zone);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() < 0.1) continue;
      place(bricks, zone.x + c * (bw + BRICK.GAP), zone.y + r * (bh + BRICK.GAP), bw, bh);
    }
  }
}

function tunnelLayout(bricks, zone) {
  const { cols, rows, bw, bh } = colsRows(zone);
  const gapStart = Math.floor(cols * 0.42);
  const gapEnd = Math.ceil(cols * 0.58);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c >= gapStart && c < gapEnd) continue;
      place(bricks, zone.x + c * (bw + BRICK.GAP), zone.y + r * (bh + BRICK.GAP), bw, bh);
    }
  }
}

function waveLayout(bricks, zone, level) {
  const { cols, rows, bw, bh } = colsRows(zone);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const phase = (c / cols + level / 10) * Math.PI * 2;
      const offset = Math.sin(phase) * (bh * 0.5);
      place(bricks, zone.x + c * (bw + BRICK.GAP), zone.y + r * (bh + BRICK.GAP) + offset, bw, bh);
    }
  }
}

function circleLayout(bricks, zone) {
  const cx = zone.x + zone.width / 2;
  const cy = zone.y + zone.height / 2;
  const radius = Math.min(zone.width, zone.height) / 2.3;
  const total = Math.max(12, Math.round(radius / (BRICK.WIDTH * 0.6)));
  for (let i = 0; i < total; i++) {
    const a = (Math.PI * 2 * i) / total;
    place(bricks, cx + Math.cos(a) * radius - BRICK.WIDTH / 2, cy + Math.sin(a) * radius - BRICK.HEIGHT / 2, BRICK.WIDTH, BRICK.HEIGHT);
  }
}

function diamondLayout(bricks, zone) {
  const cx = zone.x + zone.width / 2;
  const cy = zone.y + zone.height / 2;
  const layers = 4;
  const stepX = BRICK.WIDTH + BRICK.GAP;
  const stepY = BRICK.HEIGHT + BRICK.GAP;
  for (let i = -layers; i <= layers; i++) {
    const count = layers - Math.abs(i) + 1;
    for (let j = 0; j < count; j++) {
      place(bricks, cx + (j - (count - 1) / 2) * stepX - BRICK.WIDTH / 2, cy + i * stepY - BRICK.HEIGHT / 2, BRICK.WIDTH, BRICK.HEIGHT);
    }
  }
}

function perlinLayout(bricks, zone, level) {
  const { cols, rows, bw, bh } = colsRows(zone);
  const seed = level * 13.37 + rand(0, 100);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (valueNoise(c * 0.6 + seed, r * 0.6) > 0.52) {
        place(bricks, zone.x + c * (bw + BRICK.GAP), zone.y + r * (bh + BRICK.GAP), bw, bh);
      }
    }
  }
}

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function smooth(t) { return t * t * (3 - 2 * t); }
function valueNoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const tx = smooth(x - x0), ty = smooth(y - y0);
  const v00 = hash(x0, y0), v10 = hash(x0 + 1, y0);
  const v01 = hash(x0, y0 + 1), v11 = hash(x0 + 1, y0 + 1);
  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return a + (b - a) * ty;
}
