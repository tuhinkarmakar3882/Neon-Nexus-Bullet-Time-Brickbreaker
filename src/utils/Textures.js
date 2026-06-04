import Phaser from 'phaser';
import { BRICK, GAME } from '../config/Constants.js';

// Runtime canvas textures — Neon Nexus art direction:
// glass bricks, carbon paddle, plasma ball, soft particle trails.

/** @deprecated Use brickPanelInsets() for display-sized bricks. */
export const PANEL_SLICE = 22;
export const VAUS_SLICE = { l: 32, r: 32, t: 16, b: 16 };
export const PILL_SLICE = 20;

/** Bake textures at higher resolution on retina (display size unchanged in-game). */
function texDpr() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

function ts(n) {
  return Math.max(4, Math.round(n * texDpr()));
}

/** Safe nine-slice insets for on-screen brick size (avoids corner overlap on short tiles). */
export function brickPanelInsets(displayW, displayH) {
  const w = Math.max(8, Math.round(displayW));
  const h = Math.max(8, Math.round(displayH));
  const left = Math.min(Math.max(4, Math.round(w * 0.14)), Math.floor((w - 6) / 2));
  const top = Math.min(Math.max(3, Math.round(h * 0.24)), Math.floor((h - 6) / 2));
  return { left, right: left, top, bottom: top };
}

const PROCEDURAL_KEYS = [
  'soft', 'fx-glow', 'spark', 'spark-streak', 'spark-shard', 'trail-plasma', 'tile-chip',
  'ember', 'ring', 'pixel', 'bg-grad', 'panel', 'panel-gold', 'panel-steel', 'panel-hostage',
  'crack-1', 'crack-2', 'crack-3', 'vaus', 'orb', 'ball-core', 'ball-rim', 'shadow', 'pill',
  'gem', 'bullet-bolt',
];

const GLOW_TEXTURE_KEYS = new Set([
  'soft', 'fx-glow', 'spark', 'trail-plasma', 'ember', 'orb', 'shadow', 'ring',
]);

function ctxOf(scene, key, w, h) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvas = scene.textures.createCanvas(key, w, h);
  canvas.clear();
  return { canvas, ctx: canvas.getContext() };
}

function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

