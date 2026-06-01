#!/usr/bin/env node
/** Generate PWA launcher icons + Open Graph preview + Next/Capacitor app icons + manifest. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPwaManifest } from './pwa-manifest.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, '..');
const publicDir = join(rootDir, 'public');
const androidDir = join(publicDir, 'icons/android');
const iosDir = join(publicDir, 'icons/ios');
const appDir = join(rootDir, 'app');
const resourcesDir = join(rootDir, 'resources');

for (const d of [androidDir, iosDir, appDir, resourcesDir]) {
  mkdirSync(d, { recursive: true });
}

const SITE_URL = (process.env.VITE_GAME_URL || '').replace(/\/$/, '');

const BG = [8, 5, 12];
const TEAL = [47, 230, 199];
const PINK = [255, 79, 163];
const GOLD = [255, 192, 77];

const BRICK_PALETTE = [
  [255, 111, 156],
  TEAL,
  GOLD,
  [138, 123, 255],
  [90, 160, 255],
];

const ANDROID_SIZES = [48, 72, 96, 144, 192, 512];
const MASKABLE_SIZES = [192, 512];
const IOS_SIZES = [20, 29, 40, 57, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

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

function mixRgb(base, overlay, alpha) {
  return [
    clamp8(lerp(base[0], overlay[0], alpha)),
    clamp8(lerp(base[1], overlay[1], alpha)),
    clamp8(lerp(base[2], overlay[2], alpha)),
  ];
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function strokeDist(px, py, x1, y1, x2, y2, halfWidth) {
  return Math.max(0, distToSegment(px, py, x1, y1, x2, y2) - halfWidth);
}

/** Signed distance to rounded rect (negative = inside). */
function roundedRectSdf(px, py, x, y, w, h, r) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const qx = Math.abs(px - cx) - w / 2 + r;
  const qy = Math.abs(py - cy) - h / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function inRoundedRect(px, py, x, y, w, h, r) {
  return roundedRectSdf(px, py, x, y, w, h, r) <= 0;
}

/** Paint the hub emblem — teal nexus orb + four-point star (matches title screen). */
function paintNexusEmblem(px, py, cx, cy, size, rgb) {
  const orbR = size * 0.26;
  const dist = Math.hypot(px - cx, py - cy);

  if (dist < orbR * 0.42) {
    return mixRgb(rgb, [255, 255, 255], 0.94);
  }
  if (dist < orbR) {
    const t = 1 - dist / orbR;
    return mixRgb(rgb, TEAL, 0.35 + t * 0.58);
  }
  if (dist < orbR * 2.15) {
    const t = 1 - (dist - orbR) / (orbR * 1.15);
    return mixRgb(rgb, TEAL, t * 0.42);
  }

  const armW = size * 0.016;
  const armLen = orbR * 0.78;
  const starD = Math.min(
    strokeDist(px, py, cx, cy - armLen, cx, cy + armLen, armW),
    strokeDist(px, py, cx - armLen, cy, cx + armLen, cy, armW),
  );
  if (starD < armW * 2.8) {
    const edge = Math.max(0, 1 - starD / (armW * 2.8));
    return mixRgb(rgb, [255, 255, 255], 0.7 + edge * 0.28);
  }

  const dotR = size * 0.014;
  for (const [dx, dy] of [[0.22, -0.22], [0.22, 0.22], [-0.2, 0.2]]) {
    const dd = Math.hypot(px - (cx + size * dx), py - (cy + size * dy));
    if (dd < dotR) return mixRgb(rgb, [255, 255, 255], 0.85);
  }

  const ringR = orbR * 1.35;
  const ringDist = Math.abs(dist - ringR);
  if (ringDist < size * 0.012) {
    return mixRgb(rgb, PINK, 0.55);
  }

  return rgb;
}

