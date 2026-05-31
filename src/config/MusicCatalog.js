/**
 * Pixabay ambient/chill loops — commercial use per Pixabay License.
 * Host copies in public/audio/ for offline PWA cache (optional).
 */

export const MUSIC_VARIANTS = ['auto', 'neon', 'chill', 'pulse', 'zen', 'retro'];

export const MUSIC_VARIANT_LABELS = {
  auto: 'AUTO',
  neon: 'NEON',
  chill: 'CHILL',
  pulse: 'PULSE',
  zen: 'ZEN',
  retro: 'RETRO',
};

export const MUSIC_VARIANT_HINTS = {
  auto: 'Rotates all tracks by level & biome',
  neon: 'Synth-forward electronic loops',
  chill: 'Laid-back ambient beds',
  pulse: 'Higher-energy boss & action',
  zen: 'Minimal calm pads',
  retro: '80s-style synth vibes',
};

/** Curated Pixabay loop URLs (instrumental chill / electronic). */
export const PIXABAY_URLS = [
  'https://cdn.pixabay.com/audio/2025/03/19/audio_56ae1dae5f.mp3',
  'https://cdn.pixabay.com/audio/2025/02/19/audio_3b45f7d855.mp3',
  'https://cdn.pixabay.com/audio/2025/02/18/audio_67a824edf7.mp3',
  'https://cdn.pixabay.com/audio/2024/09/09/audio_7556bb3a41.mp3',
  'https://cdn.pixabay.com/audio/2024/07/24/audio_5ec636ca14.mp3',
  'https://cdn.pixabay.com/audio/2025/03/18/audio_7d5c12b31a.mp3',
  'https://cdn.pixabay.com/audio/2024/09/16/audio_a10608d6cd.mp3',
];

/** Tagged catalog — each entry can appear in multiple style pools. */
export const PIXABAY_TRACKS = [
  { id: 'menu-prism', url: PIXABAY_URLS[0], variants: ['auto', 'neon', 'chill'], energy: 0.45, menu: true, biomes: ['garden', 'nexus'] },
  { id: 'garden-glow', url: PIXABAY_URLS[1], variants: ['auto', 'neon', 'retro'], energy: 0.62, biomes: ['garden', 'nexus'] },
  { id: 'nexus-grid', url: PIXABAY_URLS[2], variants: ['auto', 'neon', 'pulse'], energy: 0.72, biomes: ['nexus', 'garden'] },
  { id: 'frost-haze', url: PIXABAY_URLS[3], variants: ['auto', 'chill', 'zen'], energy: 0.38, biomes: ['frost', 'garden'] },
  { id: 'ember-drive', url: PIXABAY_URLS[4], variants: ['auto', 'pulse', 'retro'], energy: 0.78, biomes: ['ember', 'nexus'] },
  { id: 'boss-surge', url: PIXABAY_URLS[5], variants: ['auto', 'pulse', 'neon'], energy: 0.88, boss: true, biomes: ['nexus', 'ember'] },
  { id: 'zen-drift', url: PIXABAY_URLS[6], variants: ['auto', 'zen', 'chill'], energy: 0.32, biomes: ['garden', 'frost'] },
  { id: 'retro-arcade', url: PIXABAY_URLS[1], variants: ['retro'], energy: 0.58, biomes: ['nexus', 'ember'] },
  { id: 'neon-rush', url: PIXABAY_URLS[2], variants: ['neon', 'pulse'], energy: 0.75, biomes: ['nexus'] },
  { id: 'chill-mist', url: PIXABAY_URLS[3], variants: ['chill', 'zen'], energy: 0.35, biomes: ['frost', 'garden'] },
  { id: 'pulse-core', url: PIXABAY_URLS[5], variants: ['pulse'], energy: 0.85, boss: true },
  { id: 'zen-bloom', url: PIXABAY_URLS[6], variants: ['zen'], energy: 0.28, biomes: ['garden'] },
];

/** @deprecated use PIXABAY_URLS */
export const PIXABAY_POOL = PIXABAY_URLS;

