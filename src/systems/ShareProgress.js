/** Premium branded share card + Web Share API / download fallback. */

import { SCENES } from '../config/Constants.js';
import { buildShareMessage, getGameUrl, MARKETING, shareTitle } from '../config/ShareConfig.js';
import { MetaProgress } from './MetaProgress.js';
import { canvasFont } from '../utils/Typography.js';

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

/**
 * Renders the in-game UIScene layout (compact header, edge meters, play field, paddle strip).
 * Live snapshot is composited into the play area when available.
 */
function drawGameplayPreview(ctx, x, y, fw, fh, ui = {}) {
  const headerH = Math.max(44, fh * 0.065);
  const floorH = fh * 0.11;
  const edgeW = Math.max(11, Math.round(fw * 0.036));
  const wallX = Math.max(14, Math.round(fw * 0.022));
  const headerGap = Math.max(6, Math.round(fh * 0.01));
  const headerTop = y + 6;
  const headerBottom = y + headerH;
  const playTop = headerBottom + headerGap;
  const playBottom = y + fh - floorH;
  const playH = playBottom - playTop;
  const playLeft = x + wallX;
  const playRight = x + fw - wallX;
  const playX = playLeft;
  const playW = playRight - playLeft;

  ctx.fillStyle = '#08050c';
  roundRect(ctx, x, y, fw, fh, 22);
  ctx.fill();

  const playBg = ctx.createLinearGradient(playX, playTop, playX, playBottom);
  playBg.addColorStop(0, '#120a1e');
  playBg.addColorStop(0.55, '#0a0614');
  playBg.addColorStop(1, '#040208');
  ctx.fillStyle = playBg;
  ctx.fillRect(playX, playTop, playW, playH);

  ctx.save();
  ctx.strokeStyle = 'rgba(47, 230, 199, 0.55)';
  ctx.lineWidth = 3;
  ctx.shadowColor = NEON.teal;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(playLeft + 1, playTop + 8);
  ctx.lineTo(playLeft + 1, playBottom - 8);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90, 160, 255, 0.55)';
  ctx.shadowColor = NEON.sky;
  ctx.beginPath();
  ctx.moveTo(playRight - 1, playTop + 8);
  ctx.lineTo(playRight - 1, playBottom - 8);
  ctx.stroke();
  ctx.restore();

  const snapshot = ui.snapshot;
  const snapOk = snapshot && canvasHasContent(snapshot);
  if (snapOk) {
    ctx.save();
    roundRect(ctx, playX, playTop, playW, playH, 8);
    ctx.clip();
    const scale = Math.max(playW / snapshot.width, playH / snapshot.height);
    const dw = snapshot.width * scale;
    const dh = snapshot.height * scale;
    ctx.drawImage(snapshot, playX + (playW - dw) / 2, playTop + (playH - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(8, 5, 12, 0.25)';
    ctx.fillRect(playX, playTop, playW, playH);
    ctx.restore();
  } else {
    drawBrickField(ctx, playX, playTop, playW, playH);
  }

  for (const [ex, label, ratio, color] of [
    [playLeft + edgeW / 2, 'GNOME', ui.gnomeRatio ?? 0.55, '#7eb87a'],
    [playRight - edgeW / 2, 'NEXUS', ui.nexusRatio ?? 0.72, '#4488ff'],
  ]) {
    drawEdgeMeter(ctx, ex, playTop + 12, playH - 24, ratio, color, label);
  }

  ctx.fillStyle = 'rgba(8, 11, 22, 0.9)';
  roundRect(ctx, x + 8, headerTop, fw - 16, headerH - 8, 14);
  ctx.fill();

  const headerCy = headerTop + (headerH - 8) / 2;
  const pad = 12;
  const pauseReserve = 44;
  const innerW = fw - pad * 2 - pauseReserve;
  const slotW = innerW / 4;
  const slotX = (i) => x + pad + slotW * (i + 0.5);

  const lives = Math.max(0, Math.min(5, Number(ui.lives ?? 3)));
  let hx = slotX(0) - (lives - 1) * 8;
  for (let i = 0; i < lives; i++) {
    drawHeart(ctx, hx, headerCy, 12);
    hx += 16;
  }
  if (ui.showSlow) drawStatusPill(ctx, 'SLOW', hx + 20, headerCy, NEON.teal);
  if (ui.showPotted) drawStatusPill(ctx, 'POTTED!', hx + 56, headerCy, NEON.amber);

  const scoreStr = String(ui.score ?? '0');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = NEON.cream;
  ctx.font = canvasFont(Math.min(22, fw * 0.055), '800');
  ctx.shadowColor = NEON.teal;
  ctx.shadowBlur = 10;
  ctx.fillText(scoreStr, slotX(1), headerCy);
  ctx.shadowBlur = 0;

  const pauseCx = x + fw - 22;
  drawMetricPill(ctx, '💎', String(ui.gems ?? '0'), slotX(2) - 18, headerCy, '#66ccff');
  drawMetricPill(ctx, '🌿', String(ui.treasury ?? '0'), slotX(2) + 18, headerCy, '#7eb87a');

  const metricsX = slotX(3);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(139, 155, 180, 0.9)';
  ctx.font = canvasFont(8, '700');
  ctx.fillText('LV', metricsX - 18, headerCy);
  ctx.fillStyle = NEON.cream;
  ctx.font = canvasFont(14, '800');
  ctx.fillText(String(ui.level ?? 1), metricsX - 6, headerCy);
  ctx.fillStyle = 'rgba(139, 155, 180, 0.9)';
  ctx.font = canvasFont(8, '700');
  ctx.fillText('◆', metricsX + 14, headerCy);
  ctx.fillStyle = NEON.teal;
  ctx.font = canvasFont(12, '800');
  ctx.fillText(String(ui.bricks ?? '12'), metricsX + 22, headerCy);

  ctx.fillStyle = 'rgba(20, 28, 48, 0.95)';
  ctx.beginPath();
  ctx.arc(pauseCx, headerCy, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pauseCx - 4, headerCy - 6);
  ctx.lineTo(pauseCx - 4, headerCy + 6);
  ctx.moveTo(pauseCx + 4, headerCy - 6);
  ctx.lineTo(pauseCx + 4, headerCy + 6);
  ctx.stroke();

  const padW = playW * 0.42;
  const padH = 18;
  const padX = playX + (playW - padW) / 2;
  const padY = playBottom - 34;
  const padGrad = ctx.createLinearGradient(padX, padY, padX + padW, padY);
  padGrad.addColorStop(0, '#2a1a08');
  padGrad.addColorStop(0.35, '#e8c040');
  padGrad.addColorStop(0.5, '#fff0a8');
  padGrad.addColorStop(0.65, '#e8c040');
  padGrad.addColorStop(1, '#2a1a08');
  ctx.shadowColor = NEON.amber;
  ctx.shadowBlur = 18;
  ctx.fillStyle = padGrad;
  roundRect(ctx, padX, padY, padW, padH, 9);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = NEON.teal;
  ctx.lineWidth = 2.5;
  roundRect(ctx, padX, padY, padW, padH, 9);
  ctx.stroke();

  const ballX = padX + padW * 0.5;
  const ballY = padY - 18;
  const ballGlow = ctx.createRadialGradient(ballX, ballY, 0, ballX, ballY, 22);
  ballGlow.addColorStop(0, '#ffffff');
  ballGlow.addColorStop(0.4, NEON.teal);
  ballGlow.addColorStop(1, 'rgba(47, 230, 199, 0)');
  ctx.fillStyle = ballGlow;
  ctx.beginPath();
  ctx.arc(ballX, ballY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8ee';
  ctx.beginPath();
  ctx.arc(ballX, ballY, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(232, 238, 252, 0.88)';
  ctx.font = canvasFont(14, '800');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('TAP TO LAUNCH', playX + playW / 2, padY - 32);

  ctx.fillStyle = 'rgba(8, 5, 12, 0.06)';
  for (let sy = y; sy < y + fh; sy += 3) {
    ctx.fillRect(x, sy, fw, 1);
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

function drawCtaButton(ctx, text, cx, cy, w) {
  const h = 64;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, NEON.teal);
  g.addColorStop(0.5, '#5dffe8');
  g.addColorStop(1, NEON.teal);
  ctx.shadowColor = NEON.teal;
  ctx.shadowBlur = 28;
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, 32);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#041210';
  ctx.font = canvasFont(30, '800');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
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

  ctx.fillStyle = NEON.magenta;
  ctx.font = canvasFont(28, '700');
  ctx.shadowColor = NEON.magenta;
  ctx.shadowBlur = 12;
  ctx.fillText('BULLET-TIME · TWILIGHT GARDEN SIEGE', w / 2, 158);
  ctx.shadowBlur = 0;

  let frameY = 188;
  if (stats.badge) {
    drawBadge(ctx, stats.badge, w / 2, 218, stats.badgeColor ?? NEON.magenta);
    frameY = 258;
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

  ctx.fillStyle = NEON.violet;
  ctx.font = canvasFont(24, '700');
  ctx.fillText(stats.hook ?? MARKETING.hook, w / 2, panelY + panelH + 48);

  const ctaY = h - 118;
  drawCtaButton(ctx, '▶  PLAY FREE', w / 2, ctaY, 420);

  const url = getGameUrl().replace(/^https?:\/\//, '');
  ctx.fillStyle = NEON.teal;
  ctx.font = canvasFont(22, '700');
  ctx.fillText(url, w / 2, h - 52);

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