/** Zero RGB on fully transparent texels — stops linear-filter dark halos on sprite quads. */
function sanitizeTransparentRgb(canvasTex) {
  const ctx = canvasTex.getContext();
  const w = canvasTex.width;
  const h = canvasTex.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function fillRadialDisc(ctx, w, h, cx, cy, radius, stops) {
  clearCanvas(ctx, w, h);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  for (const [pos, color] of stops) g.addColorStop(pos, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function finishCanvas(scene, key, canvas) {
  sanitizeTransparentRgb(canvas);
  canvas.refresh();
  const tex = scene.textures.get(key);
  if (!tex?.setFilter) return;
  const nearest = Phaser.Textures?.FilterMode?.NEAREST ?? 0;
  const linear = Phaser.Textures?.FilterMode?.LINEAR ?? 1;
  try {
    tex.setFilter(GLOW_TEXTURE_KEYS.has(key) ? nearest : linear);
  } catch {
    /* older Phaser builds */
  }
}

function bakeBrickPanelTextures(scene) {
  const pw = ts(Math.max(120, Math.round(BRICK.WIDTH * 3)));
  const ph = ts(Math.max(44, Math.round(BRICK.HEIGHT * 3)));
  makePanelBrick(scene, 'panel', pw, ph, 'normal');
  makePanelBrick(scene, 'panel-gold', pw, ph, 'gold');
  makePanelBrick(scene, 'panel-steel', pw, ph, 'steel');
  makePanelBrick(scene, 'panel-hostage', pw, ph, 'hostage');
  makeCrack(scene, 'crack-1', pw, ph, 1);
  makeCrack(scene, 'crack-2', pw, ph, 2);
  makeCrack(scene, 'crack-3', pw, ph, 3);
}

/** Re-bake brick panels after viewport resize changes BRICK.WIDTH/HEIGHT. */
export function regenerateBrickPanelTextures(scene) {
  if (!scene?.textures) return;
  for (const key of ['panel', 'panel-gold', 'panel-steel', 'panel-hostage', 'crack-1', 'crack-2', 'crack-3']) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
  }
  bakeBrickPanelTextures(scene);
}

export function generateTextures(scene) {
  for (const key of PROCEDURAL_KEYS) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
  }
  makeSoftCircle(scene, 'soft', ts(48));
  makeFxGlow(scene, 'fx-glow', ts(32));
  makeSoftCircle(scene, 'spark', ts(20));
  makeSparkStreak(scene, 'spark-streak', ts(28), ts(10));
  makeSparkShard(scene, 'spark-shard', ts(14));
  makeTrailPlasma(scene, 'trail-plasma', ts(24));
  makeTileChip(scene, 'tile-chip', ts(12), ts(10));
  makeEmber(scene, 'ember', ts(18));
  makeRing(scene, 'ring', ts(128), ts(5));
  makePixel(scene, 'pixel');
  makeBgGradient(scene, 'bg-grad', ts(256), ts(256));
  bakeBrickPanelTextures(scene);
  makeVaus(scene, 'vaus', ts(280), ts(68));
  makeOrb(scene, 'orb', ts(96));
  makeBallCore(scene, 'ball-core', ts(44));
  makeBallRim(scene, 'ball-rim', ts(48));
  makeShadow(scene, 'shadow', ts(96), ts(48));
  makePill(scene, 'pill', ts(140), ts(52));
  makeGemCrystal(scene, 'gem', ts(64));
  makeBulletBolt(scene, 'bullet-bolt', ts(12), ts(40));
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

function makeBgGradient(scene, key, w = 256, h = 256) {
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  clearCanvas(ctx, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a0f1e');
  g.addColorStop(0.45, '#0a0d1c');
  g.addColorStop(1, '#05060c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rg = ctx.createRadialGradient(w / 2, h * 0.16, 0, w / 2, h * 0.16, w * 0.45);
  rg.addColorStop(0, 'rgba(47,230,199,0.14)');
  rg.addColorStop(1, 'rgba(90,160,255,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
  finishCanvas(scene, key, canvas);
}

function makeSoftCircle(scene, key, size) {
  const { canvas, ctx } = ctxOf(scene, key, size, size);
  const r = size / 2;
  fillRadialDisc(ctx, size, size, r, r, r, [
    [0, 'rgba(255,252,245,1)'],
    [0.35, 'rgba(255,255,255,0.75)'],
    [0.7, 'rgba(255,255,255,0.15)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  finishCanvas(scene, key, canvas);
}

/** Tint-friendly gameplay glow — less white core than `soft` (avoids blocky bursts). */
function makeFxGlow(scene, key, size) {
  const { canvas, ctx } = ctxOf(scene, key, size, size);
  const r = size / 2;
  fillRadialDisc(ctx, size, size, r, r, r, [
    [0, 'rgba(255,255,255,0.95)'],
    [0.45, 'rgba(200,230,255,0.55)'],
    [0.75, 'rgba(120,180,255,0.2)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  finishCanvas(scene, key, canvas);
}

function makeRing(scene, key, size, lineWidth) {
  const { canvas, ctx } = ctxOf(scene, key, size, size);
  clearCanvas(ctx, size, size);
  ctx.strokeStyle = 'rgba(255,248,235,0.95)';
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - lineWidth * 1.2, 0, Math.PI * 2);
  ctx.stroke();
  finishCanvas(scene, key, canvas);
}

function makePixel(scene, key) {
  const { canvas, ctx } = ctxOf(scene, key, 2, 2);
  clearCanvas(ctx, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 2, 2);
  finishCanvas(scene, key, canvas);
}

/**
 * Wide brick panel (matches on-screen aspect) — light ceramic base for clean tinting.
 * @param {'normal'|'gold'|'steel'|'hostage'} variant
 */
function makePanelBrick(scene, key, w, h, variant = 'normal') {
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  clearCanvas(ctx, w, h);
  const pad = Math.max(2, Math.round(h * 0.1));
  const r = Math.min(h * 0.34, w * 0.1, 12);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  roundRectPath(ctx, pad, pad, innerW, innerH, r);
  ctx.save();
  ctx.clip();

  if (variant === 'gold') {
    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, '#fff6d8');
    base.addColorStop(0.45, '#ffd050');
    base.addColorStop(1, '#a07018');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const shine = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    shine.addColorStop(0, 'rgba(255,255,255,0.5)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, w, h * 0.55);
  } else if (variant === 'steel') {
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#d0dce8');
    base.addColorStop(0.5, '#788898');
    base.addColorStop(1, '#303848');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    for (let y = pad + 10; y < h - pad; y += Math.max(10, Math.round(h * 0.22))) {
      ctx.beginPath();
      ctx.moveTo(pad + 6, y);
      ctx.lineTo(w - pad - 6, y);
      ctx.stroke();
    }
  } else if (variant === 'hostage') {
    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, '#6a3040');
    base.addColorStop(0.55, '#401820');
    base.addColorStop(1, '#240810');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,90,110,0.45)';
    ctx.lineWidth = Math.max(1, Math.round(h * 0.08));
    for (let x = pad + 10; x < w - pad - 6; x += Math.max(10, Math.round(w * 0.08))) {
      ctx.beginPath();
      ctx.moveTo(x, pad + 3);
      ctx.lineTo(x, h - pad - 3);
      ctx.stroke();
    }
  } else {
    const base = ctx.createLinearGradient(0, 0, w * 0.15, h);
    base.addColorStop(0, '#f6faff');
    base.addColorStop(0.42, '#e2ecf8');
    base.addColorStop(0.78, '#c8d4e8');
    base.addColorStop(1, '#a8b8d0');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const shine = ctx.createLinearGradient(0, 0, 0, h * 0.42);
    shine.addColorStop(0, 'rgba(255,255,255,0.42)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, w, h * 0.42);
    const depth = ctx.createLinearGradient(0, h * 0.62, 0, h);
    depth.addColorStop(0, 'rgba(12,18,32,0)');
    depth.addColorStop(1, 'rgba(12,18,32,0.14)');
    ctx.fillStyle = depth;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
  }

  ctx.restore();

  roundRectPath(ctx, pad, pad, innerW, innerH, r);
  ctx.lineWidth = Math.max(1.5, h * 0.06);
  if (variant === 'gold') ctx.strokeStyle = 'rgba(255,244,180,0.95)';
  else if (variant === 'steel') ctx.strokeStyle = 'rgba(168,200,232,0.9)';
  else if (variant === 'hostage') ctx.strokeStyle = 'rgba(255,90,110,0.9)';
  else ctx.strokeStyle = 'rgba(255,255,255,0.78)';
  ctx.stroke();

  finishCanvas(scene, key, canvas);
}

/** Seed capsule — organic pill for power-ups (category-tintable). */
function makePill(scene, key, w, h) {
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  clearCanvas(ctx, w, h);
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
  finishCanvas(scene, key, canvas);
}

/** Carbon paddle with luminous teal accent rail. */
function makeVaus(scene, key, w, h) {
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  clearCanvas(ctx, w, h);
  const r = h / 2;
  roundRectPath(ctx, 1, 1, w - 2, h - 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#3a4860');
  base.addColorStop(0.35, '#1a2030');
  base.addColorStop(0.7, '#121820');
  base.addColorStop(1, '#0a0c14');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const railY = h * 0.5;
  const rail = ctx.createLinearGradient(0, railY - 4, 0, railY + 4);
  rail.addColorStop(0, 'rgba(47,230,199,0)');
  rail.addColorStop(0.35, 'rgba(47,230,199,0.95)');
  rail.addColorStop(0.65, 'rgba(90,160,255,0.95)');
  rail.addColorStop(1, 'rgba(47,230,199,0)');
  ctx.fillStyle = rail;
  ctx.fillRect(VAUS_SLICE.l + 6, railY - 4, w - VAUS_SLICE.l - VAUS_SLICE.r - 12, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(VAUS_SLICE.l + 8, 3, w - VAUS_SLICE.l - VAUS_SLICE.r - 16, 2);
  ctx.restore();
  const cap = (cx) => {
    const capG = ctx.createRadialGradient(cx, h / 2, 0, cx, h / 2, h * 0.42);
    capG.addColorStop(0, '#5aa0ff');
    capG.addColorStop(0.55, '#2fe6c7');
    capG.addColorStop(1, '#1a2030');
    ctx.fillStyle = capG;
    ctx.beginPath();
    ctx.arc(cx, h / 2, h * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };
  cap(r + 1);
  cap(w - r - 1);
  roundRectPath(ctx, 1.5, 1.5, w - 3, h - 3, r);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(90,160,255,0.45)';
  ctx.stroke();
  finishCanvas(scene, key, canvas);
}

/** Ball energy halo — soft plasma bloom for tinting. */
function makeOrb(scene, key, s) {
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  fillRadialDisc(ctx, s, s, r, r, r, [
    [0, 'rgba(255,255,255,0.95)'],
    [0.25, 'rgba(200,240,255,0.65)'],
    [0.55, 'rgba(120,200,255,0.28)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  finishCanvas(scene, key, canvas);
}

/** Ball solid core — bright plasma sphere. */
function makeBallCore(scene, key, s) {
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  clearCanvas(ctx, s, s);
  const r = s / 2;
  const g = ctx.createRadialGradient(r * 0.68, r * 0.62, 0, r, r, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.28, '#e8f8ff');
  g.addColorStop(0.62, '#88c8ff');
  g.addColorStop(1, '#2a5088');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fill();
  const hi = ctx.createRadialGradient(r * 0.58, r * 0.42, 0, r * 0.58, r * 0.42, r * 0.32);
  hi.addColorStop(0, 'rgba(255,255,255,1)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fill();
  finishCanvas(scene, key, canvas);
}

/** Luminous outer ring — keeps ball readable without a heavy dark rim. */
function makeBallRim(scene, key, s) {
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  clearCanvas(ctx, s, s);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(r, r, r - 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,160,255,0.35)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.stroke();
  finishCanvas(scene, key, canvas);
}

function makeShadow(scene, key, w, h) {
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  clearCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.48);
  g.addColorStop(0, 'rgba(8,5,12,0.55)');
  g.addColorStop(0.55, 'rgba(8,5,12,0.2)');
  g.addColorStop(1, 'rgba(8,5,12,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.46, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  finishCanvas(scene, key, canvas);
}

/** Faceted garden crystal (tintable). */
function makeGemCrystal(scene, key, s) {
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.42;
  clearCanvas(ctx, s, s);
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
  finishCanvas(scene, key, canvas);
}

/** Laser / energy bolt (tintable vertical streak). */
function makeBulletBolt(scene, key, w, h) {
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  clearCanvas(ctx, w, h);
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
  finishCanvas(scene, key, canvas);
}

/** Soft plasma streak for motion trails. */
function makeSparkStreak(scene, key, w, h) {
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  clearCanvas(ctx, w, h);
  const g = ctx.createLinearGradient(0, h / 2, w, h / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.3, 'rgba(180,230,255,0.45)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.8, 'rgba(120,200,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.fill();
  finishCanvas(scene, key, canvas);
}

/** Soft circular plasma blob — primary ball trail particle. */
function makeTrailPlasma(scene, key, s) {
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  fillRadialDisc(ctx, s, s, r, r, r, [
    [0, 'rgba(255,255,255,1)'],
    [0.35, 'rgba(180,230,255,0.85)'],
    [0.65, 'rgba(90,160,255,0.35)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  finishCanvas(scene, key, canvas);
}

/** Angular shard for debris bursts. */
function makeSparkShard(scene, key, s) {
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  clearCanvas(ctx, s, s);
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
  finishCanvas(scene, key, canvas);
}

/** Ceramic tile chip for brick break debris. */
function makeTileChip(scene, key, w, h) {
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  clearCanvas(ctx, w, h);
  roundRectPath(ctx, 1, 1, w - 2, h - 2, 2);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#f0f8ff');
  g.addColorStop(0.5, '#b8d0e8');
  g.addColorStop(1, '#6888a8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  finishCanvas(scene, key, canvas);
}

/** Warm plasma ember for golden / fire trails. */
function makeEmber(scene, key, s) {
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  fillRadialDisc(ctx, s, s, r, r, r, [
    [0, 'rgba(255,255,240,1)'],
    [0.3, 'rgba(255,220,120,0.95)'],
    [0.6, 'rgba(255,140,60,0.5)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  finishCanvas(scene, key, canvas);
}

function makeCrack(scene, key, w, h, stage) {
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  clearCanvas(ctx, w, h);
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
  finishCanvas(scene, key, canvas);
}