export const MUSIC_TRACKS = {
  menu: {
    id: 'menu',
    url: PIXABAY_URLS[0],
    volume: 0.42,
    loop: true,
  },
  garden: { id: 'garden', biome: 'garden', url: PIXABAY_URLS[1], volume: 0.38, loop: true },
  nexus: { id: 'nexus', biome: 'nexus', url: PIXABAY_URLS[2], volume: 0.38, loop: true },
  frost: { id: 'frost', biome: 'frost', url: PIXABAY_URLS[3], volume: 0.38, loop: true },
  ember: { id: 'ember', biome: 'ember', url: PIXABAY_URLS[4], volume: 0.40, loop: true },
  boss: { id: 'boss', url: PIXABAY_URLS[5], volume: 0.42, loop: true },
};

const BIOME_VOLUME = {
  garden: 0.38,
  nexus: 0.38,
  frost: 0.38,
  ember: 0.40,
};

export function normalizeMusicVariant(v) {
  const key = String(v ?? 'auto').toLowerCase();
  return MUSIC_VARIANTS.includes(key) ? key : 'auto';
}

function tracksForVariant(variant = 'auto') {
  const v = normalizeMusicVariant(variant);
  if (v === 'auto') return PIXABAY_TRACKS;
  return PIXABAY_TRACKS.filter((t) => t.variants.includes(v));
}

function pickPool(variant, opts = {}) {
  let pool = tracksForVariant(variant);
  const biome = opts.biome ?? 'garden';

  if (opts.isBoss) {
    const bossPool = pool.filter((t) => t.boss || t.energy >= 0.72);
    if (bossPool.length) pool = bossPool;
  } else {
    const biomePool = pool.filter((t) => !t.boss && (!t.biomes || t.biomes.includes(biome)));
    if (biomePool.length) pool = biomePool;
  }

  if (variant === 'zen' || variant === 'chill') {
    const calm = pool.filter((t) => t.energy <= 0.55);
    if (calm.length) pool = calm;
  } else if (variant === 'pulse') {
    const hot = pool.filter((t) => t.energy >= 0.65);
    if (hot.length) pool = hot;
  }

  return pool.length ? pool : tracksForVariant('auto');
}

/** Menu / overlay music for the selected style. */
export function menuTrackForVariant(variant = 'auto') {
  const pool = tracksForVariant(variant);
  const menuFirst = pool.find((t) => t.menu) ?? pool[0];
  return {
    id: `menu-${normalizeMusicVariant(variant)}`,
    url: menuFirst.url,
    volume: 0.42,
    loop: true,
  };
}

/**
 * Pick a Pixabay ambient loop for this level — rotates through the style pool
 * deterministically from level + seed + biome.
 */
export function trackForLevel(level, seed = level, opts = {}) {
  const biome = opts.biome ?? 'garden';
  const lv = Math.max(1, level | 0);
  const s = (seed >>> 0) ^ (lv * 0x9e3779b1);
  const variant = normalizeMusicVariant(opts.musicVariant ?? 'auto');
  const pool = pickPool(variant, { biome, isBoss: opts.isBoss });

  const biomeOff = { garden: 0, nexus: 1, frost: 2, ember: 3 }[biome] ?? 0;
  const idx = (lv + biomeOff + (s & 0xffff)) % pool.length;
  const track = pool[idx];

  return {
    id: `L${lv}-${biome}-${variant}`,
    url: track.url,
    volume: opts.isBoss ? 0.42 : (BIOME_VOLUME[biome] ?? 0.38),
    loop: true,
    biome,
    level: lv,
    variant,
  };
}

/** @deprecated use trackForLevel */
export function trackForBiome(biome, opts = {}) {
  return trackForLevel(1, 1, { biome, isBoss: opts.isBoss, musicVariant: opts.musicVariant });
}

export function allTrackUrls() {
  return [...new Set(PIXABAY_TRACKS.map((t) => t.url))];
}

/** Alternate Pixabay URLs when primary track fails to load/play. */
export function pixabayAlternates(primaryUrl, variant = 'auto') {
  const pool = tracksForVariant(variant).map((t) => t.url);
  const all = pool.length ? pool : allTrackUrls();
  return all.filter((u) => u !== primaryUrl);
}

export const MUSIC_CREDITS = 'Background music from Pixabay contributors.';
