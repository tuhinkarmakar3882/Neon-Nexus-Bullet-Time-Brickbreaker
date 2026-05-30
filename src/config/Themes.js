// Per-level garden biomes — warm twilight palettes for bricks, walls, and sky glow.

export const THEMES = [
  { name: 'Dusk Garden',   bg: 0xe8b86d, wall: 0xd45d8c, bricks: [0xc4785a, 0xd45d8c, 0xe8b86d, 0x9b8cff, 0x7eb87a, 0xb8886a], biome: 'garden' },
  { name: 'Moss Hollow',   bg: 0x7eb87a, wall: 0x5a9870, bricks: [0x6aab8a, 0x7eb87a, 0x4a8868, 0x8ec890, 0x5a9870, 0xa0c898], biome: 'garden' },
  { name: 'Terracotta',    bg: 0xc4785a, wall: 0xe8b86d, bricks: [0xc4785a, 0xd4886a, 0xb86850, 0xe8a878, 0xa85848, 0xf0b888], biome: 'garden' },
  { name: 'Lavender Dusk', bg: 0x9b8cff, wall: 0xd45d8c, bricks: [0x9b8cff, 0xb8a0e8, 0x8878c8, 0xc8b0f0, 0x7868b8, 0xd8c8ff], biome: 'garden' },
  { name: 'Rose Arbor',    bg: 0xd45d8c, wall: 0xe8b86d, bricks: [0xd45d8c, 0xe878a8, 0xc04878, 0xf0a0c0, 0xb83868, 0xffb0c8], biome: 'garden' },
  { name: 'Moonlit Pond',  bg: 0x7ec8e8, wall: 0x9b8cff, bricks: [0x7ec8e8, 0x9b8cff, 0x68a8c8, 0xa8d8f0, 0x5888a8, 0xb8e0ff], biome: 'garden' },
  { name: 'Autumn Shed',   bg: 0xff9040, wall: 0xc4785a, bricks: [0xff9040, 0xc4785a, 0xe8b86d, 0xd48850, 0xffa860, 0xb86840], biome: 'garden' },
  { name: 'Night Bloom',   bg: 0x684878, wall: 0xd45d8c, bricks: [0x684878, 0x9b8cff, 0xd45d8c, 0x887098, 0xc878a8, 0x584068], biome: 'garden' },
  { name: 'Herb Patch',    bg: 0x8ec890, wall: 0x7eb87a, bricks: [0x8ec890, 0x7eb87a, 0x6aab8a, 0xa0d8a8, 0x5a9870, 0xb8e8b8], biome: 'garden' },
  { name: 'Golden Hour',   bg: 0xf0c878, wall: 0xe8b86d, bricks: [0xf0c878, 0xe8b86d, 0xd48850, 0xffd898, 0xc4785a, 0xffe8a8], biome: 'garden' },
  // Nexus biome (levels 11–20 band)
  { name: 'Neon Nexus',    bg: 0x4488ff, wall: 0x9b8cff, bricks: [0x3366cc, 0x5599ff, 0x2244aa, 0x88aaff, 0x113388, 0x6699ee], biome: 'nexus' },
  { name: 'Circuit Grove', bg: 0x00ccaa, wall: 0x4488ff, bricks: [0x00aa88, 0x00ddbb, 0x008866, 0x44ffcc, 0x006655, 0x88ffee], biome: 'nexus' },
  // Frost biome (levels 21–30 band)
  { name: 'Frost Garden',  bg: 0xa8d8f0, wall: 0x6699cc, bricks: [0xc8e8ff, 0x88bbdd, 0xaaccff, 0x6699bb, 0xd8f0ff, 0x5588aa], biome: 'frost' },
  { name: 'Ice Arbor',     bg: 0x88ccee, wall: 0xaaddff, bricks: [0x99ddff, 0x77bbee, 0xbbeeff, 0x5599cc, 0xccffff, 0x4488bb], biome: 'frost' },
  // Ember biome (31+)
  { name: 'Ember Shed',    bg: 0xff6622, wall: 0xffaa44, bricks: [0xff8844, 0xff4400, 0xffaa66, 0xcc4400, 0xffcc88, 0xaa3300], biome: 'ember' },
];

export function biomeForLevel(level) {
  if (level <= 10) return 'garden';
  if (level <= 20) return 'nexus';
  if (level <= 30) return 'frost';
  return 'ember';
}

export function themeFor(level) {
  return THEMES[(level - 1) % THEMES.length];
}

/** Seeded theme pick — prefers biome-appropriate palette every 10 levels. */
export function themeForLevel(level, seed = 0) {
  const biome = biomeForLevel(level);
  const pool = THEMES.filter((t) => t.biome === biome);
  const themes = pool.length ? pool : THEMES;
  let s = (seed ^ level * 0x9e3779b9) >>> 0;
  s = (s + 0x6d2b79f5) | 0;
  const idx = ((level - 1) + (s >>> 16) % themes.length) % themes.length;
  const theme = { ...themes[idx], bricks: [...themes[idx].bricks] };
  if ((s & 0xff) > 140) {
    for (let i = theme.bricks.length - 1; i > 0; i--) {
      const j = ((s = Math.imul(s ^ i, 0x85ebca6b)) >>> 0) % (i + 1);
      [theme.bricks[i], theme.bricks[j]] = [theme.bricks[j], theme.bricks[i]];
    }
  }
  return theme;
}
