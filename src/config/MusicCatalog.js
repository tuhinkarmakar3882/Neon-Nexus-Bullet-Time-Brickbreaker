/**
 * Pixabay ambient/chill loops — commercial use per Pixabay License.
 *
 * Add URLs to PIXABAY_URLS; optional titles live in PIXABAY_TRACK_META.
 * Level music shuffles through the full list without repeats until every
 * track has played, then starts a new shuffled cycle (seeded by campaign).
 */

import { mulberry32 } from '../utils/Helpers.js';

/** @typedef {'garden'|'nexus'|'frost'|'ember'} MusicBiome */

/** Verified Pixabay CDN loops — append new entries here. */
export const PIXABAY_URLS = [
  'https://cdn.pixabay.com/audio/2025/03/19/audio_56ae1dae5f.mp3',
  'https://cdn.pixabay.com/audio/2025/02/19/audio_3b45f7d855.mp3',
  'https://cdn.pixabay.com/audio/2025/02/18/audio_67a824edf7.mp3',
  'https://cdn.pixabay.com/audio/2024/09/09/audio_7556bb3a41.mp3',
  'https://cdn.pixabay.com/audio/2024/07/24/audio_5ec636ca14.mp3',
  'https://cdn.pixabay.com/audio/2025/03/18/audio_7d5c12b31a.mp3',
  'https://cdn.pixabay.com/audio/2024/09/16/audio_a10608d6cd.mp3',
  'https://cdn.pixabay.com/audio/2022/03/23/audio_07b2a04be3.mp3',
  'https://cdn.pixabay.com/audio/2025/12/11/audio_249561b3fc.mp3',
  'https://cdn.pixabay.com/audio/2025/09/29/audio_77a36612dd.mp3',
  'https://cdn.pixabay.com/audio/2025/06/23/audio_61f7224981.mp3',
  'https://cdn.pixabay.com/audio/2026/04/24/audio_ab21a4c2bb.mp3',
];

/**
 * Optional display metadata keyed by URL — add a row when you curate a new loop.
 * @type {Record<string, { id?: string, title?: string, menu?: boolean }>}
 */
export const PIXABAY_TRACK_META = {
  [PIXABAY_URLS[0]]: { id: 'twilight-atrium', title: 'Twilight Atrium', menu: true },
  [PIXABAY_URLS[1]]: { id: 'neon-grove', title: 'Neon Grove' },
  [PIXABAY_URLS[2]]: { id: 'circuit-pulse', title: 'Circuit Pulse' },
  [PIXABAY_URLS[3]]: { id: 'frost-lattice', title: 'Frost Lattice' },
  [PIXABAY_URLS[4]]: { id: 'ember-forge', title: 'Ember Forge' },
  [PIXABAY_URLS[5]]: { id: 'siege-overture', title: 'Siege Overture' },
  [PIXABAY_URLS[6]]: { id: 'zen-drift', title: 'Zen Drift', menu: true },
  [PIXABAY_URLS[7]]: { id: 'lofi-hollow', title: 'Lo-Fi Hollow' },
  [PIXABAY_URLS[8]]: { id: 'neon-drift', title: 'Neon Drift' },
  [PIXABAY_URLS[9]]: { id: 'pulse-horizon', title: 'Pulse Horizon' },
  [PIXABAY_URLS[10]]: { id: 'deep-current', title: 'Deep Current' },
  [PIXABAY_URLS[11]]: { id: 'aurora-bloom', title: 'Aurora Bloom' },
};

/** @deprecated use PIXABAY_URLS */
export const PIXABAY_POOL = PIXABAY_URLS;

const BIOME_VOLUME = {
  garden: 0.38,
  nexus: 0.38,
  frost: 0.38,
  ember: 0.40,
};

/** Legacy biome shortcuts — first URL per role. */
export const MUSIC_TRACKS = {
  menu: { id: 'menu', title: 'Twilight Atrium', url: PIXABAY_URLS[0], volume: 0.42, loop: true },
  garden: { id: 'garden', biome: 'garden', title: 'Neon Grove', url: PIXABAY_URLS[1] ?? PIXABAY_URLS[0], volume: 0.38, loop: true },
  nexus: { id: 'nexus', biome: 'nexus', title: 'Circuit Pulse', url: PIXABAY_URLS[2] ?? PIXABAY_URLS[0], volume: 0.38, loop: true },
  frost: { id: 'frost', biome: 'frost', title: 'Frost Lattice', url: PIXABAY_URLS[3] ?? PIXABAY_URLS[0], volume: 0.38, loop: true },
  ember: { id: 'ember', biome: 'ember', title: 'Ember Forge', url: PIXABAY_URLS[4] ?? PIXABAY_URLS[0], volume: 0.40, loop: true },
  boss: { id: 'boss', title: 'Siege Overture', url: PIXABAY_URLS[5] ?? PIXABAY_URLS[0], volume: 0.42, loop: true },
};

