import { GAME } from '../config/Constants.js';

// Runtime canvas textures — Twilight Garden art direction:
// warm ceramic tiles, stained-wood paddle, dew-drop ball, seed capsules.

export const PANEL_SLICE = 24;
export const VAUS_SLICE = { l: 36, r: 36, t: 18, b: 18 };
export const PILL_SLICE = 20;

export function generateTextures(scene) {
  makeSoftCircle(scene, 'soft', 64);
  makeSoftCircle(scene, 'spark', 20);
  makeSparkStreak(scene, 'spark-streak', 32, 12);
  makeSparkShard(scene, 'spark-shard', 16);
  makeTileChip(scene, 'tile-chip', 14, 10);
  makeEmber(scene, 'ember', 18);
  makeRing(scene, 'ring', 128, 5);
  makePixel(scene, 'pixel');
  makeBgGradient(scene, 'bg-grad', 64, 64);
  makePanel(scene, 'panel', 128);
  makePanelGold(scene, 'panel-gold', 128);
  makePanelSteel(scene, 'panel-steel', 128);
  makePanelHostage(scene, 'panel-hostage', 128);
  makeVaus(scene, 'vaus', 280, 72);
  makeOrb(scene, 'orb', 112);
  makeBallCore(scene, 'ball-core', 48);
  makeShadow(scene, 'shadow', 96, 48);
  makePill(scene, 'pill', 140, 52);
  makeGemCrystal(scene, 'gem', 64);
  makeBulletBolt(scene, 'bullet-bolt', 12, 40);
  makeCrack(scene, 'crack-1', 96, 38, 1);
  makeCrack(scene, 'crack-2', 96, 38, 2);
  makeCrack(scene, 'crack-3', 96, 38, 3);
}

function ctxOf(scene, key, w, h) {
  const canvas = scene.textures.createCanvas(key, w, h);
  return { canvas, ctx: canvas.getContext() };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function makeBgGradient(scene, key) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, 64, 64);
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#1a0f24');
  g.addColorStop(0.45, '#120818');
  g.addColorStop(1, '#08050c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const rg = ctx.createRadialGradient(32, 10, 0, 32, 10, 58);
  rg.addColorStop(0, 'rgba(232,184,109,0.12)');
  rg.addColorStop(1, 'rgba(120,80,160,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, 64, 64);
  canvas.refresh();
}

function makeSoftCircle(scene, key, size) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, size, size);
  const r = size / 2;
  const grad = ctx.createRadialGradient(r * 0.92, r * 0.88, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,252,245,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}

function makeRing(scene, key, size, lineWidth) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, size, size);
  ctx.strokeStyle = 'rgba(255,248,235,0.95)';
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - lineWidth * 1.2, 0, Math.PI * 2);
  ctx.stroke();
  canvas.refresh();
}

function makePixel(scene, key) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 2, 2);
  canvas.refresh();
}

/** Ceramic garden tile — warm grayscale tints into rich terracotta / moss colors. */
function makePanel(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = 14;
  const pad = 2;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, s, s);
  base.addColorStop(0, '#f4ebe0');
  base.addColorStop(0.35, '#d4c4b0');
  base.addColorStop(0.72, '#a89278');
  base.addColorStop(1, '#6e5c4a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  // top-left light
  const hi = ctx.createRadialGradient(s * 0.22, s * 0.18, 0, s * 0.3, s * 0.25, s * 0.55);
  hi.addColorStop(0, 'rgba(255,255,255,0.45)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(0, 0, s, s);
  // bottom shadow
  const lo = ctx.createLinearGradient(0, s * 0.55, 0, s);
  lo.addColorStop(0, 'rgba(0,0,0,0)');
  lo.addColorStop(1, 'rgba(20,10,8,0.35)');
  ctx.fillStyle = lo;
  ctx.fillRect(0, s * 0.55, s, s * 0.45);
  // subtle grain
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 18; i++) {
    ctx.fillRect((i * 17) % s, (i * 23) % s, 1, 1);
  }
  ctx.restore();
  roundRectPath(ctx, pad + 1, pad + 1, s - pad * 2 - 2, s - pad * 2 - 2, r - 1);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,248,235,0.55)';
  ctx.stroke();
  roundRectPath(ctx, pad + 4, pad + 4, s - pad * 2 - 8, s - pad * 2 - 8, r - 3);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(40,24,16,0.2)';
  ctx.stroke();
  canvas.refresh();
}

