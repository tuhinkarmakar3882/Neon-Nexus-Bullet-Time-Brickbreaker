#!/usr/bin/env node
/** Generate PWA launcher icons + Open Graph preview image + SEO files + manifest. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPwaManifest } from './pwa-manifest.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dir, '../public');
const outDir = join(publicDir, 'icons/android');
mkdirSync(outDir, { recursive: true });

const SITE_URL = (process.env.VITE_GAME_URL || '').replace(/\/$/, '');

const BRICK_PALETTE = [
  [138, 123, 255],
  [255, 111, 156],
  [47, 217, 199],
  [255, 192, 77],
  [90, 160, 255],
];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(width, height, getRgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getRgb(x, y);
      const i = 1 + x * 3;
      row[i] = r;
      row[i + 1] = g;
      row[i + 2] = b;
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const idat = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp8(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function strokeDist(px, py, x1, y1, x2, y2, halfWidth) {
  return Math.max(0, distToSegment(px, py, x1, y1, x2, y2) - halfWidth);
}

function mixRgb(base, overlay, alpha) {
  return [
    clamp8(lerp(base[0], overlay[0], alpha)),
    clamp8(lerp(base[1], overlay[1], alpha)),
    clamp8(lerp(base[2], overlay[2], alpha)),
  ];
}

/** Branded square launcher icon — neon N, brick row, paddle & ball. */
function launcherIconRgb(x, y, size, { maskable = false } = {}) {
  const cx = size * 0.5;
  const cy = size * 0.5;
  let px = x;
  let py = y;

  if (maskable) {
    const safe = 0.72;
    px = (x - cx) / safe + cx;
    py = (y - cy) / safe + cy;
  }

  const nx = (px - cx) / size;
  const ny = (py - cy) / size;
  const dist = Math.hypot(nx, ny);

  let rgb = [5, 6, 12];
  const nyNorm = py / size;
  rgb = mixRgb(rgb, [10, 13, 28], 1 - nyNorm * 0.55);
  rgb = mixRgb(rgb, [18, 8, 24], Math.min(1, dist * 1.35) * 0.35);

  const glow = Math.max(0, 1 - dist * 2.1);
  rgb = mixRgb(rgb, [47, 230, 199], glow * 0.22);

  if (maskable) {
    rgb = mixRgb([18, 8, 24], rgb, Math.max(0, 1 - dist * 1.15));
  }

  const brickW = size * 0.17;
  const brickH = size * 0.075;
  const gridTop = size * 0.14;
  const gridLeft = cx - brickW * 1.55;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const bx = gridLeft + col * (brickW + size * 0.018) + (row % 2 ? brickW * 0.28 : 0);
      const by = gridTop + row * (brickH + size * 0.014);
      if (px >= bx && px <= bx + brickW && py >= by && py <= by + brickH) {
        const inset = size * 0.008;
        if (px > bx + inset && px < bx + brickW - inset && py > by + inset && py < by + brickH - inset) {
          const palette = BRICK_PALETTE[(row * 3 + col) % BRICK_PALETTE.length];
          rgb = mixRgb(rgb, palette, 0.88);
        }
      }
    }
  }

  const stroke = size * 0.065;
  const nLeft = cx - size * 0.16;
  const nRight = cx + size * 0.16;
  const nTop = cy - size * 0.14;
  const nMid = cy + size * 0.02;
  const nBot = cy + size * 0.2;

  const nDist = Math.min(
    strokeDist(px, py, nLeft, nTop, nLeft, nBot, stroke * 0.5),
    strokeDist(px, py, nLeft, nTop, nRight, nBot, stroke * 0.5),
    strokeDist(px, py, nRight, nTop, nRight, nBot, stroke * 0.5),
  );

  if (nDist < stroke * 1.8) {
    const edge = Math.max(0, 1 - nDist / (stroke * 1.8));
    rgb = mixRgb(rgb, [47, 230, 199], 0.55 + edge * 0.4);
    rgb = mixRgb(rgb, [255, 79, 163], edge * 0.25);
  }

  const paddleY = size * 0.78;
  const paddleH = size * 0.055;
  const paddleW = size * 0.34;
  if (Math.abs(py - paddleY) < paddleH && Math.abs(px - cx) < paddleW * 0.5) {
    rgb = mixRgb(rgb, [47, 230, 199], 0.92);
  }

  const ballR = size * 0.055;
  const ballX = cx + size * 0.08;
  const ballY = size * 0.62;
  const ballDist = Math.hypot(px - ballX, py - ballY);
  if (ballDist < ballR) {
    rgb = mixRgb(rgb, [255, 255, 255], 0.95);
    rgb = mixRgb(rgb, [47, 230, 199], Math.max(0, 1 - ballDist / ballR) * 0.35);
  } else if (ballDist < ballR * 2.2) {
    rgb = mixRgb(rgb, [47, 230, 199], (1 - ballDist / (ballR * 2.2)) * 0.35);
  }

  const corner = Math.min(px / (size * 0.08), py / (size * 0.08), (size - px) / (size * 0.08), (size - py) / (size * 0.08), 1);
  if (corner < 1 && !maskable) {
    rgb = mixRgb([5, 6, 12], rgb, corner);
  }

  return rgb;
}

