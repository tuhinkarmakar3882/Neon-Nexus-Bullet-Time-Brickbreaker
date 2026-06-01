/** Premium branded share card + Web Share API / download fallback. */

import { SCENES } from '../config/Constants.js';
import { buildShareMessage, getGameUrl, MARKETING, shareTitle } from '../config/ShareConfig.js';
import { MetaProgress } from './MetaProgress.js';
import { canvasFont, ensureFontsLoaded } from '../utils/Typography.js';

const CARD_W = 1080;
const CARD_H = 1350;

const NEON = {
  teal: '#2fe6c7',
  magenta: '#ff4fa3',
  amber: '#ffb24d',
  violet: '#9b8cff',
  sky: '#5aa0ff',
  cream: '#e8eefc',
};

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function canvasHasContent(src) {
  if (!src?.width) return false;
  const s = document.createElement('canvas');
  s.width = 48;
  s.height = 48;
  const c = s.getContext('2d');
  c.drawImage(src, 0, 0, 48, 48);
  const px = c.getImageData(0, 0, 48, 48).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2];
  return sum / (px.length / 4) / 3 > 18;
}

function fillGradientText(ctx, text, cx, cy, font, stops) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  const g = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
  stops.forEach(([pos, color]) => g.addColorStop(pos, color));
  ctx.fillStyle = g;
  ctx.shadowColor = stops[1]?.[1] ?? NEON.teal;
  ctx.shadowBlur = 24;
  ctx.fillText(text, cx, cy);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawChaosField(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1a0a28');
  bg.addColorStop(0.35, '#0c0614');
  bg.addColorStop(1, '#040208');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const beams = [
    [w * 0.9, h * 0.05, 'rgba(255, 79, 163, 0.28)', 'rgba(255, 79, 163, 0)'],
    [w * 0.1, h * 0.85, 'rgba(47, 230, 199, 0.22)', 'rgba(47, 230, 199, 0)'],
    [w * 0.5, h * 0.4, 'rgba(155, 140, 255, 0.16)', 'rgba(155, 140, 255, 0)'],
  ];
  for (const [bx, by, inner, outer] of beams) {
    const glow = ctx.createRadialGradient(bx, by, 0, bx, by, w * 0.55);
    glow.addColorStop(0, inner);
    glow.addColorStop(1, outer);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = NEON.teal;
  ctx.lineWidth = 2;
  for (let i = -h; i < w + h; i += 72) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(232, 184, 109, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  for (let i = 0; i < 90; i++) {
    const x = (i * 173) % w;
    const y = (i * 97 + 31) % h;
    const r = 0.8 + (i % 4) * 0.6;
    const palette = [NEON.teal, NEON.magenta, NEON.amber, NEON.violet, NEON.sky];
    ctx.fillStyle = palette[i % palette.length];
    ctx.globalAlpha = 0.12 + (i % 6) * 0.06;
    if (i % 7 === 0) {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 3, r, (i * 0.4) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 12; i++) {
    const x0 = (i * 311) % w;
    const y0 = (i * 197) % h;
    const len = 80 + (i % 5) * 40;
    const angle = (i * 0.9) % (Math.PI * 2);
    const x1 = x0 + Math.cos(angle) * len;
    const y1 = y0 + Math.sin(angle) * len;
    const streak = ctx.createLinearGradient(x0, y0, x1, y1);
    streak.addColorStop(0, 'rgba(47, 230, 199, 0)');
    streak.addColorStop(0.4, i % 2 ? 'rgba(255, 79, 163, 0.35)' : 'rgba(47, 230, 199, 0.4)');
    streak.addColorStop(1, 'rgba(255, 178, 77, 0)');
    ctx.strokeStyle = streak;
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

function drawCornerBrackets(ctx, x, y, w, h, color, inset = 0) {
  const L = 36;
  const t = 4;
  ctx.strokeStyle = color;
  ctx.lineWidth = t;
  ctx.lineCap = 'round';
  const pts = [
    [x + inset, y + inset + L, x + inset, y + inset, x + inset + L, y + inset],
    [x + w - inset - L, y + inset, x + w - inset, y + inset, x + w - inset, y + inset + L],
    [x + inset, y + h - inset - L, x + inset, y + h - inset, x + inset + L, y + h - inset],
    [x + w - inset - L, y + h - inset, x + w - inset, y + h - inset, x + w - inset, y + h - inset - L],
  ];
  for (const [x1, y1, x2, y2, x3, y3] of pts) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  }
}

/** True when the canvas shows gameplay (not level-complete / pause overlays). */
function canCaptureLiveCanvas(game) {
  if (!game?.scene) return false;
  const blockers = [SCENES.LEVEL_COMPLETE, SCENES.GAMEOVER, SCENES.PAUSE, SCENES.AD_BREAK, SCENES.PURCHASE];
  return blockers.every((k) => !game.scene.isActive(k));
}

function copyCanvasToImage(canvas) {
  if (!canvas?.width) return null;
  try {
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    return img;
  } catch {
    return null;
  }
}

/** Phaser GL readback — preferred over raw canvas when overlays are not blocking. */
export function captureGameSnapshot(game) {
  return new Promise((resolve) => {
    if (!game) {
      resolve(null);
      return;
    }

    const finish = (img) => {
      if (img && canvasHasContent(img)) resolve(img);
      else resolve(null);
    };

    const tryCanvas = () => finish(copyCanvasToImage(game.canvas));

    if (!canCaptureLiveCanvas(game) || typeof game.renderer?.snapshot !== 'function') {
      tryCanvas();
      return;
    }

    try {
      game.renderer.snapshot((image) => {
        if (!image?.src) {
          tryCanvas();
          return;
        }
        const img = new Image();
        img.onload = () => finish(img);
        img.onerror = tryCanvas;
        img.src = image.src;
      }, 'image/png');
    } catch {
      tryCanvas();
    }
  });
}

function drawHeart(ctx, cx, cy, size, filled = true) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = filled ? '#ff6b8a' : 'rgba(255,107,138,0.25)';
  ctx.shadowColor = '#ff6b8a';
  ctx.shadowBlur = filled ? 10 : 0;
  ctx.beginPath();
  const s = size / 2;
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(0, -s * 0.35, -s, -s * 0.1, 0, s);
  ctx.bezierCurveTo(s, -s * 0.1, 0, -s * 0.35, 0, s * 0.35);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawStatusPill(ctx, text, cx, cy, accent) {
  ctx.font = canvasFont(11, '800');
  const tw = ctx.measureText(text).width;
  const pw = tw + 22;
  const ph = 20;
  const bx = cx - pw / 2;
  const by = cy - ph / 2;
  ctx.fillStyle = 'rgba(14, 20, 40, 0.94)';
  roundRect(ctx, bx, by, pw, ph, ph / 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, pw, ph, ph / 2);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

function drawMetricPill(ctx, icon, value, cx, cy, accent) {
  ctx.font = canvasFont(11, '700');
  const vw = ctx.measureText(value).width;
  const pw = vw + 36;
  const ph = 24;
  const bx = cx - pw / 2;
  const by = cy - ph / 2;
  ctx.fillStyle = 'rgba(14, 20, 40, 0.92)';
  roundRect(ctx, bx, by, pw, ph, ph / 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, pw, ph, ph / 2);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = canvasFont(12, '700');
  ctx.fillText(icon, bx + 10, cy);
  ctx.fillStyle = NEON.cream;
  ctx.font = canvasFont(13, '700');
  ctx.fillText(value, bx + 26, cy);
}

function drawEdgeMeter(ctx, cx, top, h, ratio, fill, label) {
  const barW = 6;
  const x = cx - barW / 2;
  ctx.fillStyle = 'rgba(18, 24, 48, 0.78)';
  roundRect(ctx, x, top, barW, h, 4);
  ctx.fill();
  const fillH = Math.max(4, h * clamp01(ratio));
  ctx.fillStyle = fill;
  roundRect(ctx, x, top + h - fillH, barW, fillH, 4);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, top + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(139, 155, 180, 0.7)';
  ctx.font = canvasFont(8, '700');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function drawNeonBrick(ctx, bx, by, brickW, brickH, fill, glow) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;
  const g = ctx.createLinearGradient(bx, by, bx, by + brickH);
  g.addColorStop(0, fill);
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  roundRect(ctx, bx, by, brickW, brickH, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx + 0.5, by + 0.5, brickW - 1, brickH - 1, 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, bx + 2, by + 2, brickW - 4, Math.max(3, brickH * 0.28), 3);
  ctx.fill();
  ctx.restore();
}

function drawPlayfieldGrid(ctx, px, py, pw, ph) {
  ctx.save();
  ctx.strokeStyle = 'rgba(47, 230, 199, 0.06)';
  ctx.lineWidth = 1;
  const step = 28;
  for (let x = px; x <= px + pw; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x, py + ph);
    ctx.stroke();
  }
  for (let y = py; y <= py + ph; y += step) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px + pw, y);
    ctx.stroke();
  }
  const vg = ctx.createRadialGradient(px + pw / 2, py + ph * 0.35, 0, px + pw / 2, py + ph * 0.35, pw * 0.65);
  vg.addColorStop(0, 'rgba(47, 230, 199, 0.08)');
  vg.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = vg;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
}

function drawBrickField(ctx, px, py, pw, ph) {
  const palette = [
    ['#ff6f9c', '#ff4fa3'],
    ['#2fd9c7', '#1ab89e'],
    ['#ffc04d', '#e89a20'],
    ['#8a7bff', '#6a5fd4'],
    ['#5aa0ff', '#3d7fd4'],
    ['#7eb87a', '#5a9a56'],
  ];
  const cols = 9;
  const rows = 7;
  const gap = 3;
  const brickW = (pw - 16 - (cols - 1) * gap) / cols;
  const brickH = Math.min(26, ph * 0.078);
  const stagger = brickW * 0.22;

  drawPlayfieldGrid(ctx, px, py, pw, ph);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if ((row * 5 + col * 3) % 17 === 0) continue;
      const off = row % 2 === 0 ? 0 : stagger;
      const bx = px + 8 + off + col * (brickW + gap);
      const by = py + 10 + row * (brickH + gap);
      if (bx + brickW > px + pw - 6) continue;
      const [fill, glow] = palette[(row + col) % palette.length];
      drawNeonBrick(ctx, bx, by, brickW, brickH, fill, glow);
    }
  }
}

