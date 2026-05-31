// Neon Nexus palette — teal / magenta / sky on deep space (iconic arcade neon).

export const PAL = {
  bgTop: '#0a0f1e',
  bgMid: '#0a0d1c',
  bgBot: '#05060c',

  accent: 0x2fe6c7,     // neon teal — primary UI chrome
  accent2: 0xff4fa3,    // hot magenta
  accent3: 0xffb24d,    // amber — combo / rewards (not primary chrome)
  info: 0x5aa0ff,       // sky blue

  text: '#e8eefc',
  textMuted: '#8b9bb4',
  textDark: '#05060a',
  danger: 0xff5a6e,

  powerPos: 0x2fe6c7,
  powerNeg: 0xff5a6e,
  powerWild: 0xffb24d,
  powerFire: 0xff8a5a,
  powerFrost: 0x7ec8e8,
  powerCannon: 0x8b9bb4,

  brickRows: [0x8a7bff, 0xff6f9c, 0x2fd9c7, 0xffc04d, 0x5aa0ff, 0x9ad24d, 0xff8a5a],
  silver: 0xc2cad8,
  gold: 0xffd770,
  steel: 0x8899aa,
  explosive: 0xff7a3d,
  nest: 0x9b8cff,
};

export const cssHex = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
