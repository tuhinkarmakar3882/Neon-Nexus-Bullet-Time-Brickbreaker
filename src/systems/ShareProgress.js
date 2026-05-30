/** Branded social share card + Web Share API / download fallback. */

import { buildShareMessage, getGameUrl, shareTitle } from '../config/ShareConfig.js';

const CARD_W = 1080;
const CARD_H = 1350;

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

function drawNeonBackground(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, w * 0.3, h);
  bg.addColorStop(0, '#221430');
  bg.addColorStop(0.4, '#120818');
  bg.addColorStop(1, '#06040a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow1 = ctx.createRadialGradient(w * 0.82, h * 0.12, 0, w * 0.82, h * 0.12, w * 0.55);
  glow1.addColorStop(0, 'rgba(212, 93, 140, 0.22)');
  glow1.addColorStop(1, 'rgba(212, 93, 140, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, w, h);

  const glow2 = ctx.createRadialGradient(w * 0.15, h * 0.78, 0, w * 0.15, h * 0.78, w * 0.45);
  glow2.addColorStop(0, 'rgba(126, 184, 122, 0.18)');
  glow2.addColorStop(1, 'rgba(126, 184, 122, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(232, 184, 109, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  for (let i = 0; i < 42; i++) {
    const x = (i * 137) % w;
    const y = (i * 89 + 40) % h;
    const a = 0.15 + (i % 5) * 0.04;
    ctx.fillStyle = i % 3 === 0 ? `rgba(232, 184, 109, ${a})` : `rgba(155, 140, 255, ${a * 0.7})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlaceholderGameplay(ctx, x, y, fw, fh) {
  const brickW = fw / 8;
  const brickH = fh * 0.11;
  const colors = ['#c4785a', '#7eb87a', '#9b8cff', '#e8b86d', '#d45d8c'];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 7; col++) {
      const bx = x + 24 + col * (brickW + 6);
      const by = y + 28 + row * (brickH + 8);
      ctx.fillStyle = colors[(row + col) % colors.length];
      roundRect(ctx, bx, by, brickW, brickH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const ballX = x + fw * 0.55;
  const ballY = y + fh * 0.62;
  const grd = ctx.createRadialGradient(ballX, ballY, 0, ballX, ballY, 28);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.45, '#e8b86d');
  grd.addColorStop(1, 'rgba(232, 184, 109, 0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(ballX, ballY, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8ee';
  ctx.beginPath();
  ctx.arc(ballX, ballY, 14, 0, Math.PI * 2);
  ctx.fill();

  const padY = y + fh - 36;
  const padW = fw * 0.38;
  const padX = x + (fw - padW) / 2;
  ctx.fillStyle = '#8b6914';
  roundRect(ctx, padX, padY, padW, 18, 8);
  ctx.fill();
  ctx.strokeStyle = '#e8b86d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(232, 184, 109, 0.5)';
  ctx.fillRect(padX + padW * 0.35, padY - 2, padW * 0.3, 4);
}

function drawSnapshotFrame(ctx, snapshot, x, y, fw, fh) {
  ctx.save();
  roundRect(ctx, x, y, fw, fh, 24);
  ctx.clip();

  if (snapshot && canvasHasContent(snapshot)) {
    const scale = Math.max(fw / snapshot.width, fh / snapshot.height);
    const dw = snapshot.width * scale;
    const dh = snapshot.height * scale;
    ctx.drawImage(snapshot, x + (fw - dw) / 2, y + (fh - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(8, 5, 12, 0.12)';
    ctx.fillRect(x, y, fw, fh);
  } else {
    ctx.fillStyle = '#0a0610';
    ctx.fillRect(x, y, fw, fh);
    drawPlaceholderGameplay(ctx, x, y, fw, fh);
  }
  ctx.restore();

  ctx.strokeStyle = '#e8b86d';
  ctx.lineWidth = 4;
  roundRect(ctx, x, y, fw, fh, 24);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(212, 93, 140, 0.45)';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 6, y + 6, fw - 12, fh - 12, 20);
  ctx.stroke();
}

function drawBadge(ctx, text, cx, cy, color = '#d45d8c') {
  ctx.font = '900 28px Orbitron, monospace';
  const tw = ctx.measureText(text).width;
  const pw = tw + 48;
  const ph = 52;
  const bx = cx - pw / 2;
  const by = cy - ph / 2;
  ctx.fillStyle = 'rgba(8, 5, 12, 0.85)';
  roundRect(ctx, bx, by, pw, ph, 26);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

function drawShareCard(ctx, stats) {
  const w = CARD_W;
  const h = CARD_H;
  drawNeonBackground(ctx, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.shadowColor = 'rgba(232, 184, 109, 0.85)';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#e8b86d';
  ctx.font = '900 72px Orbitron, monospace';
  ctx.fillText('NEON NEXUS', w / 2, 118);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#d45d8c';
  ctx.font = '700 26px Syne, Orbitron, monospace';
  ctx.fillText('JARDINAINS!  GARDEN SIEGE', w / 2, 162);

  if (stats.badge) {
    drawBadge(ctx, stats.badge, w / 2, 210, stats.badgeColor ?? '#7eb87a');
  }

  const frameX = 64;
  const frameY = stats.badge ? 248 : 200;
  const frameW = w - 128;
  const frameH = 460;
  drawSnapshotFrame(ctx, stats.snapshot, frameX, frameY, frameW, frameH);

  const statsY = frameY + frameH + 56;
  ctx.fillStyle = '#f5ebe0';
  ctx.font = '900 52px Orbitron, monospace';
  ctx.fillText(stats.heroStat ?? stats.line1 ?? '', w / 2, statsY);

  if (stats.line2) {
    ctx.fillStyle = '#e8b86d';
    ctx.font = 'bold 34px Orbitron, monospace';
    ctx.fillText(stats.line2, w / 2, statsY + 52);
  }

  if (stats.line3) {
    ctx.fillStyle = '#9b8cff';
    ctx.font = 'bold 28px Orbitron, monospace';
    ctx.fillText(stats.line3, w / 2, statsY + 98);
  }

  ctx.fillStyle = 'rgba(168, 152, 176, 0.95)';
  ctx.font = '22px Orbitron, monospace';
  ctx.fillText(stats.hook ?? 'Bullet-time · 27 power-ups · Infinite levels', w / 2, statsY + 148);

  const ctaY = h - 148;
  const ctaGrad = ctx.createLinearGradient(0, ctaY, 0, h);
  ctaGrad.addColorStop(0, 'rgba(8, 5, 12, 0)');
  ctaGrad.addColorStop(0.2, 'rgba(8, 5, 12, 0.92)');
  ctaGrad.addColorStop(1, 'rgba(8, 5, 12, 0.98)');
  ctx.fillStyle = ctaGrad;
  ctx.fillRect(0, ctaY - 20, w, h - ctaY + 20);

  ctx.fillStyle = '#7eb87a';
  ctx.font = '900 36px Orbitron, monospace';
  ctx.fillText('▶  PLAY FREE', w / 2, h - 98);

  const url = getGameUrl().replace(/^https?:\/\//, '');
  ctx.fillStyle = '#e8b86d';
  ctx.font = 'bold 24px Orbitron, monospace';
  ctx.fillText(url, w / 2, h - 52);

  ctx.fillStyle = 'rgba(95, 112, 136, 0.85)';
  ctx.font = '16px Orbitron, monospace';
  ctx.fillText('Neon Nexus · Bullet-Time Brickbreaker', w / 2, h - 22);
}

function statsFromPayload(stats) {
  return {
    snapshot: stats.snapshot ?? null,
    badge: stats.badge ?? null,
    badgeColor: stats.badgeColor,
    heroStat: stats.heroStat ?? stats.line1,
    line1: stats.line1,
    line2: stats.line2,
    line3: stats.line3,
    hook: stats.hook,
  };
}

export async function shareProgressScreenshot(game, stats = {}) {
  const src = game?.canvas ?? null;
  const payload = statsFromPayload({
    ...stats,
    snapshot: stats.snapshot ?? src,
  });

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  drawShareCard(ctx, payload);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.94));
  if (!blob) return { ok: false, reason: 'blob-failed' };

  const kind = stats.kind ?? 'progress';
  const shareText = stats.shareText ?? buildShareMessage(kind, stats.shareData ?? stats);
  const title = stats.shareTitle ?? shareTitle(kind);
  const url = getGameUrl();
  const file = new File([blob], `neon-nexus-${kind}.png`, { type: 'image/png' });

  try {
    if (navigator.share) {
      const payload = { title, text: shareText, url };
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
        return { ok: true, method: 'share-file' };
      }
      await navigator.share(payload);
      return { ok: true, method: 'share-text' };
    }
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, reason: 'cancelled' };
  }

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `neon-nexus-${kind}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);

  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(shareText); } catch { /* noop */ }
    return { ok: true, method: 'download+clipboard' };
  }
  return { ok: true, method: 'download' };
}

export { buildShareMessage, getGameUrl };
