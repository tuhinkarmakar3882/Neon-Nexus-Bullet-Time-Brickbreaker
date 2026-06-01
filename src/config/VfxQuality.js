/** VFX quality presets — maps one setting to all derived FX flags. */

import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from './Constants.js';

export const VFX_LEVELS = ['low', 'medium', 'high', 'ultra'];

export const VFX_PRESETS = {
  low: {
    particles: false,
    reducedFx: true,
    particleMult: 0.2,
    particleSizeMult: 0.62,
    bulletTime: false,
    flashText: true,
    scanlines: false,
    scanlineAlpha: 0,
    bloom: 0,
    vignette: 0,
    grain: 0,
    chroma: false,
    haptics: false,
    bgReduced: true,
    trailMult: 0.3,
    confettiMult: 0.2,
    shakeMult: 0.35,
    glowMult: 0.45,
    impactMult: 0.5,
    bg: {
      nebula: 1,
      nebulaAlpha: 0.05,
      stars: false,
      motes: false,
      gridAlpha: 0.035,
      aurora: false,
      starFarFreq: 0,
      starNearFreq: 0,
      moteFreq: 0,
    },
  },
  medium: {
    particles: true,
    reducedFx: true,
    particleMult: 0.55,
    particleSizeMult: 0.74,
    bulletTime: true,
    flashText: true,
    scanlines: false,
    scanlineAlpha: 0,
    bloom: 0.42,
    vignette: 0,
    grain: 0,
    chroma: false,
    haptics: true,
    bgReduced: true,
    trailMult: 0.65,
    confettiMult: 0.55,
    shakeMult: 0.7,
    glowMult: 0.72,
    impactMult: 0.88,
    bg: {
      nebula: 2,
      nebulaAlpha: 0.08,
      stars: 'reduced',
      motes: false,
      gridAlpha: 0.07,
      aurora: false,
      starFarFreq: 220,
      starNearFreq: 480,
      moteFreq: 0,
    },
  },
  high: {
    particles: true,
    reducedFx: false,
    particleMult: 1,
    particleSizeMult: 0.86,
    bulletTime: true,
    flashText: true,
    scanlines: false,
    scanlineAlpha: 0,
    bloom: 0.66,
    vignette: 0,
    grain: 0,
    chroma: true,
    haptics: true,
    bgReduced: false,
    trailMult: 1,
    confettiMult: 1,
    shakeMult: 1,
    glowMult: 1,
    impactMult: 1,
    bg: {
      nebula: 3,
      nebulaAlpha: 0.12,
      stars: true,
      motes: true,
      gridAlpha: 0.11,
      aurora: false,
      starFarFreq: 120,
      starNearFreq: 260,
      moteFreq: 420,
    },
  },
  ultra: {
    particles: true,
    reducedFx: false,
    particleMult: 1.5,
    particleSizeMult: 0.92,
    bulletTime: true,
    flashText: true,
    flashMinGap: 720,
    scanlines: true,
    scanlineAlpha: 0.028,
    bloom: 0.78,
    vignette: 0,
    grain: 0.03,
    chroma: true,
    haptics: true,
    bgReduced: false,
    trailMult: 1.35,
    confettiMult: 1.4,
    shakeMult: 1.15,
    glowMult: 1.25,
    impactMult: 1.08,
    bg: {
      nebula: 4,
      nebulaAlpha: 0.16,
      stars: true,
      motes: true,
      gridAlpha: 0.15,
      aurora: true,
      starFarFreq: 90,
      starNearFreq: 200,
      moteFreq: 320,
    },
  },
};

export function normalizeVfxQuality(q) {
  const key = String(q ?? 'ultra').toLowerCase();
  return VFX_LEVELS.includes(key) ? key : 'ultra';
}

/** Expand stored settings into runtime flags used by GameScene / MenuScene. */
export function resolveSettings(raw = {}) {
  const sound = raw.sound !== false;
  const music = raw.music !== false;
  const vfxQuality = normalizeVfxQuality(raw.vfxQuality);
  const preset = VFX_PRESETS[vfxQuality];
  return {
    sound,
    music,
    vfxQuality,
    sfxVolume: raw.sfxVolume ?? DEFAULT_SFX_VOLUME,
    musicVolume: raw.musicVolume ?? DEFAULT_MUSIC_VOLUME,
    ...preset,
  };
}

/** Migrate legacy per-toggle saves to a single quality tier. */
export function migrateVfxQuality(raw) {
  if (raw.vfxQuality) return normalizeVfxQuality(raw.vfxQuality);
  if (raw.reducedFx === true && raw.particles === false) return 'low';
  if (raw.reducedFx === true) return 'medium';
  if (raw.scanlines === true) return 'ultra';
  return 'ultra';
}
