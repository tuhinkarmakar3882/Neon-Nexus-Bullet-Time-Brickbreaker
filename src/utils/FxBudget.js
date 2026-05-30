/** Central gate for particle counts and FX toggles. */

export function fxParticlesOn(scene) {
  return !!scene?.settings?.particles;
}

export function fxReduced(scene) {
  return !!scene?.settings?.reducedFx;
}

export function fxCount(scene, base) {
  if (!fxParticlesOn(scene)) return 0;
  const mult = scene?.settings?.particleMult ?? 1;
  return Math.max(1, Math.round(base * mult));
}
