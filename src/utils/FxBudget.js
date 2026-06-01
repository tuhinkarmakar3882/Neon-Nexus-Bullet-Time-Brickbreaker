/** Central gate for particle counts and FX toggles. */

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
  return Math.max(1, Math.round(base * mult));
}

export function fxTrailMult(scene) {
  return fxMult(scene, 'trailMult', 1);
}

export function fxConfettiCount(scene, base) {
  if (!fxParticlesOn(scene)) return 0;
  const mult = (scene?.settings?.confettiMult ?? 1) * (scene?.settings?.particleMult ?? 1);
  return Math.max(0, Math.round(base * mult));
}

export function fxShake(scene, intensity) {
  return intensity * fxMult(scene, 'shakeMult', 1);
}

export function fxGlowScale(scene, base = 1) {
  return base * fxMult(scene, 'glowMult', 1);
}

export function fxImpactScale(scene, base = 1) {
  return base * fxMult(scene, 'impactMult', 1);
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
