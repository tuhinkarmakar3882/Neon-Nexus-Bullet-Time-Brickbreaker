import {
  Zap, Maximize2, Hand, Snail, Copy, Shield, Shrink, FlipVertical2, Flame, Snowflake,
  Bomb, Heart, FastForward, Gauge, Activity, Bolt, Droplets, Crosshair, Magnet, Ghost,
  Rocket, Orbit, Radar, Repeat, CircleDot, Minimize2, Shuffle, Sparkles, CircleGauge,
  ThermometerSnowflake, Disc, CloudFog,   Settings, Pause, Gem, Sprout,
} from 'lucide';
import { POWER_KEYS, POWERS } from '../config/PowerUps.js';

/** Lucide icon node lookup — keyed by POWERS[].icon */
const LUCIDE = {
  zap: Zap,
  flame: Flame,
  droplets: Droplets,
  snowflake: Snowflake,
  bolt: Bolt,
  hand: Hand,
  maximize: Maximize2,
  shrink: Shrink,
  'gauge-up': CircleGauge,
  'gauge-down': Snail,
  flip: FlipVertical2,
  magnet: Magnet,
  bomb: Bomb,
  crosshair: Crosshair,
  ghost: Ghost,
  rocket: Rocket,
  orbit: Orbit,
  radar: Radar,
  repeat: Repeat,
  copy: Copy,
  activity: Activity,
  gauge: Gauge,
  thermometer: ThermometerSnowflake,
  heart: Heart,
  shield: Shield,
  'fast-forward': FastForward,
  'circle-dot': CircleDot,
  minimize: Minimize2,
  shuffle: Shuffle,
  sparkles: Sparkles,
  disc: Disc,
  cloud: CloudFog,
};

function normalizeIconNode(icon) {
  if (!icon) return [];
  if (icon.length === 3 && Array.isArray(icon[2])) return icon[2];
  if (icon.length && Array.isArray(icon[0]) && typeof icon[0][0] === 'string') return icon;
  return [];
}

function drawIconNode(ctx, iconNode, size) {
  const nodes = normalizeIconNode(iconNode);
  const pad = 4;
  const scale = (size - pad * 2) / 24;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(pad, pad);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 2.25;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [tag, attrs] of nodes) {
    const a = attrs || {};
    const stroke = a.stroke !== 'none';
    const fill = a.fill && a.fill !== 'none';

    if (tag === 'path' && a.d) {
      const p = new Path2D(a.d);
      if (fill) ctx.fill(p);
      if (stroke) ctx.stroke(p);
    } else if (tag === 'circle') {
      ctx.beginPath();
      ctx.arc(Number(a.cx), Number(a.cy), Number(a.r), 0, Math.PI * 2);
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    } else if (tag === 'rect') {
      const rx = Number(a.rx || 0);
      const x = Number(a.x), y = Number(a.y), w = Number(a.width), h = Number(a.height);
      if (rx > 0) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, rx);
      } else {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
      }
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    } else if (tag === 'line') {
      ctx.beginPath();
      ctx.moveTo(Number(a.x1), Number(a.y1));
      ctx.lineTo(Number(a.x2), Number(a.y2));
      ctx.stroke();
    } else if (tag === 'polyline' && a.points) {
      const pts = String(a.points).trim().split(/\s+/).map(Number);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        if (i === 0) ctx.moveTo(pts[i], pts[i + 1]);
        else ctx.lineTo(pts[i], pts[i + 1]);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFallbackIcon(ctx, size, label = '?') {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.42)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.slice(0, 2), size / 2, size / 2 + 1);
}

/** Rasterize one white icon per canonical power key. */
export function generateIconTextures(scene) {
  const size = 32;
  POWER_KEYS.forEach((key) => {
    const texKey = `icon-${key}`;
    if (scene.textures.exists(texKey)) return;

    const def = POWERS[key];
    const iconNode = LUCIDE[def?.icon];
    const canvas = scene.textures.createCanvas(texKey, size, size);
    const ctx = canvas.getContext();
    try {
      if (iconNode && normalizeIconNode(iconNode).length) {
        drawIconNode(ctx, iconNode, size);
      } else {
        drawFallbackIcon(ctx, size, def?.short ?? key);
      }
    } catch {
      drawFallbackIcon(ctx, size, def?.short ?? key);
    }
    canvas.refresh();
  });
}

export function iconTextureKey(powerKey) {
  return `icon-${powerKey}`;
}

/** Canvas UI icons — avoids SVG loader issues on mobile Safari / Capacitor. */
export function generateUiIcons(scene) {
  const mk = (key, size, iconNode, fallback) => {
    if (scene.textures.exists(key)) return;
    const canvas = scene.textures.createCanvas(key, size, size);
    const ctx = canvas.getContext();
    try {
      if (iconNode && normalizeIconNode(iconNode).length) {
        drawIconNode(ctx, iconNode, size);
      } else {
        drawFallbackIcon(ctx, size, fallback ?? '?');
      }
    } catch {
      drawFallbackIcon(ctx, size, fallback ?? '?');
    }
    canvas.refresh();
  };

  mk('pause-icon', 48, Pause, 'II');
  mk('heart-icon', 32, Heart, '♥');
  mk('gem-icon', 24, Gem, '◆');
  mk('leaf-icon', 24, Sprout, '🌿');
  mk('settings-icon', 48, Settings, '⚙');
}
