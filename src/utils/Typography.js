import { GAME } from '../config/Constants.js';
import { clamp } from './Helpers.js';

const REF_W = 1280;
const REF_H = 800;
const REF_PORTRAIT_H = 844;

/** Render Phaser text bitmaps at device density (safe — does not affect layout). */
export function textResolution() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/** Primary stacks — keep in sync with index.html Google Fonts link. */
export const FONTS = {
  display: '"Chakra Petch", system-ui, sans-serif',
  body: '"DM Sans", system-ui, sans-serif',
};

/** Viewport scale factor — design px → device px. */
export function uiScale() {
  const { WIDTH: W, HEIGHT: H, IS_PORTRAIT: p } = GAME;
  if (p) return clamp(H / REF_PORTRAIT_H, 0.52, 1.12);
  return clamp(Math.min(W / REF_W, H / REF_H), 0.62, 1.12);
}

export function parseDesignPx(v, fallback = 16) {
  if (typeof v === 'number') return v;
  return parseInt(String(v), 10) || fallback;
}

/** Scale a design-token size to device pixels. */
export function uiPx(designPx, opts = {}) {
  const scaled = Math.round(designPx * uiScale());
  const min = opts.min ?? Math.round(designPx * (opts.minRatio ?? 0.55));
  const max = opts.max ?? Math.round(designPx * (opts.maxRatio ?? 1.15));
  return clamp(scaled, min, max);
}

export function uiFont(designPx, opts = {}) {
  return `${uiPx(designPx, opts)}px`;
}

export function wrapWidth(ratio = 0.88, pad = 0) {
  return Math.floor(GAME.WIDTH * ratio - pad);
}

export function arenaWidth() {
  const G = GAME;
  return G.WIDTH - G.WALL_X * 2 - G.SAFE_LEFT - G.SAFE_RIGHT;
}

/** Headlines, HUD scores, buttons, flash text. */
export function displayStyle(size, color, extra = {}) {
  const px = typeof size === 'number' ? uiFont(size) : size;
  return { fontFamily: FONTS.display, fontSize: px, color, resolution: textResolution(), ...extra };
}

/** Codex descriptions, settings copy, long-form overlay text. */
export function bodyStyle(size, color, extra = {}) {
  const px = typeof size === 'number' ? uiFont(size) : size;
  return { fontFamily: FONTS.body, fontSize: px, color, resolution: textResolution(), ...extra };
}

/** Back-compat alias used across scenes. */
export function orbitronStyle(size, color, extra = {}) {
  return displayStyle(size, color, extra);
}

/** Section labels / micro caps. */
export function labelStyle(size, color, extra = {}) {
  return displayStyle(size, color, {
    fontStyle: '600',
    letterSpacing: '0.08em',
    ...extra,
  });
}

/** Shrink a text object until it fits maxWidth. Returns final font size in px. */
export function fitTextWidth(textObj, maxWidth, minPx = 9) {
  if (!textObj || maxWidth <= 0) return minPx;
  let px = parseDesignPx(textObj.style?.fontSize, minPx);
  let guard = 72;
  while (textObj.width > maxWidth && px > minPx && guard-- > 0) {
    px -= 1;
    textObj.setFontSize(px);
  }
  return px;
}

/** Fit a button label inside the visible button width. */
export function fitButtonLabel(textObj, btnWidth, minPx = 9) {
  const pad = GAME.IS_PORTRAIT ? 14 : 20;
  return fitTextWidth(textObj, Math.max(20, btnWidth - pad), minPx);
}

/** Overlay scene typography tokens (Pause, GameOver, Settings, etc.). */
export function overlayType(panel) {
  const cardW = panel?.cardW ?? Math.min(GAME.WIDTH * 0.82, 680);
  return {
    cardW,
    btnW: Math.min(cardW * 0.88, uiPx(460, { max: 520 })),
    title: uiFont(56, { min: 30, max: 72 }),
    headline: uiFont(44, { min: 26, max: 64 }),
    h1: uiFont(36, { min: 22, max: 48 }),
    h2: uiFont(28, { min: 18, max: 36 }),
    body: uiFont(22, { min: 14, max: 26 }),
    caption: uiFont(16, { min: 11, max: 18 }),
    micro: uiFont(12, { min: 9, max: 14 }),
    wrap: Math.floor(cardW * 0.9),
    wrapFull: wrapWidth(0.88),
    btnH: (design) => uiPx(design, { min: Math.round(design * 0.55), max: design }),
  };
}

/** Canvas 2D ctx.font string (share cards, etc.). */
export function canvasFont(sizePx, weight = '700', variant = 'display') {
  const stack = variant === 'body' ? FONTS.body : FONTS.display;
  return `${weight} ${sizePx}px ${stack.replace(/"/g, '')}`;
}

/** Wait for web fonts before first Phaser text render (avoids fallback flash). */
export async function ensureFontsLoaded() {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  const loads = Promise.all([
    document.fonts.load('600 16px Chakra Petch'),
    document.fonts.load('700 16px Chakra Petch'),
    document.fonts.load('500 16px "DM Sans"'),
    document.fonts.load('600 16px "DM Sans"'),
  ]).then(() => document.fonts.ready);
  try {
    await Promise.race([loads, timeout]);
  } catch {
    /* offline / blocked CDN — fall back to system-ui */
  }
}
