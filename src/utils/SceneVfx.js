/** Camera filters + fullscreen overlays driven by VFX quality presets (Phaser 4). */

import Phaser from 'phaser';
import { PAL } from '../config/Palette.js';

function clearCameraFilters(cam) {
  if (!cam?.filters?.internal) return;
  try { cam.filters.internal.clear(); } catch { /* WebGL unavailable */ }
}

function applyBloom(_cam, _amount) {
  // Phaser 4 parallel bloom draws dark sprite-bounds quads on canvas-texture sprites.
  // Vignette/grain/chroma overlays still apply; bloom stays off until upstream fix.
}

function applyVignette(cam, strength) {
  if (strength <= 0 || !cam?.filters?.internal) return;
  cam.filters.internal.addVignette(0.5, 0.5, 0.68, strength, 0x040810);
}

function destroyOverlay(scene, key) {
  const g = scene[`_${key}Gfx`];
  if (g) {
    g.destroy();
    scene[`_${key}Gfx`] = null;
  }
}

function ensureScanlines(scene, alpha) {
  destroyOverlay(scene, 'scanline');
  if (alpha <= 0) return;
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics().setDepth(999).setScrollFactor(0);
  g.fillStyle(0x000000, alpha);
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  scene._scanlineGfx = g;
}

function ensureGrain(scene, alpha) {
  destroyOverlay(scene, 'grain');
  if (alpha <= 0) return;
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics().setDepth(998).setScrollFactor(0).setBlendMode('OVERLAY');
  for (let i = 0; i < Math.floor(W * H * 0.00035); i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const a = alpha * (0.4 + Math.random() * 0.6);
    g.fillStyle(Math.random() > 0.5 ? 0xffffff : 0x000000, a);
    g.fillRect(x, y, 1, 1);
  }
  scene._grainGfx = g;
  scene.tweens.add({
    targets: g,
    alpha: { from: 0.85, to: 1 },
    duration: 120 + Math.random() * 80,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

function ensureChroma(scene, on) {
  destroyOverlay(scene, 'chroma');
  if (!on) return;
  const W = scene.scale.width;
  const H = scene.scale.height;
  const g = scene.add.graphics().setDepth(997).setScrollFactor(0).setBlendMode('ADD');
  const pad = Math.max(2, Math.round(W * 0.004));
  g.fillStyle(PAL.accent, 0.04);
  g.fillRect(0, 0, pad, H);
  g.fillStyle(PAL.accent2, 0.035);
  g.fillRect(W - pad, 0, pad, H);
  g.fillStyle(PAL.accent3, 0.03);
  g.fillRect(0, 0, W, pad);
  scene._chromaGfx = g;
  scene._chromaBaseAlpha = 1;
}

/** Rebuild camera filters and fullscreen overlays from resolved settings. */
export function applySceneVfx(scene, settings = {}) {
  if (!scene?.cameras?.main) return;
  scene.settings = { ...(scene.settings ?? {}), ...settings };

  const cam = scene.cameras.main;
  const bloom = settings.bloom ?? 0;
  scene._vfxBaseBloom = bloom;
  clearCameraFilters(cam);
  applyBloom(cam, bloom);
  applyVignette(cam, settings.vignette ?? 0);

  ensureScanlines(scene, settings.scanlines ? (settings.scanlineAlpha ?? 0.03) : 0);
  ensureGrain(scene, settings.grain ?? 0);
  ensureChroma(scene, !!settings.chroma);
}

/** Live quality change — same as applySceneVfx but preserves scene.settings merge. */
export function updateSceneVfx(scene, patch = {}) {
  applySceneVfx(scene, { ...(scene.settings ?? {}), ...patch });
}

export function destroySceneVfxOverlays(scene) {
  destroyOverlay(scene, 'scanline');
  destroyOverlay(scene, 'grain');
  destroyOverlay(scene, 'chroma');
}

/** Brief bloom bump on big hits (0.62 → ~0.85 for 200ms). */
export function bumpBloom(scene, opts = {}) {
  const base = scene?._vfxBaseBloom ?? scene?.settings?.bloom ?? 0;
  if (base <= 0 || scene?.settings?.reactiveBloom === false) return;
  const delta = opts.delta ?? 0.09;
  const ms = opts.ms ?? 200;
  const peak = Math.min(0.95, base + delta);
  updateSceneVfx(scene, { bloom: peak });
  scene._bloomBumpTimer?.remove?.(false);
  scene._bloomBumpTimer = scene.time.delayedCall(ms, () => {
    updateSceneVfx(scene, { bloom: base });
  });
}

/** Pulse chroma overlay alpha on knockout / cursed pickup. */
export function pulseChroma(scene, opts = {}) {
  if (!scene?.settings?.chroma || !scene._chromaGfx) return;
  const g = scene._chromaGfx;
  const strength = opts.strength ?? 1.12;
  const ms = opts.ms ?? 300;
  scene.tweens.killTweensOf(g);
  g.setAlpha(strength);
  scene.tweens.add({
    targets: g,
    alpha: scene._chromaBaseAlpha ?? 1,
    duration: ms,
    ease: 'Quad.easeOut',
  });
}
