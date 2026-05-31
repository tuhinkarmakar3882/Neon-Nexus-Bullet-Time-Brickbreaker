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