export function normalizeMusicVariant(_v) {
  return 'auto';
}

function activeUrls() {
  return PIXABAY_URLS.filter(Boolean);
}

function hashFromUrl(url) {
  const match = url.match(/audio_([a-f0-9]+)\.mp3/i);
  return match?.[1]?.slice(0, 8) ?? '';
}

function trackFromUrl(url, index) {
  const meta = PIXABAY_TRACK_META[url] ?? {};
  const hash = hashFromUrl(url);
  return {
    id: meta.id ?? (hash ? `pixabay-${hash}` : `track-${index + 1}`),
    title: meta.title ?? (hash ? `Pixabay ${hash}` : `Ambient ${index + 1}`),
    url,
    menu: !!meta.menu,
  };
}

/** @deprecated derived from PIXABAY_URLS + PIXABAY_TRACK_META */
export const PIXABAY_TRACKS = activeUrls().map((url, index) => trackFromUrl(url, index));

function seededShuffle(items, seed) {
  const arr = [...items];
  const rng = mulberry32(seed >>> 0);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cycleSeed(campaignSeed, cycleIndex) {
  return (campaignSeed ^ (cycleIndex * 0x9e3779b1)) >>> 0;
}

/** Shuffled URL order for one full pass through the catalog (no repeats within cycle). */
function shuffleOrderForCycle(pool, campaignSeed, cycleIndex) {
  const order = seededShuffle(pool, cycleSeed(campaignSeed, cycleIndex));
  if (cycleIndex > 0 && order.length > 1) {
    const prev = seededShuffle(pool, cycleSeed(campaignSeed, cycleIndex - 1));
    const prevLast = prev[prev.length - 1];
    if (order[0] === prevLast) {
      [order[0], order[1]] = [order[1], order[0]];
    }
  }
  return order;
}

/** Pick URL for a level — unique within each catalog cycle, reshuffled each cycle. */
export function urlForLevel(level, campaignSeed = level) {
  const pool = activeUrls();
  if (!pool.length) return '';
  const n = pool.length;
  const lv = Math.max(1, level | 0);
  const cycle = Math.floor((lv - 1) / n);
  const pos = (lv - 1) % n;
  const order = shuffleOrderForCycle(pool, campaignSeed >>> 0, cycle);
  return order[pos] ?? pool[0];
}

function trackToDef(track, opts = {}) {
  const biome = opts.biome ?? 'garden';
  return {
    id: track.id,
    title: track.title,
    url: track.url,
    volume: opts.isBoss ? 0.42 : (BIOME_VOLUME[biome] ?? 0.38),
    loop: true,
    biome,
    level: opts.level,
  };
}

/** Menu / overlay music — calm menu-tagged tracks, or first URL. */
export function menuTrackForVariant(variant = 'auto') {
  const pool = activeUrls();
  const menuUrls = pool.filter((url) => PIXABAY_TRACK_META[url]?.menu);
  const menuPool = menuUrls.length ? menuUrls : pool;
  const idx = typeof variant === 'number'
    ? variant % menuPool.length
    : Math.floor(Date.now() / 60000) % menuPool.length;
  const url = menuPool[idx] ?? menuPool[0];
  const index = pool.indexOf(url);
  return trackToDef(trackFromUrl(url, Math.max(0, index)), { biome: 'garden' });
}

/**
 * Level music — random non-repeating shuffle of PIXABAY_URLS per campaign.
 * @param {number} level
 * @param {number} [campaignSeed] run seed (campaignSeed from GameScene)
 */
export function trackForLevel(level, campaignSeed = level, opts = {}) {
  const lv = Math.max(1, level | 0);
  const url = urlForLevel(lv, campaignSeed);
  const index = Math.max(0, activeUrls().indexOf(url));
  const track = trackFromUrl(url, index);
  return trackToDef(track, { biome: opts.biome ?? 'garden', level: lv, isBoss: opts.isBoss });
}

/** @deprecated use trackForLevel */
export function trackForBiome(biome, opts = {}) {
  return trackForLevel(1, 1, { biome, isBoss: opts.isBoss });
}

export function allTrackUrls() {
  return [...new Set(activeUrls())];
}

/** Alternate Pixabay URLs when primary track fails to load/play. */
export function pixabayAlternates(primaryUrl) {
  return allTrackUrls().filter((u) => u !== primaryUrl);
}

export function musicCatalogSummary() {
  return activeUrls().map((url, index) => {
    const track = trackFromUrl(url, index);
    return {
      id: track.id,
      title: track.title,
      menu: !!track.menu,
      url,
    };
  });
}

export const MUSIC_CREDITS = 'Background music from Pixabay contributors (ambient & chill loops).';
