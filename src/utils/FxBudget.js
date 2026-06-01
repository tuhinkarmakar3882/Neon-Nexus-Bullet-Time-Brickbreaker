/** Central gate for particle counts and FX toggles — driven by Graphics quality tier. */

import { normalizeVfxQuality } from '../config/VfxQuality.js';

const TIER_RANK = { low: 0, medium: 1, high: 2, ultra: 3 };

export function fxQuality(scene) {
  return normalizeVfxQuality(scene?.settings?.vfxQuality);
}

export function fxTierRank(tier) {
  return TIER_RANK[tier] ?? 2;
}

export function fxAtLeast(scene, minTier) {
  return fxTierRank(fxQuality(scene)) >= fxTierRank(minTier);
}

export function fxParticlesOn(scene) {
  return !!scene?.settings?.particles;
}

export function fxReduced(scene) {
  return !!scene?.settings?.reducedFx;
}

export function fxMult(scene, key, fallback = 1) {
  return scene?.settings?.[key] ?? fallback;
}

export function fxCount(scene, base) {
  if (!fxParticlesOn(scene)) return 0;
  const mult = scene?.settings?.particleMult ?? 1;
  if (mult <= 0) return 0;
  return Math.max(1, Math.round(base * mult));
}

export function fxTrailMult(scene) {
  return fxMult(scene, 'trailMult', 1);
}

export function fxConfettiCount(scene, base) {
  if (!fxParticlesOn(scene)) return 0;
  const confetti = scene?.settings?.confettiMult ?? 1;
  if (confetti <= 0) return 0;
  const mult = confetti * (scene?.settings?.particleMult ?? 1);
  return Math.max(0, Math.round(base * mult));
}

export function fxShake(scene, intensity) {
  return intensity * fxMult(scene, 'shakeMult', 1);
}

export function fxGlowScale(scene, base = 1) {
  return base * fxMult(scene, 'glowMult', 1);
}

export function fxImpactScale(scene, base = 1) {
  const ring = fxMult(scene, 'ringMult', 1);
  return base * fxMult(scene, 'impactMult', 1) * ring;
}

export function fxRingScale(scene, base = 1) {
  return base * fxMult(scene, 'ringMult', 1) * fxMult(scene, 'impactMult', 1);
}

/** On-screen particle diameter in logical px (before quality tier). */
export function fxParticleSize(scene, basePx = 10) {
  return basePx * fxMult(scene, 'particleSizeMult', 0.82);
}

/** Emitter scale so particles render near `targetPx` regardless of texture bake size. */
export function fxParticleScale(scene, texKey, targetPx = 10) {
  const frame = scene?.textures?.get(texKey)?.get();
  const w = frame?.width ?? 64;
  const sizePx = fxParticleSize(scene, targetPx);
  const scale = sizePx / Math.max(4, w);
  const cap = (sizePx * 1.35) / Math.max(4, w);
  return Math.min(scale, cap);
}

export function fxBurstMax(scene) {
  return scene?.settings?.burstMax ?? 4;
}

export function fxBurstAllow(scene, used, max) {
  const cap = max ?? fxBurstMax(scene);
  if (!fxParticlesOn(scene)) return 0;
  if (used >= cap) return 0;
  return 1;
}

export function fxShakeEnabled(scene) {
  return (scene?.settings?.shakeMult ?? 0) > 0;
}

export function fxSpatialPan(scene) {
  return scene?.settings?.spatialPan === true;
}

export function fxRadialBlasts(scene) {
  return scene?.settings?.radialBlasts === true;
}

export function fxScreenPunchMult(scene) {
  return scene?.settings?.screenPunchMult ?? 1;
}

export function fxFlashMult(scene) {
  return scene?.settings?.flashMult ?? 1;
}

export function fxComboFx(scene) {
  return scene?.settings?.comboFx ?? 'full';
}

export function fxArenaDim(scene) {
  return scene?.settings?.arenaDim === true;
}

export function fxRipplesOn(scene) {
  return fxTierRank(fxQuality(scene)) >= TIER_RANK.low;
}

/** Apply camera shake scaled by graphics tier. */
export function fxCameraShake(scene, dur, intensity) {
  if (!fxShakeEnabled(scene)) return;
  const scaled = fxShake(scene, intensity);
  if (scaled <= 0.0005) return;
  scene.cameras?.main?.shake?.(dur, scaled);
}