/** Indestructible gold block — ornate metal, clearly not a garden tile. */
function makePanelGold(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = 12;
  const pad = 3;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, s, s);
  base.addColorStop(0, '#fff4c8');
  base.addColorStop(0.25, '#f0c050');
  base.addColorStop(0.55, '#c89028');
  base.addColorStop(0.85, '#8a6018');
  base.addColorStop(1, '#5c4010');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  // cross-hatch engraving
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  for (let i = -s; i < s * 2; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + s, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + s, 0);
    ctx.lineTo(i, s);
    ctx.stroke();
  }
  const shine = ctx.createLinearGradient(0, 0, 0, s);
  shine.addColorStop(0, 'rgba(255,255,255,0.55)');
  shine.addColorStop(0.35, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, s, s * 0.45);
  ctx.restore();
  // double frame
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff8d0';
  ctx.stroke();
  roundRectPath(ctx, pad + 5, pad + 5, s - pad * 2 - 10, s - pad * 2 - 10, r - 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#6a4808';
  ctx.stroke();
  // center gem
  const cx = s / 2;
  const cy = s / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 14);
  ctx.lineTo(cx + 12, cy);
  ctx.lineTo(cx, cy + 14);
  ctx.lineTo(cx - 12, cy);
  ctx.closePath();
  ctx.fillStyle = '#ffeaa0';
  ctx.fill();
  ctx.strokeStyle = '#fffef0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  canvas.refresh();
}

