/** VFX quality presets — maps one setting to all derived FX flags. */

export const VFX_LEVELS = ['low', 'medium', 'high', 'ultra'];

export const VFX_PRESETS = {
  low: {
    particles: false,
    reducedFx: true,
    particleMult: 0.3,
    bulletTime: false,
    flashText: true,
    scanlines: false,
    bloom: 0,
    haptics: false,
    bgReduced: true,
  },
  medium: {
    particles: true,
    reducedFx: true,
    particleMult: 0.55,
    bulletTime: true,
    flashText: true,
    scanlines: false,
    bloom: 0.48,
    haptics: true,
    bgReduced: true,
  },
  high: {
    particles: true,
    reducedFx: false,
    particleMult: 1,
    bulletTime: true,
    flashText: true,
    scanlines: false,
    bloom: 0.72,
    haptics: true,
    bgReduced: false,
  },
  ultra: {
    particles: true,
    reducedFx: false,
    particleMult: 1.3,
    bulletTime: true,
    flashText: true,
    scanlines: true,
    bloom: 0.88,
    haptics: true,
    bgReduced: false,
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
    sfxVolume: raw.sfxVolume ?? 100,
    musicVolume: raw.musicVolume ?? 100,
    ...preset,
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