/** Branded launcher — nexus orb, brick row, paddle & ball on #08050c. */
function launcherIconRgb(x, y, size, { maskable = false } = {}) {
  const cx = size * 0.5;
  const cy = size * 0.46;
  let px = x;
  let py = y;

  if (maskable) {
    const safe = 0.76;
    px = (x - cx) / safe + cx;
    py = (y - cy) / safe + cy;
  }

  const nx = (px - cx) / size;
  const ny = (py - cy) / size;
  const dist = Math.hypot(nx, ny);

  let rgb = [...BG];
  const vignette = Math.min(1, dist * 1.2);
  rgb = mixRgb(rgb, [16, 10, 28], vignette * 0.45);

  const glow = Math.max(0, 1 - dist * 2.2);
  rgb = mixRgb(rgb, TEAL, glow * 0.2);
  rgb = mixRgb(rgb, PINK, glow * 0.1);

  if (maskable) {
    rgb = mixRgb([12, 8, 22], rgb, Math.max(0, 1 - dist * 1.05));
  }

  const iconPad = size * 0.06;
  const iconR = size * 0.2;
  const iconSize = size - iconPad * 2;
  if (!maskable && !inRoundedRect(px, py, iconPad, iconPad, iconSize, iconSize, iconR)) {
    return BG;
  }

  const brickW = size * 0.17;
  const brickH = size * 0.074;
  const gridTop = size * 0.14;
  const gridLeft = cx - brickW * 2.1;
  for (let col = 0; col < 4; col++) {
    if ((col + 1) % 4 === 0) continue;
    const bx = gridLeft + col * (brickW + size * 0.018);
    const by = gridTop;
    const inset = size * 0.01;
    if (px >= bx && px <= bx + brickW && py >= by && py <= by + brickH) {
      if (px > bx + inset && px < bx + brickW - inset && py > by + inset && py < by + brickH - inset) {
        rgb = mixRgb(rgb, BRICK_PALETTE[col % BRICK_PALETTE.length], 0.9);
        rgb = mixRgb(rgb, [255, 255, 255], 0.1);
      } else {
        rgb = mixRgb(rgb, TEAL, 0.3);
      }
    }
  }

  rgb = paintNexusEmblem(px, py, cx, cy - size * 0.02, size, rgb);

  const paddleY = size * 0.82;
  const paddleH = size * 0.058;
  const paddleW = size * 0.4;
  const paddleDist = roundedRectSdf(px, py, cx - paddleW / 2, paddleY - paddleH / 2, paddleW, paddleH, paddleH / 2);
  if (paddleDist <= 0) {
    rgb = mixRgb(rgb, GOLD, 0.88);
    rgb = mixRgb(rgb, TEAL, 0.35);
    rgb = mixRgb(rgb, [255, 255, 255], 0.18);
  } else if (paddleDist < size * 0.02) {
    rgb = mixRgb(rgb, TEAL, (1 - paddleDist / (size * 0.02)) * 0.38);
  }

  const ballR = size * 0.058;
  const ballX = cx;
  const ballY = size * 0.66;
  const ballDist = Math.hypot(px - ballX, py - ballY);
  if (ballDist < ballR) {
    rgb = mixRgb(rgb, [255, 255, 255], 0.96);
    rgb = mixRgb(rgb, TEAL, Math.max(0, 1 - ballDist / ballR) * 0.45);
  } else if (ballDist < ballR * 2.6) {
    rgb = mixRgb(rgb, TEAL, (1 - ballDist / (ballR * 2.6)) * 0.4);
  }

  return rgb;
}

function launcherIconPng(size, options) {
  return encodePng(size, size, (x, y) => launcherIconRgb(x, y, size, options));
}

