/**
 * Pixabay ambient/chill loops — commercial use per Pixabay License.
 * Host copies in public/audio/ for offline PWA cache (optional).
 */

/** Curated Pixabay loop URLs (instrumental chill / electronic). */
export const PIXABAY_URLS = [
  'https://cdn.pixabay.com/audio/2025/03/19/audio_56ae1dae5f.mp3',
  'https://cdn.pixabay.com/audio/2025/02/19/audio_3b45f7d855.mp3',
  'https://cdn.pixabay.com/audio/2025/02/18/audio_67a824edf7.mp3',
  'https://cdn.pixabay.com/audio/2024/09/09/audio_7556bb3a41.mp3',
  'https://cdn.pixabay.com/audio/2024/07/24/audio_5ec636ca14.mp3',
  'https://cdn.pixabay.com/audio/2025/03/18/audio_7d5c12b31a.mp3',
  'https://cdn.pixabay.com/audio/2024/09/16/audio_a10608d6cd.mp3',
  'https://cdn.pixabay.com/audio/2022/03/23/audio_07b2a04be3.mp3',
];

/** Tagged catalog — rotates by level, biome, and boss flag. */
export const PIXABAY_TRACKS = [
  { id: 'menu-prism', url: PIXABAY_URLS[0], energy: 0.45, menu: true, biomes: ['garden', 'nexus'] },
  { id: 'garden-glow', url: PIXABAY_URLS[1], energy: 0.62, biomes: ['garden', 'nexus'] },
  { id: 'nexus-grid', url: PIXABAY_URLS[2], energy: 0.72, biomes: ['nexus', 'garden'] },
  { id: 'frost-haze', url: PIXABAY_URLS[3], energy: 0.38, biomes: ['frost', 'garden'] },
  { id: 'ember-drive', url: PIXABAY_URLS[4], energy: 0.78, biomes: ['ember', 'nexus'] },
  { id: 'boss-surge', url: PIXABAY_URLS[5], energy: 0.88, boss: true, biomes: ['nexus', 'ember'] },
  { id: 'zen-drift', url: PIXABAY_URLS[6], energy: 0.32, biomes: ['garden', 'frost'] },
  { id: 'neon-drift', url: PIXABAY_URLS[7], energy: 0.55, biomes: ['nexus', 'garden'] },
  { id: 'lofi-bed', url: PIXABAY_URLS[8], energy: 0.42, biomes: ['garden', 'frost'] },
  { id: 'garden-bloom', url: PIXABAY_URLS[1], energy: 0.48, biomes: ['garden'] },
  { id: 'nexus-pulse', url: PIXABAY_URLS[2], energy: 0.68, biomes: ['nexus'] },
  { id: 'frost-mist', url: PIXABAY_URLS[3], energy: 0.35, biomes: ['frost'] },
  { id: 'ember-heat', url: PIXABAY_URLS[4], energy: 0.74, biomes: ['ember'] },
  { id: 'boss-core', url: PIXABAY_URLS[5], energy: 0.82, boss: true, biomes: ['ember', 'nexus'] },
  { id: 'calm-pads', url: PIXABAY_URLS[6], energy: 0.30, biomes: ['garden', 'frost'] },
  { id: 'circuit-grove', url: PIXABAY_URLS[7], energy: 0.58, biomes: ['nexus', 'ember'] },
  { id: 'moss-hollow', url: PIXABAY_URLS[8], energy: 0.40, biomes: ['garden'] },
  { id: 'deep-nexus', url: PIXABAY_URLS[0], energy: 0.65, biomes: ['nexus'] },
  { id: 'ice-lattice', url: PIXABAY_URLS[3], energy: 0.44, biomes: ['frost', 'nexus'] },
  { id: 'forge-line', url: PIXABAY_URLS[4], energy: 0.70, biomes: ['ember', 'nexus'] },
  { id: 'starlit-menu', url: PIXABAY_URLS[7], energy: 0.46, menu: true, biomes: ['nexus', 'garden'] },
  { id: 'aurora-bed', url: PIXABAY_URLS[6], energy: 0.36, biomes: ['frost', 'garden'] },
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

export function normalizeMusicVariant(_v) {
  return 'auto';
}

function pickPool(opts = {}) {
  let pool = PIXABAY_TRACKS;
  const biome = opts.biome ?? 'garden';

  if (opts.isBoss) {
    const bossPool = pool.filter((t) => t.boss || t.energy >= 0.72);
    if (bossPool.length) pool = bossPool;
  } else {
    const biomePool = pool.filter((t) => !t.boss && (!t.biomes || t.biomes.includes(biome)));
    if (biomePool.length) pool = biomePool;
  }

  return pool.length ? pool : PIXABAY_TRACKS;
}

/** Menu / overlay music — calm track from catalog. */
export function menuTrackForVariant(_variant = 'auto') {
  const menuFirst = PIXABAY_TRACKS.find((t) => t.menu) ?? PIXABAY_TRACKS[0];
  return {
    id: 'menu-auto',
    url: menuFirst.url,
    volume: 0.42,
    loop: true,
  };
}

/**
 * Pick a Pixabay ambient loop for this level — rotates through the catalog
 * deterministically from level + seed + biome.
 */
export function trackForLevel(level, seed = level, opts = {}) {
  const biome = opts.biome ?? 'garden';
  const lv = Math.max(1, level | 0);
  const s = (seed >>> 0) ^ (lv * 0x9e3779b1);
  const pool = pickPool({ biome, isBoss: opts.isBoss });

  const biomeOff = { garden: 0, nexus: 1, frost: 2, ember: 3 }[biome] ?? 0;
  const idx = (lv + biomeOff + (s & 0xffff)) % pool.length;
  const track = pool[idx];

  return {
    id: `L${lv}-${biome}`,
    url: track.url,
    volume: opts.isBoss ? 0.42 : (BIOME_VOLUME[biome] ?? 0.38),
    loop: true,
    biome,
    level: lv,
  };
}

/** @deprecated use trackForLevel */
export function trackForBiome(biome, opts = {}) {
  return trackForLevel(1, 1, { biome, isBoss: opts.isBoss });
}

export function allTrackUrls() {
  return [...new Set(PIXABAY_TRACKS.map((t) => t.url))];
}

/** Alternate Pixabay URLs when primary track fails to load/play. */
export function pixabayAlternates(primaryUrl) {
  const all = allTrackUrls();
  return all.filter((u) => u !== primaryUrl);
}

export const MUSIC_CREDITS = 'Background music from Pixabay contributors.';