function launcherIconPng(size, options) {
  return encodePng(size, size, (x, y) => launcherIconRgb(x, y, size, options));
}

/** 1200×630 social preview — neon garden siege art without external fonts. */
function ogImagePng() {
  const W = 1200;
  const H = 630;
  const cx = W * 0.5;
  const cy = H * 0.46;

  return encodePng(W, H, (x, y) => {
    const ny = y / H;
    const nx = (x - cx) / W;
    const ny2 = (y - cy) / H;
    const dist = Math.hypot(nx * 0.9, ny2 * 0.75);

    let r = lerp(18, 8, ny);
    let g = lerp(24, 5, ny);
    let b = lerp(40, 12, ny);

    const glow = Math.max(0, 1 - dist * 1.35);
    r = lerp(r, 232, glow * 0.55);
    g = lerp(g, 184, glow * 0.42);
    b = lerp(b, 109, glow * 0.18);

    const scan = ((y + x * 0.15) % 18) < 2;
    if (scan) {
      r = lerp(r, 100, 0.35);
      g = lerp(g, 180, 0.35);
      b = lerp(b, 255, 0.35);
    }

    const edge = Math.min(x / 80, y / 80, (W - x) / 80, (H - y) / 80, 1);
    r = lerp(4, r, edge);
    g = lerp(5, g, edge);
    b = lerp(12, b, edge);

    const brickRow = Math.floor((y - H * 0.22) / 34);
    const brickCol = Math.floor((x - W * 0.18) / 52);
    if (y > H * 0.22 && y < H * 0.58 && x > W * 0.18 && x < W * 0.82) {
      const inBrick = x % 52 > 3 && y % 34 > 3;
      if (inBrick && (brickRow + brickCol) % 2 === 0) {
        const hue = (brickRow * 3 + brickCol) % 5;
        const palette = [
          [196, 120, 90],
          [212, 93, 140],
          [232, 184, 109],
          [155, 140, 255],
          [126, 184, 122],
        ];
        const [br, bg, bb] = palette[hue];
        r = lerp(r, br, 0.72);
        g = lerp(g, bg, 0.72);
        b = lerp(b, bb, 0.72);
      }
    }

    const barY = H * 0.78;
    if (y > barY && y < barY + 22 && x > W * 0.28 && x < W * 0.72) {
      r = lerp(r, 68, 0.85);
      g = lerp(g, 136, 0.85);
      b = lerp(b, 255, 0.85);
    }

    return [clamp8(r), clamp8(g), clamp8(b)];
  });
}

function writeSeoFiles() {
  const robots = SITE_URL
    ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
    : `User-agent: *\nAllow: /\n\nSitemap: /sitemap.xml\n`;
  writeFileSync(join(publicDir, 'robots.txt'), robots);

  const loc = SITE_URL || 'https://example.com';
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${loc}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  writeFileSync(join(publicDir, 'sitemap.xml'), sitemap);
}

const sizes = [48, 72, 96, 144, 192, 512];
for (const s of sizes) {
  writeFileSync(join(outDir, `android-launchericon-${s}-${s}.png`), launcherIconPng(s));
}

for (const s of [192, 512]) {
  writeFileSync(
    join(outDir, `android-launchericon-${s}-${s}-maskable.png`),
    launcherIconPng(s, { maskable: true }),
  );
}

writeFileSync(join(publicDir, 'og-image.png'), ogImagePng());
writeFileSync(join(publicDir, 'manifest.json'), `${JSON.stringify(buildPwaManifest(), null, 2)}\n`);
writeSeoFiles();

console.log('Generated PWA icons in public/icons/android/');
console.log('Generated public/manifest.json');
console.log('Generated public/og-image.png (1200×630)');
console.log('Generated public/robots.txt and public/sitemap.xml');
