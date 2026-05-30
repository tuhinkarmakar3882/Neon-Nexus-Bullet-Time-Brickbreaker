import { POWERS, resolvePowerKey } from './PowerUps.js';

/** Duplicate timed pickup → fused tier when active. */
export const FUSION_CHAIN = {
  Laser: 'LaserII',
  Catch: 'SuperCatch',
  Expand: 'WideGarden',
  ElectricBall: 'ElectricBallII',
  Shield: 'ShieldII',
};

export function fusionTarget(key) {
  return FUSION_CHAIN[resolvePowerKey(key)] ?? null;
}

export function isFusionKey(key) {
  key = resolvePowerKey(key);
  return Object.values(FUSION_CHAIN).includes(key);
}

export function fusionLabel(key) {
  const def = POWERS[resolvePowerKey(key)];
  return def?.fusionLabel ?? 'II';
}