/** Map normalized arena coords (0–1) to faux-3D screen space (narrower toward top). */
function arenaPoint(px, py, ox, oy, ow, oh) {
  const depth = clamp01(py);
  const scaleX = 0.62 + depth * 0.38;
  const x = ox + ow * 0.5 + (px - 0.5) * ow * scaleX;
  const y = oy + oh * depth;
  return { x, y, scale: scaleX };
}

function drawBootStyleGrid(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(47, 230, 199, 0.08)';
  ctx.lineWidth = 1;
  const step = 36;
  for (let gx = 0; gx < w + h; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx - h * 0.35, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += step) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMiniGnome(ctx, cx, cy, s, hat = '#c84040') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(8, 5, 12, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.arc(0, 4, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(12, -2);
  ctx.lineTo(0, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7eb87a';
  ctx.fillRect(-2, -10, 4, 8);
  ctx.fillStyle = '#5a9a56';
  ctx.beginPath();
  ctx.ellipse(-5, -6, 4, 6, -0.4, 0, Math.PI * 2);
  ctx.ellipse(5, -6, 4, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMiniEnemy(ctx, cx, cy, s, kind = 'drifter') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  const c = kind === 'chaser' ? '#ff6b7a' : kind === 'zigzag' ? '#5aa0ff' : '#9b8cff';
  ctx.fillStyle = c;
  ctx.shadowColor = c;
  ctx.shadowBlur = 12;
  if (kind === 'chaser') {
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(12, 10);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -2, 3, 0, Math.PI * 2);
    ctx.arc(4, -2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawMiniBall(ctx, x, y, r, trail = []) {
  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    const a = 0.15 + (1 - i / trail.length) * 0.35;
    const gr = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r * 2.2);
    gr.addColorStop(0, `rgba(47, 230, 199, ${a})`);
    gr.addColorStop(1, 'rgba(47, 230, 199, 0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.35, NEON.teal);
  glow.addColorStop(1, 'rgba(47, 230, 199, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8ee';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawMiniPot(ctx, x, y, s, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = '#c87848';
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.lineTo(10, 6);
  ctx.lineTo(8, 14);
  ctx.lineTo(-8, 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5ecf5a';
  ctx.beginPath();
  ctx.ellipse(0, -2, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLaserFan(ctx, px, py, pw) {
  const beams = [
    { ox: -0.22, color: NEON.teal },
    { ox: 0, color: '#ffffff' },
    { ox: 0.22, color: NEON.magenta },
  ];
  for (const b of beams) {
    const x0 = px + pw * (0.5 + b.ox);
    const g = ctx.createLinearGradient(x0, py, x0, py - pw * 1.1);
    g.addColorStop(0, b.color);
    g.addColorStop(0.55, `${b.color}88`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 3;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x0, py);
    ctx.lineTo(x0 + pw * b.ox * 0.8, py - pw * 0.95);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawShareSparkles(ctx, w, h, count = 48) {
  for (let i = 0; i < count; i++) {
    const x = ((i * 173) % 1000) / 1000 * w;
    const y = ((i * 97 + 41) % 1000) / 1000 * h;
    const r = 1 + (i % 3);
    const colors = [NEON.teal, NEON.magenta, NEON.amber, NEON.sky];
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.2 + (i % 5) * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPerspectiveBrickRows(ctx, ox, oy, ow, oh) {
  const palette = [
    ['#ff6f9c', '#ff4fa3'],
    ['#2fd9c7', '#1ab89e'],
    ['#ffc04d', '#e89a20'],
    ['#8a7bff', '#6a5fd4'],
    ['#5aa0ff', '#3d7fd4'],
  ];
  const rows = 7;
  const cols = 9;
  for (let row = 0; row < rows; row++) {
    const py = 0.06 + row * 0.1;
    const depth = arenaPoint(0.5, py, ox, oy, ow, oh);
    const rowCols = cols - Math.floor(row * 0.6);
    for (let col = 0; col < rowCols; col++) {
      if ((row * 7 + col * 5) % 19 === 0) continue;
      const px = 0.08 + (col + 0.5) / rowCols * 0.84;
      const p = arenaPoint(px, py, ox, oy, ow, oh);
      const brickW = 28 * depth.scale;
      const brickH = brickW * 0.42;
      const [fill, glow] = palette[(row + col) % palette.length];
      drawNeonBrick(ctx, p.x - brickW / 2, p.y - brickH / 2, brickW, brickH, fill, glow);
      if ((row + col) % 5 === 0 && row < 5) {
        drawMiniGnome(ctx, p.x, p.y - brickH * 0.85, 0.55 + depth.scale * 0.15, col % 3 === 0 ? '#d45d8c' : '#c84040');
      }
    }
  }
}

/** Skewed predrawn arena — bricks, gnomes, balls, lasers, pots, enemies, particles. */
function drawPredrawnArena(ctx, w, h, ui = {}) {
  const pad = 12;
  const ox = pad;
  const oy = pad + 8;
  const ow = w - pad * 2;
  const oh = h - pad * 2 - 16;

  const arenaBg = ctx.createLinearGradient(0, oy, 0, oy + oh);
  arenaBg.addColorStop(0, '#1a0a28');
  arenaBg.addColorStop(0.45, '#0c0614');
  arenaBg.addColorStop(1, '#040208');
  ctx.fillStyle = arenaBg;
  roundRect(ctx, ox - 4, oy - 4, ow + 8, oh + 8, 16);
  ctx.fill();

  const tealGlow = ctx.createRadialGradient(ox + ow * 0.2, oy, 0, ox + ow * 0.2, oy, ow * 0.7);
  tealGlow.addColorStop(0, 'rgba(47, 230, 199, 0.12)');
  tealGlow.addColorStop(1, 'rgba(47, 230, 199, 0)');
  ctx.fillStyle = tealGlow;
  ctx.fillRect(ox, oy, ow, oh);

  const magGlow = ctx.createRadialGradient(ox + ow * 0.85, oy + oh, 0, ox + ow * 0.85, oy + oh, ow * 0.55);
  magGlow.addColorStop(0, 'rgba(255, 79, 163, 0.14)');
  magGlow.addColorStop(1, 'rgba(255, 79, 163, 0)');
  ctx.fillStyle = magGlow;
  ctx.fillRect(ox, oy, ow, oh);

  ctx.save();
  ctx.translate(ox, oy);
  drawBootStyleGrid(ctx, ow, oh);
  ctx.restore();
  drawPerspectiveBrickRows(ctx, ox, oy, ow, oh);

  drawMiniEnemy(ctx, ox + ow * 0.18, oy + oh * 0.32, 0.9, 'drifter');
  drawMiniEnemy(ctx, ox + ow * 0.78, oy + oh * 0.38, 0.85, 'chaser');
  drawMiniEnemy(ctx, ox + ow * 0.62, oy + oh * 0.22, 0.75, 'zigzag');

  drawMiniPot(ctx, ox + ow * 0.35, oy + oh * 0.48, 0.95, 0.4);
  drawMiniPot(ctx, ox + ow * 0.58, oy + oh * 0.55, 0.85, -0.5);
  drawMiniPot(ctx, ox + ow * 0.72, oy + oh * 0.42, 0.7, 0.2);

  const ball1 = arenaPoint(0.42, 0.72, ox, oy, ow, oh);
  drawMiniBall(ctx, ball1.x, ball1.y, 10, [
    { x: ball1.x - 18, y: ball1.y + 12 },
    { x: ball1.x - 32, y: ball1.y + 28 },
    { x: ball1.x - 42, y: ball1.y + 48 },
  ]);
  const ball2 = arenaPoint(0.68, 0.58, ox, oy, ow, oh);
  drawMiniBall(ctx, ball2.x, ball2.y, 8, [
    { x: ball2.x + 14, y: ball2.y + 18 },
    { x: ball2.x + 28, y: ball2.y + 34 },
  ]);

  const padW = ow * 0.38;
  const padX = ox + (ow - padW) / 2;
  const padY = oy + oh * 0.9;
  const padH = 14;
  const padGrad = ctx.createLinearGradient(padX, padY, padX + padW, padY);
  padGrad.addColorStop(0, '#1a2030');
  padGrad.addColorStop(0.4, '#3a4860');
  padGrad.addColorStop(0.55, '#5aa0ff');
  padGrad.addColorStop(1, '#1a2030');
  ctx.shadowColor = NEON.sky;
  ctx.shadowBlur = 16;
  ctx.fillStyle = padGrad;
  roundRect(ctx, padX, padY, padW, padH, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = NEON.teal;
  ctx.lineWidth = 2;
  roundRect(ctx, padX, padY, padW, padH, 7);
  ctx.stroke();

  drawLaserFan(ctx, padX, padY, padW);

  const spikeN = 7;
  const step = padW / (spikeN + 1);
  ctx.fillStyle = '#d8f4ff';
  for (let i = 1; i <= spikeN; i++) {
    const sx = padX + step * i;
    ctx.beginPath();
    ctx.moveTo(sx - 5, padY);
    ctx.lineTo(sx, padY - 10);
    ctx.lineTo(sx + 5, padY);
    ctx.closePath();
    ctx.fill();
  }

  drawShareSparkles(ctx, w, h, ui.vividPreview ? 72 : 56);

  const snapshot = ui.snapshot;
  if (snapshot && canvasHasContent(snapshot)) {
    ctx.save();
    ctx.globalAlpha = ui.vividPreview ? 0.52 : 0.28;
    ctx.globalCompositeOperation = 'screen';
    roundRect(ctx, ox, oy, ow, oh, 12);
    ctx.clip();
    const sc = Math.max(ow / snapshot.width, oh / snapshot.height);
    const dw = snapshot.width * sc;
    const dh = snapshot.height * sc;
    ctx.drawImage(snapshot, ox + (ow - dw) / 2, oy + (oh - dh) / 2, dw, dh);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = 'rgba(47, 230, 199, 0.45)';
  ctx.lineWidth = 2;
  roundRect(ctx, ox - 2, oy - 2, ow + 4, oh + 4, 14);
  ctx.stroke();
}

/**
 * Skewed predrawn game preview for share cards (boot-splash neon aesthetic).
 * Optional live snapshot is blended in softly under the illustration.
 */
function drawGameplayPreview(ctx, x, y, fw, fh, ui = {}) {
  ctx.fillStyle = '#060a14';
  roundRect(ctx, x, y, fw, fh, 22);
  ctx.fill();

  const inset = 10;
  const innerX = x + inset;
  const innerY = y + inset;
  const innerW = fw - inset * 2;
  const innerH = fh - inset * 2;

  ctx.save();
  ctx.translate(innerX + innerW / 2, innerY + innerH / 2);
  ctx.transform(1, 0.07, -0.18, 0.92, -innerW / 2, -innerH / 2);
  drawPredrawnArena(ctx, innerW, innerH, ui);
  ctx.restore();

  const edgeW = Math.max(10, Math.round(fw * 0.034));
  for (const [ex, label, ratio, color] of [
    [x + edgeW, 'GNOME', ui.gnomeRatio ?? 0.55, '#7eb87a'],
    [x + fw - edgeW, 'NEXUS', ui.nexusRatio ?? 0.72, '#4488ff'],
  ]) {
    drawEdgeMeter(ctx, ex, y + 18, fh - 36, ratio, color, label);
  }

  const headerH = 36;
  ctx.fillStyle = 'rgba(8, 11, 22, 0.88)';
  roundRect(ctx, x + 8, y + 8, fw - 16, headerH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(47, 230, 199, 0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 8, y + 8, fw - 16, headerH, 12);
  ctx.stroke();

  const headerCy = y + 8 + headerH / 2;
  const lives = Math.max(0, Math.min(4, Number(ui.lives ?? 3)));
  let hx = x + 28;
  for (let i = 0; i < lives; i++) {
    drawHeart(ctx, hx, headerCy, 10);
    hx += 14;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = NEON.cream;
  ctx.font = canvasFont(Math.min(20, fw * 0.048), '800');
  ctx.shadowColor = NEON.teal;
  ctx.shadowBlur = 8;
  if (ui.hidePreviewScore) {
    ctx.fillText(`LV ${ui.level ?? 1} SIEGE`, x + fw / 2, headerCy);
  } else {
    ctx.fillText(String(ui.score ?? '0'), x + fw / 2, headerCy);
  }
  ctx.shadowBlur = 0;

  ctx.textAlign = 'right';
  ctx.fillStyle = NEON.teal;
  ctx.font = canvasFont(11, '700');
  if (!ui.hidePreviewScore) {
    ctx.fillText(`LV ${ui.level ?? 1}`, x + fw - 16, headerCy);
  }

  if (!ui.vividPreview) {
    ctx.fillStyle = 'rgba(8, 5, 12, 0.05)';
    for (let sy = y; sy < y + fh; sy += 4) {
      ctx.fillRect(x, sy, fw, 1);
    }
  }
}

function drawSnapshotFrame(ctx, snapshot, x, y, fw, fh, ui = {}) {
  drawGameplayPreview(ctx, x, y, fw, fh, { ...ui, snapshot });

  ctx.shadowColor = NEON.teal;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = NEON.teal;
  ctx.lineWidth = 5;
  roundRect(ctx, x, y, fw, fh, 28);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255, 79, 163, 0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 8, y + 8, fw - 16, fh - 16, 22);
  ctx.stroke();

  drawCornerBrackets(ctx, x, y, fw, fh, NEON.amber, 14);
}

function fmtStat(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString() : String(n ?? '0');
}

function uiFromStats(stats) {
  const sd = stats.shareData ?? {};
  const scoreRaw = stats.uiScore ?? stats.heroStat ?? sd.score ?? sd.runScore ?? 0;
  const scoreNum = typeof scoreRaw === 'string'
    ? parseInt(scoreRaw.replace(/,/g, ''), 10) || 0
    : Number(scoreRaw) || 0;
  return {
    score: scoreNum.toLocaleString(),
    level: sd.level ?? stats.level ?? 1,
    lives: sd.lives ?? stats.lives ?? 3,
    gems: fmtStat(stats.gems ?? sd.gems ?? 0),
    treasury: fmtStat(stats.treasury ?? sd.treasury ?? 0),
    bricks: String(sd.bricksLeft ?? stats.bricks ?? 12),
    gnomeRatio: stats.gnomeRatio ?? 0.5,
    nexusRatio: stats.nexusRatio ?? 0.65,
    showSlow: !!stats.showSlow,
    showPotted: !!stats.showPotted,
    snapshot: stats.snapshot ?? null,
  };
}

function drawBadge(ctx, text, cx, cy, color = NEON.magenta) {
  ctx.font = canvasFont(26, '800');
  const tw = ctx.measureText(text).width;
  const pw = tw + 56;
  const ph = 56;
  const bx = cx - pw / 2;
  const by = cy - ph / 2;

  ctx.fillStyle = 'rgba(8, 5, 12, 0.92)';
  roundRect(ctx, bx, by, pw, ph, 28);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  roundRect(ctx, bx, by, pw, ph, 28);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

function drawStatChip(ctx, label, value, cx, cy, w, accent) {
  const h = 88;
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.fillStyle = 'rgba(8, 5, 12, 0.78)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(168, 152, 176, 0.95)';
  ctx.font = canvasFont(18, '600', 'body');
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, cx, cy - 8);
  ctx.fillStyle = NEON.cream;
  ctx.font = canvasFont(32, '800');
  ctx.fillText(value, cx, cy + 32);
}

function drawCtaButton(ctx, text, cx, cy, w, opts = {}) {
  const h = opts.height ?? 64;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, opts.accent ?? NEON.teal);
  g.addColorStop(0.5, opts.mid ?? '#5dffe8');
  g.addColorStop(1, opts.accent ?? NEON.teal);
  ctx.shadowColor = opts.accent ?? NEON.teal;
  ctx.shadowBlur = 28;
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = opts.textColor ?? '#041210';
  ctx.font = canvasFont(opts.fontSize ?? 30, '800');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

function drawOutlineCta(ctx, text, cx, cy, w) {
  const h = 52;
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.fillStyle = 'rgba(8, 5, 12, 0.55)';
  roundRect(ctx, x, y, w, h, 26);
  ctx.fill();
  ctx.strokeStyle = NEON.teal;
  ctx.lineWidth = 2;
  ctx.shadowColor = NEON.teal;
  ctx.shadowBlur = 12;
  roundRect(ctx, x, y, w, h, 26);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = NEON.cream;
  ctx.font = canvasFont(24, '700');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

function drawChallengeBanner(ctx, text, cx, cy, w) {
  const h = 58;
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.fillStyle = 'rgba(255, 79, 163, 0.14)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = NEON.magenta;
  ctx.lineWidth = 2;
  ctx.shadowColor = NEON.magenta;
  ctx.shadowBlur = 14;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = NEON.cream;
  let fontSize = 28;
  ctx.font = canvasFont(fontSize, '800');
  while (fontSize > 18 && ctx.measureText(text).width > w - 32) {
    fontSize -= 1;
    ctx.font = canvasFont(fontSize, '800');
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

function drawStatIcon(ctx, kind, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  if (kind === 'trophy') {
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.42, cy - size * 0.15);
    ctx.lineTo(cx - size * 0.28, cy + size * 0.32);
    ctx.lineTo(cx + size * 0.28, cy + size * 0.32);
    ctx.lineTo(cx + size * 0.42, cy - size * 0.15);
    ctx.closePath();
    ctx.stroke();
    ctx.fillRect(cx - size * 0.14, cy + size * 0.32, size * 0.28, size * 0.12);
    ctx.fillRect(cx - size * 0.22, cy + size * 0.44, size * 0.44, size * 0.08);
  } else if (kind === 'level') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.42);
    ctx.lineTo(cx + size * 0.34, cy + size * 0.08);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.08);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.42);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.42);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.08);
    ctx.lineTo(cx - size * 0.34, cy + size * 0.08);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'gem') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.42);
    ctx.lineTo(cx + size * 0.34, cy);
    ctx.lineTo(cx, cy + size * 0.42);
    ctx.lineTo(cx - size * 0.34, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Clean horizontal stat row — icon + number + tiny label, no outline boxes. */
function drawInlineStatsRow(ctx, items, cy, panelX, panelW) {
  const n = items.length;
  const colW = panelW / n;
  items.forEach((item, i) => {
    const cx = panelX + colW * (i + 0.5);
    drawStatIcon(ctx, item.icon, cx, cy - 34, 12, item.accent);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = NEON.cream;
    ctx.font = canvasFont(38, '800');
    ctx.fillText(item.value, cx, cy + 6);
    ctx.fillStyle = 'rgba(168, 180, 210, 0.82)';
    ctx.font = canvasFont(13, '600', 'body');
    ctx.fillText(item.label, cx, cy + 30);
    if (i < n - 1) {
      const divX = panelX + colW * (i + 1);
      ctx.strokeStyle = 'rgba(47, 230, 199, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(divX, cy - 40);
      ctx.lineTo(divX, cy + 36);
      ctx.stroke();
    }
  });
}

function displayShareUrl() {
  const url = getGameUrl();
  if (/localhost|127\.0\.0\.1/i.test(url)) return 'Play free — link in share caption';
  return url.replace(/^https?:\/\//, '');
}

/** Game-over share layout — hero score, inline stats, challenge CTA. */
function drawGameOverShareCard(ctx, stats) {
  const w = CARD_W;
  const h = CARD_H;
  const ui = stats.ui ?? uiFromStats(stats);
  ui.hidePreviewScore = true;
  ui.vividPreview = true;

  drawChaosField(ctx, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  fillGradientText(
    ctx,
    'NEON NEXUS',
    w / 2,
    88,
    canvasFont(68, '900'),
    [[0, NEON.teal], [0.45, '#ffffff'], [1, NEON.magenta]],
  );

  ctx.fillStyle = NEON.cream;
  ctx.font = canvasFont(24, '700');
  ctx.shadowColor = NEON.teal;
  ctx.shadowBlur = 10;
  ctx.fillText('Bullet-Time Brickbreaker', w / 2, 126);
  ctx.shadowBlur = 0;

  let frameY = 152;
  if (stats.badge) {
    drawBadge(ctx, stats.badge, w / 2, 182, stats.badgeColor ?? NEON.amber);
    frameY = 214;
  }

  const frameX = 72;
  const frameW = w - 144;
  const frameH = 268;
  drawSnapshotFrame(ctx, stats.snapshot ?? null, frameX, frameY, frameW, frameH, ui);

  const panelY = frameY + frameH + 24;
  const panelX = 48;
  const panelW = w - 96;
  const panelH = h - panelY - 72;
  ctx.fillStyle = 'rgba(8, 5, 12, 0.82)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(47, 230, 199, 0.4)';
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.stroke();

  const heroLabel = stats.heroLabel ?? 'FINAL SCORE';
  const heroLabelY = panelY + 52;
  ctx.fillStyle = 'rgba(190, 205, 230, 0.9)';
  ctx.font = canvasFont(22, '700', 'body');
  ctx.textAlign = 'center';
  ctx.fillText(heroLabel, w / 2, heroLabelY);

  const heroCy = panelY + 148;
  const heroAccent = stats.isNewBest ? NEON.amber : NEON.teal;
  fillGradientText(
    ctx,
    stats.heroStat ?? '0',
    w / 2,
    heroCy,
    canvasFont(120, '900'),
    [[0, heroAccent], [0.45, '#ffffff'], [1, NEON.magenta]],
  );

  const subline = stats.scoreSubline ?? '';
  if (subline) {
    ctx.fillStyle = stats.isNewBest ? 'rgba(255, 210, 90, 0.92)' : 'rgba(168, 180, 210, 0.9)';
    ctx.font = canvasFont(24, '600', 'body');
    ctx.fillText(subline, w / 2, heroCy + 58);
  }

  const pbVal = stats.isNewBest ? stats.line3 ?? '1' : stats.line2 ?? '0';
  const levelVal = stats.isNewBest ? stats.line2 ?? '1' : stats.line3 ?? '1';
  const gemsVal = stats.isNewBest ? stats.line3 ?? fmtStat(stats.gems) : stats.line4 ?? fmtStat(stats.gems);
  const statItems = stats.isNewBest
    ? [
      { icon: 'level', label: 'LEVEL', value: levelVal, accent: NEON.sky },
      { icon: 'gem', label: 'GEMS', value: gemsVal, accent: NEON.amber },
      { icon: 'trophy', label: 'RECORD', value: '★', accent: NEON.magenta },
    ]
    : [
      { icon: 'trophy', label: 'PB', value: pbVal, accent: NEON.magenta },
      { icon: 'level', label: 'LEVEL', value: levelVal, accent: NEON.sky },
      { icon: 'gem', label: 'GEMS', value: gemsVal, accent: NEON.amber },
    ];
  const statRowY = subline ? panelY + 268 : panelY + 248;
  drawInlineStatsRow(ctx, statItems, statRowY, panelX + 16, panelW - 32);

  const challenge = stats.challengeLine ?? `Can you beat ${stats.heroStat ?? '0'}?`;
  drawChallengeBanner(ctx, challenge, w / 2, statRowY + 88, panelW - 56);

  const ctaY = panelY + panelH - 56;
  const primaryPlayFree = !stats.isNewBest;
  if (primaryPlayFree) {
    drawCtaButton(
      ctx,
      'PLAY FREE  →',
      w / 2,
      ctaY - 42,
      panelW - 72,
      { accent: NEON.teal, mid: '#5dffe8', fontSize: 30, height: 60 },
    );
    drawOutlineCta(ctx, 'BEAT MY SCORE', w / 2, ctaY + 28, 300);
  } else {
    drawCtaButton(
      ctx,
      'BEAT MY SCORE  →',
      w / 2,
      ctaY - 42,
      panelW - 72,
      { accent: NEON.magenta, mid: '#ff7ab8', fontSize: 28, height: 58 },
    );
    drawOutlineCta(ctx, 'PLAY FREE', w / 2, ctaY + 28, 280);
  }

  const gemHint = stats.showGemHintOnCard ? (stats.gemHint ?? '') : '';
  if (gemHint) {
    ctx.fillStyle = 'rgba(95, 112, 136, 0.85)';
    ctx.font = canvasFont(16, '500', 'body');
    ctx.fillText(gemHint, w / 2, h - 56);
  }

  ctx.fillStyle = NEON.teal;
  ctx.font = canvasFont(20, '700');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(displayShareUrl(), w / 2, h - 42);

  ctx.fillStyle = 'rgba(95, 112, 136, 0.9)';
  ctx.font = canvasFont(15, '500', 'body');
  ctx.fillText('Neon Nexus · Bullet-Time Brick Breaker', w / 2, h - 18);
}

/**
 * Build share payload for shell / home progress share.
 * @param {{ gems: number, highScore: number, run?: { level: number, score: number, lives?: number } | null }} meta
 */
export function buildProgressSharePayload({ gems, highScore, run }) {
  const gemsStr = Number(gems ?? 0).toLocaleString();
  const highStr = Number(highScore ?? 0).toLocaleString();
  const treasury = MetaProgress.getTreasury();
  return {
    kind: 'progress',
    shareData: {
      gems,
      highScore,
      runLevel: run?.level,
      runScore: run?.score,
      lives: run?.lives,
      level: run?.level,
      score: run?.score,
    },
    gems,
    treasury,
    uiScore: run?.score ?? highScore,
    level: run?.level ?? 1,
    lives: run?.lives ?? 3,
    badge: run ? `⚡ LEVEL ${run.level} LIVE` : MARKETING.badgeIdle,
    badgeColor: run ? NEON.amber : NEON.teal,
    heroStat: gemsStr,
    heroLabel: 'GEMS LOOTED',
    line2: highStr,
    line2Label: 'PERSONAL BEST',
    line3: run ? `${Number(run.score).toLocaleString()} pts` : 'YOUR MOVE',
    line3Label: run ? `LEVEL ${run.level} RUN` : 'CHALLENGE',
    hook: MARKETING.hook,
  };
}

function drawShareCard(ctx, stats) {
  if (stats.kind === 'gameover') {
    drawGameOverShareCard(ctx, stats);
    return;
  }

  const w = CARD_W;
  const h = CARD_H;
  drawChaosField(ctx, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  fillGradientText(
    ctx,
    'NEON NEXUS',
    w / 2,
    108,
    canvasFont(78, '900'),
    [[0, NEON.teal], [0.45, '#ffffff'], [1, NEON.magenta]],
  );

  ctx.fillStyle = NEON.cream;
  ctx.font = canvasFont(24, '700');
  ctx.shadowColor = NEON.teal;
  ctx.shadowBlur = 10;
  ctx.fillText('Bullet-Time Brickbreaker', w / 2, 152);
  ctx.shadowBlur = 0;

  let frameY = 188;
  if (stats.badge) {
    drawBadge(ctx, stats.badge, w / 2, 228, stats.badgeColor ?? NEON.magenta);
    frameY = 268;
  }

  const frameX = 52;
  const frameW = w - 104;
  const frameH = 500;
  const ui = stats.ui ?? uiFromStats(stats);
  drawSnapshotFrame(ctx, null, frameX, frameY, frameW, frameH, ui);

  const panelY = frameY + frameH + 44;
  const panelH = 200;
  const panelX = 48;
  const panelW = w - 96;
  ctx.fillStyle = 'rgba(8, 5, 12, 0.72)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(47, 230, 199, 0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 24);
  ctx.stroke();

  const chipW = (panelW - 48) / 3;
  const chipY = panelY + panelH / 2 + 8;
  drawStatChip(ctx, stats.heroLabel ?? 'GEMS', stats.heroStat ?? '0', panelX + 24 + chipW / 2, chipY, chipW - 8, NEON.teal);
  drawStatChip(ctx, stats.line2Label ?? 'BEST', stats.line2 ?? '0', panelX + 24 + chipW + chipW / 2, chipY, chipW - 8, NEON.magenta);
  drawStatChip(ctx, stats.line3Label ?? 'RUN', stats.line3 ?? '—', panelX + 24 + chipW * 2 + chipW / 2, chipY, chipW - 8, NEON.amber);

  ctx.fillStyle = 'rgba(168, 180, 210, 0.9)';
  ctx.font = canvasFont(22, '600', 'body');
  ctx.fillText(stats.hook ?? MARKETING.hook, w / 2, panelY + panelH + 48);

  const ctaY = h - 118;
  drawCtaButton(ctx, 'PLAY FREE', w / 2, ctaY, 420);

  ctx.fillStyle = NEON.teal;
  ctx.font = canvasFont(22, '700');
  ctx.fillText(displayShareUrl(), w / 2, h - 52);

  ctx.fillStyle = 'rgba(95, 112, 136, 0.9)';
  ctx.font = canvasFont(16, '500', 'body');
  ctx.fillText('Neon Nexus · Bullet-Time Brick Breaker', w / 2, h - 22);
}

function statsFromPayload(stats) {
  return {
    ...stats,
    snapshot: stats.snapshot ?? null,
    badge: stats.badge ?? null,
    badgeColor: stats.badgeColor,
    heroStat: stats.heroStat ?? stats.line1,
    heroLabel: stats.heroLabel,
    line2: stats.line2,
    line2Label: stats.line2Label,
    line3: stats.line3,
    line3Label: stats.line3Label,
    line4: stats.line4,
    line4Label: stats.line4Label,
    challengeLine: stats.challengeLine,
    scoreSubline: stats.scoreSubline,
    gemHint: stats.gemHint,
    showGemHintOnCard: stats.showGemHintOnCard,
    isNewBest: stats.isNewBest ?? stats.shareData?.isNewBest,
    hook: stats.hook,
    ui: stats.ui ?? uiFromStats(stats),
  };
}

function downloadShareBlob(blob, kind) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `neon-nexus-${kind}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

function canShareWithFiles(file) {
  if (!navigator.share) return false;
  if (!navigator.canShare) return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

async function copyShareCaption(text) {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareProgressScreenshot(game, stats = {}) {
  await ensureFontsLoaded();

  let snapshot = stats.snapshot ?? null;
  if (!snapshot && game) {
    snapshot = await captureGameSnapshot(game);
  }

  const payload = statsFromPayload({
    ...stats,
    snapshot,
    gems: stats.gems ?? stats.shareData?.gems ?? MetaProgress.getGems(),
    treasury: stats.treasury ?? MetaProgress.getTreasury(),
  });

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, reason: 'canvas-ctx-failed' };
  drawShareCard(ctx, payload);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.96));
  if (!blob) return { ok: false, reason: 'blob-failed' };

  const kind = stats.kind ?? 'progress';
  const shareText = stats.shareText ?? buildShareMessage(kind, stats.shareData ?? stats);
  const title = stats.shareTitle ?? shareTitle(kind);
  const url = getGameUrl();
  const file = new File([blob], `neon-nexus-${kind}.png`, { type: 'image/png' });

  if (typeof navigator.share === 'function') {
    try {
      const base = { title, text: shareText };
      if (canShareWithFiles(file)) {
        await navigator.share({ ...base, files: [file] });
        return { ok: true, method: 'share-file' };
      }
      try {
        await navigator.share({ ...base, files: [file] });
        return { ok: true, method: 'share-file' };
      } catch (fileErr) {
        if (fileErr?.name === 'AbortError') return { ok: false, reason: 'cancelled' };
        if (fileErr?.name !== 'TypeError' && fileErr?.name !== 'NotAllowedError') {
          throw fileErr;
        }
      }
      await navigator.share({ ...base, url });
      downloadShareBlob(blob, kind);
      const copied = await copyShareCaption(shareText);
      return {
        ok: true,
        method: copied ? 'share-text+download+clipboard' : 'share-text+download',
      };
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, reason: 'cancelled' };
    }
  }

  downloadShareBlob(blob, kind);
  const copied = await copyShareCaption(shareText);
  return { ok: true, method: copied ? 'download+clipboard' : 'download' };
}

export { buildShareMessage, getGameUrl };
