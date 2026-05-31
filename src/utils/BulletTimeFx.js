import { GAME } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';

/** Screen-space bullet-time overlay + camera punch helpers. */

/** Force gameplay camera back to neutral (fixes stuck skew after FX). */
export function resetGameplayCamera(scene) {
  const cam = scene?.cameras?.main;
  if (!cam) return;
  scene.tweens?.killTweensOf(cam);
  cam.setZoom(1);
  cam.setAngle(0);
  cam.setRotation(0);
  clearBulletTimeFx(scene);
}

/** Hide bullet-time overlay streaks/vignette without touching camera zoom. */
export function clearBulletTimeFx(scene) {
  const fx = scene?.btFx;
  if (!fx) return;
  fx.intensity = 0;
  fx.baseZoom = 1;
  fx.overlay?.clear?.();
  fx.overlay?.setAlpha(0);
  fx.streaks?.clear?.();
  fx.streaks?.setAlpha(0);
}

export function initBulletTimeFx(scene) {
  const overlay = scene.add.graphics().setDepth(900).setScrollFactor(0).setAlpha(0);
  const streaks = scene.add.graphics().setDepth(899).setScrollFactor(0).setAlpha(0);
  scene.btFx = { overlay, streaks, intensity: 0, baseZoom: 1 };
  resetGameplayCamera(scene);
}

export function setBulletTimeIntensity(scene, intensity) {
  const fx = scene.btFx;
  if (!fx) return;
  fx.intensity = intensity;

  const cam = scene.cameras?.main;
  if (!cam) return;

  const zoom = 1 + 0.055 * intensity;
  fx.baseZoom = zoom;
  if (intensity >= 0.02) cam.setZoom(zoom);
  else cam.setZoom(1);

  if (intensity < 0.02) {
    clearBulletTimeFx(scene);
    if (cam) cam.setZoom(1);
    return;
  }

  const W = GAME.WIDTH;
  const H = GAME.HEIGHT;
  const g = fx.overlay;
  const boost = intensity > 1 ? 1 + (intensity - 1) * 0.35 : 1;
  g.clear();
  g.fillStyle(0x6a9cff, 0.07 * intensity * boost);
  g.fillRect(0, 0, W, H);

  const edge = Math.round(90 + 58 * intensity * boost);
  const edgeA = 0.42 * intensity * boost;
  g.fillStyle(0x04060e, edgeA);
  g.fillRect(0, 0, W, edge);
  g.fillRect(0, H - edge, W, edge);
  g.fillRect(0, 0, edge, H);
  g.fillRect(W - edge, 0, edge, H);

  g.lineStyle(2, PAL.accent, 0.22 * intensity);
  g.strokeRect(edge * 0.35, edge * 0.35, W - edge * 0.7, H - edge * 0.7);
  g.setAlpha(1);

  const sg = fx.streaks;
  sg.clear();
  const t = scene.frame ?? 0;
  const cx = W * 0.5;
  const cy = H * 0.48;
  // Radial motion streaks from play center
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + t * 0.018;
    const len = W * 0.55 + (i % 3) * 40;
    const x0 = cx + Math.cos(ang) * 20;
    const y0 = cy + Math.sin(ang) * 20;
    sg.lineStyle(1, 0xaaccff, 0.05 * intensity);
    sg.lineBetween(x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
  }
  // Horizontal scan streaks
  sg.lineStyle(1, 0xffffff, 0.055 * intensity);
  for (let i = 0; i < 6; i++) {
    const y = ((t * 3 + i * 113) % (H + 140)) - 70;
    sg.lineBetween(-20, y, W + 20, y + 22);
  }
  sg.setAlpha(1);
}

export function screenPunch(scene, amt = 0.05, dur = 70) {
  const cam = scene.cameras?.main;
  if (!cam) return;
  const base = scene.btFx?.baseZoom ?? 1;
  scene.tweens.killTweensOf(cam);
  scene.tweens.add({
    targets: cam,
    zoom: base + amt,
    duration: dur,
    yoyo: true,
    ease: 'Quad.easeOut',
    onComplete: () => {
      if (!cam.active) return;
      const fx = scene.btFx;
      const base = (fx?.intensity ?? 0) >= 0.02 ? (fx?.baseZoom ?? 1) : 1;
      cam.setZoom(base);
      cam.setAngle(0);
      cam.setRotation(0);
    },
  });
}

export function impactFlash(scene, color = 0xffffff, alpha = 0.35) {
  const cam = scene.cameras?.main;
  if (!cam) return;
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  try {
    cam.flash(80, r, g, b, false, (_cam, progress) => alpha * (1 - progress));
  } catch {
    cam.flash(80, r, g, b);
  }
}

export function radialBlast(scene, x, y, opts = {}) {
  const { tint = PAL.accent2, scale = 4.2, dur = 520, depth = 34 } = opts;
  const ring = scene.add.image(x, y, 'ring').setDepth(depth).setTint(tint)
    .setBlendMode('ADD').setScale(0.06).setAlpha(0.95);
  const ring2 = scene.add.image(x, y, 'ring').setDepth(depth - 1).setTint(0xffffff)
    .setBlendMode('ADD').setScale(0.04).setAlpha(0.55);
  const flash = scene.add.image(x, y, 'soft').setDepth(depth - 2).setTint(tint)
    .setBlendMode('ADD').setScale(0.12).setAlpha(0.45);
  scene.tweens.add({
    targets: ring,
    scaleX: scale,
    scaleY: scale,
    alpha: 0,
    duration: dur,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });
  scene.tweens.add({
    targets: ring2,
    scaleX: scale * 0.72,
    scaleY: scale * 0.72,
    alpha: 0,
    duration: dur * 0.85,
    ease: 'Cubic.easeOut',
    onComplete: () => ring2.destroy(),
  });
  scene.tweens.add({
    targets: flash,
    scaleX: scale * 0.35,
    scaleY: scale * 0.35,
    alpha: 0,
    duration: dur * 0.55,
    ease: 'Quad.easeOut',
    onComplete: () => flash.destroy(),
  });
}
