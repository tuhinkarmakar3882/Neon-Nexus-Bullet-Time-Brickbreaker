// Cohesive, restrained palette. Premium arcade look: deep desaturated space
// background, a few confident accents, tasteful brick hues (not pure RGB neon).

export const PAL = {
  bgTop: '#0a0f1e',
  bgMid: '#0a0d1c',
  bgBot: '#05060c',

  accent: 0x2fe6c7,     // teal
  accent2: 0xff4fa3,    // rose
  accent3: 0xffb24d,    // amber
  info: 0x5aa0ff,       // sky

  text: '#e8eefc',
  textMuted: '#8b9bb4',
  danger: 0xff5a6e,

  // Tasteful brick row hues
  brickRows: [0x8a7bff, 0xff6f9c, 0x2fd9c7, 0xffc04d, 0x5aa0ff, 0x9ad24d, 0xff8a5a],
  silver: 0xc2cad8,
  gold: 0xffd770,
  explosive: 0xff7a3d,
  nest: 0x9b8cff,
};

export const cssHex = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
