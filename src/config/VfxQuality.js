/** VFX quality presets — one Graphics setting drives all derived FX flags. */

import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from './Constants.js';

export const VFX_LEVELS = ['low', 'medium', 'high', 'ultra'];

/** Short blurbs for the settings UI. */
export const VFX_TIER_COPY = {
  low: 'Bare minimum — gameplay only, no particles or screen FX.',
  medium: 'Okay-ish — light particles and subtle feedback.',
  high: 'Decent — full feedback, bloom, and combo flair.',
  ultra: 'Maximum — everything the GPU can handle.',
};

export const VFX_PRESETS = {
  low: {
    particles: false,
    reducedFx: true,
    particleMult: 0,
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
    trailMult: 0.25,
    confettiMult: 0,
    shakeMult: 0,
    glowMult: 0.4,
    impactMult: 0.45,
    ringMult: 0.5,
    burstMax: 0,
    radialBlasts: false,
    reactiveBloom: false,
    spatialPan: false,
    immersiveMix: false,
    ambience: false,
    screenPunchMult: 0,
    flashMult: 0,
    comboFx: false,
    arenaDim: false,
    bg: {
      nebula: 1,
      nebulaAlpha: 0.04,
      stars: false,
      motes: false,
      gridAlpha: 0.03,
      aurora: false,
      starFarFreq: 0,
      starNearFreq: 0,
      moteFreq: 0,
    },
  },
  medium: {
    particles: true,
    reducedFx: true,
    particleMult: 0.5,
    particleSizeMult: 0.72,
    bulletTime: true,
    flashText: true,
    scanlines: false,
    scanlineAlpha: 0,
    bloom: 0.38,
    vignette: 0,
    grain: 0,
    chroma: false,
    haptics: true,
    bgReduced: true,
    trailMult: 0.6,
    confettiMult: 0.4,
    shakeMult: 0.55,
    glowMult: 0.68,
    impactMult: 0.75,
    ringMult: 0.78,
    burstMax: 2,
    radialBlasts: false,
    reactiveBloom: false,
    spatialPan: false,
    immersiveMix: false,
    ambience: false,
    screenPunchMult: 0.5,
    flashMult: 0.45,
    comboFx: 'text',
    arenaDim: false,
    bg: {
      nebula: 2,
      nebulaAlpha: 0.07,
      stars: 'reduced',
      motes: false,
      gridAlpha: 0.06,
      aurora: false,
      starFarFreq: 240,
      starNearFreq: 520,
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
    bloom: 0.62,
    vignette: 0,
    grain: 0,
    chroma: true,
    haptics: true,
    bgReduced: false,
    trailMult: 1,
    confettiMult: 1,
    shakeMult: 0.9,
    glowMult: 0.88,
    impactMult: 0.92,
    ringMult: 1,
    burstMax: 4,
    radialBlasts: true,
    reactiveBloom: true,
    spatialPan: true,
    immersiveMix: true,
    ambience: true,
    screenPunchMult: 1,
    flashMult: 1,
    comboFx: 'full',
    arenaDim: true,
    bg: {
      nebula: 3,
      nebulaAlpha: 0.11,
      stars: true,
      motes: true,
      gridAlpha: 0.1,
      aurora: false,
      starFarFreq: 120,
      starNearFreq: 260,
      moteFreq: 420,
    },
  },
  ultra: {
    particles: true,
    reducedFx: false,
    particleMult: 1.65,
    particleSizeMult: 0.95,
    bulletTime: true,
    flashText: true,
    flashMinGap: 720,
    scanlines: true,
    scanlineAlpha: 0.028,
    bloom: 0.82,
    vignette: 0,
    grain: 0.035,
    chroma: true,
    haptics: true,
    bgReduced: false,
    trailMult: 1.4,
    confettiMult: 1.55,
    shakeMult: 1.15,
    glowMult: 1.18,
    impactMult: 1.12,
    ringMult: 1.22,
    burstMax: 6,
    radialBlasts: true,
    reactiveBloom: true,
    spatialPan: true,
    immersiveMix: true,
    ambience: true,
    screenPunchMult: 1.15,
    flashMult: 1.08,
    comboFx: 'full',
    arenaDim: true,
    bg: {
      nebula: 4,
      nebulaAlpha: 0.17,
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
  const key = String(q ?? 'high').toLowerCase();
  return VFX_LEVELS.includes(key) ? key : 'high';
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
    particles: preset.particles,
    shakeMult: preset.shakeMult ?? 0,
  };
}

/** Migrate legacy per-toggle saves to a single quality tier. */
export function migrateVfxQuality(raw) {
  if (raw.vfxQuality) return normalizeVfxQuality(raw.vfxQuality);
  if (raw.reducedFx === true && raw.particles === false) return 'low';
  if (raw.reducedFx === true) return 'medium';
  if (raw.scanlines === true) return 'ultra';
  return 'high';
}