/** 1200×630 social preview — dense bricks, nexus orb, paddle strip. */
function ogImagePng() {
  const W = 1200;
  const H = 630;
  const cx = W * 0.5;
  const emblemCy = H * 0.2;

  return encodePng(W, H, (x, y) => {
    const ny = y / H;
    const nx = (x - cx) / W;
    const ny2 = (y - H * 0.42) / H;
    const dist = Math.hypot(nx * 0.85, ny2 * 0.7);

    let rgb = mixRgb([8, 5, 12], [18, 12, 32], ny * 0.55);
    const glow = Math.max(0, 1 - dist * 1.25);
    rgb = mixRgb(rgb, TEAL, glow * 0.32);
    rgb = mixRgb(rgb, PINK, glow * 0.14);

    const brickW = 52;
    const brickH = 24;
    const gap = 4;
    const fieldTop = H * 0.2;
    const fieldBottom = H * 0.72;
    const fieldLeft = W * 0.1;
    const fieldRight = W * 0.9;
    if (y > fieldTop && y < fieldBottom && x > fieldLeft && x < fieldRight) {
      const col = Math.floor((x - fieldLeft) / (brickW + gap));
      const row = Math.floor((y - fieldTop) / (brickH + gap));
      const stagger = row % 2 === 0 ? 0 : brickW * 0.35;
      const bx = fieldLeft + stagger + col * (brickW + gap);
      const by = fieldTop + row * (brickH + gap);
      if (x >= bx + 2 && x <= bx + brickW - 2 && y >= by + 2 && y <= by + brickH - 2) {
        if ((row * 7 + col * 3) % 19 !== 0) {
          const palette = [
            [255, 111, 156],
            TEAL,
            GOLD,
            [155, 140, 255],
            [90, 160, 255],
            [126, 184, 122],
          ];
          const c = palette[(row + col) % palette.length];
          rgb = mixRgb(rgb, c, 0.82);
          if (y < by + 6) rgb = mixRgb(rgb, [255, 255, 255], 0.12);
        }
      }
    }

    rgb = paintNexusEmblem(x, y, cx, emblemCy, W * 0.14, rgb);

    const paddleY = H * 0.8;
    const paddleH = 20;
    const paddleW = W * 0.28;
    const paddleDist = roundedRectSdf(x, y, cx - paddleW / 2, paddleY, paddleW, paddleH, paddleH / 2);
    if (paddleDist <= 0) {
      rgb = mixRgb(rgb, GOLD, 0.9);
      rgb = mixRgb(rgb, TEAL, 0.35);
    } else if (paddleDist < 8) {
      rgb = mixRgb(rgb, TEAL, (1 - paddleDist / 8) * 0.35);
    }

    const ballR = 14;
    const ballDist = Math.hypot(x - cx, y - (paddleY - 22));
    if (ballDist < ballR) {
      rgb = mixRgb(rgb, [255, 255, 255], 0.95);
    } else if (ballDist < ballR * 3) {
      rgb = mixRgb(rgb, TEAL, (1 - ballDist / (ballR * 3)) * 0.38);
    }

    return rgb;
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

for (const s of ANDROID_SIZES) {
  writeFileSync(join(androidDir, `android-launchericon-${s}-${s}.png`), launcherIconPng(s));
}

for (const s of MASKABLE_SIZES) {
  writeFileSync(
    join(androidDir, `android-launchericon-${s}-${s}-maskable.png`),
    launcherIconPng(s, { maskable: true }),
  );
}

for (const s of IOS_SIZES) {
  writeFileSync(join(iosDir, `${s}.png`), launcherIconPng(s));
}

writeFileSync(join(appDir, 'icon.png'), launcherIconPng(512));
writeFileSync(join(appDir, 'apple-icon.png'), launcherIconPng(180));
writeFileSync(join(publicDir, 'apple-touch-icon.png'), launcherIconPng(180));
writeFileSync(join(resourcesDir, 'icon.png'), launcherIconPng(1024));

writeFileSync(join(publicDir, 'og-image.png'), ogImagePng());
writeFileSync(
  join(publicDir, 'manifest.json'),
  `${JSON.stringify(buildPwaManifest({ siteUrl: SITE_URL }), null, 2)}\n`,
);
writeSeoFiles();

console.log('Generated PWA icons in public/icons/android/');
console.log('Generated iOS icons in public/icons/ios/');
console.log('Generated app/icon.png and app/apple-icon.png (Next.js)');
console.log('Generated resources/icon.png (Capacitor: npx @capacitor/assets generate)');
console.log('Generated public/manifest.json, og-image.png, robots.txt, sitemap.xml');
