// Twilight Garden palette — warm dusk tones, moss & terracotta accents (Jardinains theme).

export const PAL = {
  bgTop: '#1a0f24',
  bgMid: '#120818',
  bgBot: '#08050c',

  accent: 0xe8b86d,     // golden lantern
  accent2: 0xd45d8c,    // rose bloom
  accent3: 0x7eb87a,    // sage / moss
  info: 0x9b8cff,       // twilight violet

  text: '#f5ebe0',
  textMuted: '#a898b0',
  textDark: '#1a0f12',
  danger: 0xff6b7a,

  powerPos: 0x7eb87a,
  powerNeg: 0xff6b7a,
  powerWild: 0xe8b86d,
  powerFire: 0xff8a5a,
  powerFrost: 0x7ec8e8,
  powerCannon: 0xc9b8a8,

  brickRows: [0xc4785a, 0x7eb87a, 0x9b8cff, 0xe8b86d, 0xd45d8c, 0x6aab8a, 0xb8886a],
  silver: 0xc9c0b8,
  gold: 0xf0c878,
  steel: 0x8899aa,
  explosive: 0xff7040,
  nest: 0x8b7fd4,
};

export const cssHex = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
