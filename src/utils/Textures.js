import { GAME } from '../config/Constants.js';

// Runtime canvas textures — Neon Nexus art direction:
// glass bricks, carbon paddle, plasma ball, soft particle trails.

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

export function generateTextures(scene) {
  makeSoftCircle(scene, 'soft', ts(64));
  makeSoftCircle(scene, 'spark', ts(20));
  makeSparkStreak(scene, 'spark-streak', ts(28), ts(10));
  makeSparkShard(scene, 'spark-shard', ts(14));
  makeTrailPlasma(scene, 'trail-plasma', ts(24));
  makeTileChip(scene, 'tile-chip', ts(12), ts(10));
  makeEmber(scene, 'ember', ts(18));
  makeRing(scene, 'ring', ts(128), ts(5));
  makePixel(scene, 'pixel');
  makeBgGradient(scene, 'bg-grad', ts(256), ts(256));
  makePanel(scene, 'panel', ts(128));
  makePanelGold(scene, 'panel-gold', ts(128));
  makePanelSteel(scene, 'panel-steel', ts(128));
  makePanelHostage(scene, 'panel-hostage', ts(128));
  makeVaus(scene, 'vaus', ts(280), ts(68));
  makeOrb(scene, 'orb', ts(96));
  makeBallCore(scene, 'ball-core', ts(44));
  makeBallRim(scene, 'ball-rim', ts(48));
  makeShadow(scene, 'shadow', ts(96), ts(48));
  makePill(scene, 'pill', ts(140), ts(52));
  makeGemCrystal(scene, 'gem', ts(64));
  makeBulletBolt(scene, 'bullet-bolt', ts(12), ts(40));
  makeCrack(scene, 'crack-1', ts(96), ts(38), 1);
  makeCrack(scene, 'crack-2', ts(96), ts(38), 2);
  makeCrack(scene, 'crack-3', ts(96), ts(38), 3);
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

function makeBgGradient(scene, key, w = 256, h = 256) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
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

/** Glossy glass brick — light base for tint, luminous beveled edges. */
function makePanel(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = 10;
  const pad = 3;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, s * 0.2, s);
  base.addColorStop(0, '#f8fcff');
  base.addColorStop(0.4, '#dce8f4');
  base.addColorStop(0.75, '#b8c8dc');
  base.addColorStop(1, '#8898b0');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  const shine = ctx.createLinearGradient(0, 0, s, s);
  shine.addColorStop(0, 'rgba(255,255,255,0.55)');
  shine.addColorStop(0.35, 'rgba(255,255,255,0.08)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, s, s);
  const depth = ctx.createLinearGradient(0, s * 0.5, 0, s);
  depth.addColorStop(0, 'rgba(8,12,24,0)');
  depth.addColorStop(1, 'rgba(8,12,24,0.28)');
  ctx.fillStyle = depth;
  ctx.fillRect(0, s * 0.45, s, s * 0.55);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad + 8, pad + 10);
  ctx.lineTo(s - pad - 10, s - pad - 12);
  ctx.stroke();
  ctx.restore();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.stroke();
  roundRectPath(ctx, pad + 3, pad + 3, s - pad * 2 - 6, s - pad * 2 - 6, r - 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.stroke();
  canvas.refresh();
}

/** Indestructible gold block — radiant alloy plate. */
function makePanelGold(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = 10;
  const pad = 3;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, s, s);
  base.addColorStop(0, '#fff8d8');
  base.addColorStop(0.3, '#ffd860');
  base.addColorStop(0.65, '#d0a028');
  base.addColorStop(1, '#806018');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  for (let i = -s; i < s * 2; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + s, s);
    ctx.stroke();
  }
  const shine = ctx.createLinearGradient(0, 0, 0, s * 0.5);
  shine.addColorStop(0, 'rgba(255,255,255,0.65)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, s, s * 0.5);
  ctx.restore();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#fff4c0';
  ctx.stroke();
  const cx = s / 2;
  const cy = s / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx + 10, cy);
  ctx.lineTo(cx, cy + 12);
  ctx.lineTo(cx - 10, cy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,220,0.95)';
  ctx.fill();
  ctx.strokeStyle = '#fffef8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  canvas.refresh();
}

/** Indestructible steel block — dark chrome with cyan edge light. */
function makePanelSteel(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = 8;
  const pad = 3;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, 0, s);
  base.addColorStop(0, '#c8d4e4');
  base.addColorStop(0.35, '#788898');
  base.addColorStop(0.72, '#404858');
  base.addColorStop(1, '#282c38');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  for (let y = 20; y < s; y += 16) {
    ctx.beginPath();
    ctx.moveTo(pad + 6, y);
    ctx.lineTo(s - pad - 6, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(120,200,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad + 8, pad + 8);
  ctx.lineTo(s - pad - 8, pad + 8);
  ctx.stroke();
  ctx.restore();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#a8c8e8';
  ctx.stroke();
  [[pad + 8, pad + 8], [s - pad - 8, pad + 8], [pad + 8, s - pad - 8], [s - pad - 8, s - pad - 8]].forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#303848';
    ctx.fill();
    ctx.strokeStyle = '#d0e8ff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  canvas.refresh();
}

/** Hostage brick — alarm-red containment cell. */
function makePanelHostage(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = 9;
  const pad = 3;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, s, s);
  base.addColorStop(0, '#5a2830');
  base.addColorStop(0.5, '#381820');
  base.addColorStop(1, '#200810');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(255,90,110,0.55)';
  ctx.lineWidth = 2;
  for (let x = 14; x < s - 10; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, pad + 4);
    ctx.lineTo(x, s - pad - 4);
    ctx.stroke();
  }
  ctx.restore();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ff5a6e';
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

/** Carbon paddle with luminous teal accent rail. */
function makeVaus(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
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
  canvas.refresh();
}

/** Ball energy halo — soft plasma bloom for tinting. */
function makeOrb(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  const g = ctx.createRadialGradient(r * 0.88, r * 0.88, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.25, 'rgba(200,240,255,0.65)');
  g.addColorStop(0.55, 'rgba(120,200,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  canvas.refresh();
}

/** Ball solid core — bright plasma sphere. */
function makeBallCore(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
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
  canvas.refresh();
}

/** Luminous outer ring — keeps ball readable without a heavy dark rim. */
function makeBallRim(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  ctx.clearRect(0, 0, s, s);
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

/** Soft plasma streak for motion trails. */
function makeSparkStreak(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
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
  canvas.refresh();
}

/** Soft circular plasma blob — primary ball trail particle. */
function makeTrailPlasma(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  const g = ctx.createRadialGradient(r * 0.85, r * 0.85, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(180,230,255,0.85)');
  g.addColorStop(0.65, 'rgba(90,160,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
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
  g.addColorStop(0, '#f0f8ff');
  g.addColorStop(0.5, '#b8d0e8');
  g.addColorStop(1, '#6888a8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  canvas.refresh();
}

/** Warm plasma ember for golden / fire trails. */
function makeEmber(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  const g = ctx.createRadialGradient(r * 0.85, r * 0.85, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,240,1)');
  g.addColorStop(0.3, 'rgba(255,220,120,0.95)');
  g.addColorStop(0.6, 'rgba(255,140,60,0.5)');
  g.addColorStop(1, 'rgba(255,80,40,0)');
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