/** Indestructible steel block — cold industrial plate with rivets. */
function makePanelSteel(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = 8;
  const pad = 3;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, 0, s);
  base.addColorStop(0, '#b8c4d4');
  base.addColorStop(0.35, '#788898');
  base.addColorStop(0.7, '#505868');
  base.addColorStop(1, '#383e48');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  // horizontal plate seams
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  for (let y = 22; y < s; y += 18) {
    ctx.beginPath();
    ctx.moveTo(pad + 4, y);
    ctx.lineTo(s - pad - 4, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (let y = 14; y < s; y += 18) {
    ctx.beginPath();
    ctx.moveTo(pad + 6, y);
    ctx.lineTo(s - pad - 6, y);
    ctx.stroke();
  }
  ctx.restore();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#a8b8c8';
  ctx.stroke();
  // corner rivets
  const rivet = (rx, ry) => {
    ctx.beginPath();
    ctx.arc(rx, ry, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#404850';
    ctx.fill();
    ctx.strokeStyle = '#d0dce8';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  rivet(pad + 8, pad + 8);
  rivet(s - pad - 8, pad + 8);
  rivet(pad + 8, s - pad - 8);
  rivet(s - pad - 8, s - pad - 8);
  canvas.refresh();
}

/** Hostage brick — reinforced cage look. */
function makePanelHostage(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = 10;
  const pad = 3;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, s, s);
  base.addColorStop(0, '#6a4038');
  base.addColorStop(0.5, '#4a2820');
  base.addColorStop(1, '#301810');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(255,100,80,0.45)';
  ctx.lineWidth = 2;
  for (let x = 16; x < s - 12; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, pad + 4);
    ctx.lineTo(x, s - pad - 4);
    ctx.stroke();
  }
  ctx.restore();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ff6644';
  ctx.stroke();
  canvas.refresh();
}

/** Seed capsule — organic pill for power-ups (category-tintable). */
function makePill(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  const r = h / 2;
  roundRectPath(ctx, 1, 1, w - 2, h - 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#fff8ef');
  base.addColorStop(0.45, '#e8dcc8');
  base.addColorStop(1, '#9a8470');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const gloss = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  gloss.addColorStop(0, 'rgba(255,255,255,0.65)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, w, h * 0.55);
  ctx.restore();
  roundRectPath(ctx, 2, 2, w - 4, h - 4, r - 1);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,248,235,0.75)';
  ctx.stroke();
  canvas.refresh();
}

/** Stained-wood paddle with golden lantern stripe. */
function makeVaus(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  const r = h / 2;
  roundRectPath(ctx, 1, 1, w - 2, h - 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#c4a882');
  base.addColorStop(0.25, '#8b6848');
  base.addColorStop(0.55, '#5c4030');
  base.addColorStop(0.85, '#3d2818');
  base.addColorStop(1, '#2a1810');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // wood grain lines
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = 8 + i * (h / 6);
    ctx.beginPath();
    ctx.moveTo(VAUS_SLICE.l, y);
    ctx.lineTo(w - VAUS_SLICE.r, y + (i % 2 ? 2 : -2));
    ctx.stroke();
  }
  // golden groove
  const gy = h * 0.5;
  const grad = ctx.createLinearGradient(0, gy - 5, 0, gy + 5);
  grad.addColorStop(0, 'rgba(232,184,109,0)');
  grad.addColorStop(0.5, 'rgba(232,184,109,0.95)');
  grad.addColorStop(1, 'rgba(232,184,109,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(VAUS_SLICE.l + 4, gy - 5, w - VAUS_SLICE.l - VAUS_SLICE.r - 8, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 3, w, 2);
  ctx.restore();
  // metal end caps
  ctx.fillStyle = 'rgba(180,160,130,0.9)';
  ctx.beginPath();
  ctx.arc(r + 2, h / 2, h * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w - r - 2, h / 2, h * 0.18, 0, Math.PI * 2);
  ctx.fill();
  roundRectPath(ctx, 1.5, 1.5, w - 3, h - 3, r);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(232,184,109,0.45)';
  ctx.stroke();
  canvas.refresh();
}

/** Ball energy halo — warm white core for tinting. */
function makeOrb(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  const g = ctx.createRadialGradient(r * 0.85, r * 0.82, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,248,220,0.95)');
  g.addColorStop(0.45, 'rgba(255,220,180,0.55)');
  g.addColorStop(0.72, 'rgba(255,200,160,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(r, r, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  canvas.refresh();
}

/** Ball solid core texture. */
function makeBallCore(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  const g = ctx.createRadialGradient(r * 0.75, r * 0.7, 0, r, r, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#fff8ef');
  g.addColorStop(0.72, '#e8dcc8');
  g.addColorStop(1, '#a89278');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fill();
  const hi = ctx.createRadialGradient(r * 0.62, r * 0.48, 0, r * 0.62, r * 0.48, r * 0.35);
  hi.addColorStop(0, 'rgba(255,255,255,0.95)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  canvas.refresh();
}

function makeShadow(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(8,5,12,0.6)');
  g.addColorStop(0.55, 'rgba(8,5,12,0.25)');
  g.addColorStop(1, 'rgba(8,5,12,0)');
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  canvas.refresh();
}

/** Faceted garden crystal (tintable). */
function makeGemCrystal(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.42;
  ctx.clearRect(0, 0, s, s);
  // base diamond
  const pts = [
    [cx, cy - r],
    [cx + r * 0.72, cy - r * 0.15],
    [cx + r * 0.55, cy + r * 0.85],
    [cx - r * 0.55, cy + r * 0.85],
    [cx - r * 0.72, cy - r * 0.15],
  ];
  const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grad.addColorStop(0, '#f0ffff');
  grad.addColorStop(0.5, '#b8e8f0');
  grad.addColorStop(1, '#5a98a8');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
  // top facet highlight
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.72, cy - r * 0.15);
  ctx.lineTo(cx, cy + r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.stroke();
  canvas.refresh();
}

/** Laser / energy bolt (tintable vertical streak). */
function makeBulletBolt(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  const cx = w / 2;
  const grad = ctx.createLinearGradient(cx, 0, cx, h);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.35, 'rgba(255,240,220,0.9)');
  grad.addColorStop(1, 'rgba(255,200,160,0.2)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(w, h * 0.35);
  ctx.lineTo(cx + 2, h);
  ctx.lineTo(cx - 2, h);
  ctx.lineTo(0, h * 0.35);
  ctx.closePath();
  ctx.fill();
  canvas.refresh();
}

/** Elongated comet streak for ball trails and glances. */
function makeSparkStreak(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  const g = ctx.createLinearGradient(0, h / 2, w, h / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.25, 'rgba(255,252,245,0.55)');
  g.addColorStop(0.55, 'rgba(255,255,255,1)');
  g.addColorStop(0.85, 'rgba(255,248,235,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  canvas.refresh();
}

/** Angular shard for debris bursts. */
function makeSparkShard(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const cx = s / 2;
  const cy = s / 2;
  ctx.fillStyle = '#fff8ef';
  ctx.beginPath();
  ctx.moveTo(cx, 1);
  ctx.lineTo(s - 2, cy);
  ctx.lineTo(cx, s - 1);
  ctx.lineTo(2, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
  canvas.refresh();
}

/** Ceramic tile chip for brick break debris. */
function makeTileChip(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  roundRectPath(ctx, 1, 1, w - 2, h - 2, 2);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#f4ebe0');
  g.addColorStop(0.5, '#d4c4b0');
  g.addColorStop(1, '#8a7560');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  canvas.refresh();
}

/** Warm ember particle for golden trails and fire hits. */
function makeEmber(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  const g = ctx.createRadialGradient(r * 0.85, r * 0.85, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,220,1)');
  g.addColorStop(0.35, 'rgba(255,200,80,0.95)');
  g.addColorStop(0.65, 'rgba(255,120,40,0.55)');
  g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  canvas.refresh();
}

function makeCrack(scene, key, w, h, stage) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(20,8,6,0.7)';
  ctx.lineWidth = 1.5 + stage * 0.6;
  ctx.lineCap = 'round';
  const cracks = [
    [[0.18, 0.12], [0.42, 0.38], [0.28, 0.72], [0.55, 0.88]],
    [[0.72, 0.15], [0.48, 0.42], [0.68, 0.65]],
    [[0.35, 0.08], [0.62, 0.28], [0.38, 0.52], [0.72, 0.78]],
  ];
  for (let s = 0; s < stage; s++) {
    const path = cracks[s % cracks.length];
    ctx.beginPath();
    ctx.moveTo(w * path[0][0], h * path[0][1]);
    for (let i = 1; i < path.length; i++) ctx.lineTo(w * path[i][0], h * path[i][1]);
    ctx.stroke();
  }
  if (stage >= 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(w * 0.45, h * 0.4, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  canvas.refresh();
}
