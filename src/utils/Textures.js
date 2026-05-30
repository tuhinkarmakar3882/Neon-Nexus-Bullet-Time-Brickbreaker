import { GAME } from '../config/Constants.js';

// All art is generated at runtime as crisp canvas textures. Premium look comes
// from gradients, gloss, soft shadows and depth — rendered once, scaled with
// NineSlice so panels/paddle stay sharp at any size.

export const PANEL_SLICE = 28;
export const VAUS_SLICE = { l: 40, r: 40, t: 20, b: 20 };
export const PILL_SLICE = 22;

export function generateTextures(scene) {
  makeSoftCircle(scene, 'soft', 64);
  makeSoftCircle(scene, 'spark', 16);
  makeRing(scene, 'ring', 128, 6);
  makePixel(scene, 'pixel');
  makeBgGradient(scene, 'bg-grad', 64, 64);
  makePanel(scene, 'panel', 120);
  makeVaus(scene, 'vaus', 260, 64);
  makeOrb(scene, 'orb', 96);
  makeShadow(scene, 'shadow', 96, 48);
  makePill(scene, 'pill', 132, 46);
}

function ctxOf(scene, key, w, h) {
  const canvas = scene.textures.createCanvas(key, w, h);
  return { canvas, ctx: canvas.getContext() };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeBgGradient(scene, key) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, 64, 64);
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#0c1430');
  g.addColorStop(0.45, '#0a0d1c');
  g.addColorStop(1, '#05060c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  // soft top glow
  const rg = ctx.createRadialGradient(32, 8, 0, 32, 8, 60);
  rg.addColorStop(0, 'rgba(60,120,255,0.18)');
  rg.addColorStop(1, 'rgba(60,120,255,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, 64, 64);
  canvas.refresh();
}

function makeSoftCircle(scene, key, size) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, size, size);
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}

function makeRing(scene, key, size, lineWidth) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - lineWidth, 0, Math.PI * 2);
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

// Glossy rounded panel (tintable). Grayscale base so a tint reads as a shaded
// version of the brick color.
function makePanel(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = 22;
  roundRectPath(ctx, 1, 1, s - 2, s - 2, r);
  ctx.save();
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, 0, s);
  base.addColorStop(0, '#fbfdff');
  base.addColorStop(0.5, '#cfd6e6');
  base.addColorStop(1, '#8d96ac');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  // top gloss
  const gloss = ctx.createLinearGradient(0, 0, 0, s * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.55)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, s, s * 0.5);
  // bottom inner shadow
  const sh = ctx.createLinearGradient(0, s * 0.6, 0, s);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, s * 0.6, s, s * 0.4);
  ctx.restore();
  // crisp inner border
  roundRectPath(ctx, 2.5, 2.5, s - 5, s - 5, r - 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  canvas.refresh();
}

// Capsule pill (tintable) with gloss.
function makePill(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  const r = h / 2;
  roundRectPath(ctx, 1, 1, w - 2, h - 2, r);
  ctx.save(); ctx.clip();
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#ffffff');
  base.addColorStop(0.5, '#dfe5f2');
  base.addColorStop(1, '#aab3c8');
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  const gloss = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.7)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss; ctx.fillRect(0, 0, w, h * 0.5);
  ctx.restore();
  roundRectPath(ctx, 2, 2, w - 4, h - 4, r - 1);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
  canvas.refresh();
}

// Metallic Vaus paddle with central energy groove and bright caps.
function makeVaus(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  const r = h / 2;
  roundRectPath(ctx, 1, 1, w - 2, h - 2, r);
  ctx.save(); ctx.clip();
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#dfe8ff');
  base.addColorStop(0.18, '#aab8d6');
  base.addColorStop(0.5, '#5c6b88');
  base.addColorStop(0.82, '#3a465f');
  base.addColorStop(1, '#222b3d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  // top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(0, 2, w, 3);
  // energy groove
  const gy = h * 0.5;
  const grad = ctx.createLinearGradient(0, gy - 6, 0, gy + 6);
  grad.addColorStop(0, 'rgba(47,230,199,0.0)');
  grad.addColorStop(0.5, 'rgba(47,230,199,0.9)');
  grad.addColorStop(1, 'rgba(47,230,199,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(VAUS_SLICE.l, gy - 6, w - VAUS_SLICE.l - VAUS_SLICE.r, 12);
  ctx.restore();
  // caps
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(r + 4, h / 2, h * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w - r - 4, h / 2, h * 0.16, 0, Math.PI * 2); ctx.fill();
  // border
  roundRectPath(ctx, 1.5, 1.5, w - 3, h - 3, r);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(180,220,255,0.5)'; ctx.stroke();
  canvas.refresh();
}

// Energy orb (tintable): hot white core -> color -> transparent.
function makeOrb(scene, key, s) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, s, s);
  const r = s / 2;
  const g = ctx.createRadialGradient(r, r * 0.8, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.55, 'rgba(220,235,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  canvas.refresh();
}

function makeShadow(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = ctxOf(scene, key, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  canvas.refresh();
}
