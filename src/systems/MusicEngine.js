/**
 * Procedural music profiles — melody, harmony, rhythm per biome/level.
 * Consumed by AudioManager for Web Audio scheduling.
 */

export const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const SCALE_STEPS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

const BIOME = {
  garden: {
    roots: [57, 59, 60, 62],
    scale: 'major',
    bpm: 112,
    filter: 9800,
    padMix: 0.05,
    leadMix: 0.13,
    arpMix: 0.06,
    bassMix: 0.24,
    drumMix: 0.72,
    sidechain: 0.18,
    progressions: [[0, 4, 5, 3], [0, 3, 4, 0], [0, 4, 3, 5]],
    melodies: [
      [0, 2, 4, 4, 2, 4, 6, 4, 2, 4, 6, 4, 2, 0, 2, 4],
      [0, 2, 4, 6, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2],
    ],
    arp: [0, 2, 1, 2],
    kicks: [0, 4, 8, 12],
    snares: [4, 12],
  },
  nexus: {
    roots: [57, 59, 60, 62],
    scale: 'mixolydian',
    bpm: 118,
    filter: 11000,
    padMix: 0.048,
    leadMix: 0.14,
    arpMix: 0.065,
    bassMix: 0.26,
    drumMix: 0.78,
    sidechain: 0.2,
    progressions: [[0, 3, 4, 0], [0, 4, 3, 5], [0, 5, 3, 4]],
    melodies: [
      [0, 2, 4, 6, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2],
      [0, 4, 2, 4, 6, 4, 2, 0, 4, 6, 4, 2, 4, 6, 4, 2],
    ],
    arp: [0, 2, 1, 2],
    kicks: [0, 3, 6, 8, 11, 14],
    snares: [4, 12],
  },
  frost: {
    roots: [55, 57, 59, 60],
    scale: 'lydian',
    bpm: 108,
    filter: 9200,
    padMix: 0.052,
    leadMix: 0.12,
    arpMix: 0.058,
    bassMix: 0.22,
    drumMix: 0.68,
    sidechain: 0.16,
    progressions: [[0, 4, 5, 3], [0, 3, 5, 4], [0, 4, 3, 0]],
    melodies: [
      [0, 2, 4, 6, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2],
      [0, 2, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2, 4, 6],
    ],
    arp: [0, 1, 2, 1],
    kicks: [0, 6, 8, 14],
    snares: [4, 12],
  },
  ember: {
    roots: [50, 52, 53, 55],
    scale: 'mixolydian',
    bpm: 124,
    filter: 12000,
    padMix: 0.055,
    leadMix: 0.15,
    arpMix: 0.07,
    bassMix: 0.28,
    drumMix: 0.82,
    sidechain: 0.22,
    progressions: [[0, 3, 4, 0], [0, 4, 5, 3], [0, 5, 4, 3]],
    melodies: [
      [0, 2, 4, 6, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2],
      [0, 4, 6, 4, 2, 4, 6, 4, 2, 0, 4, 6, 4, 2, 4, 6],
    ],
    arp: [0, 2, 1, 2],
    kicks: [0, 2, 4, 8, 10, 14],
    snares: [4, 7, 12, 15],
  },
};

const MENU = {
  roots: [57, 60, 62],
  scale: 'lydian',
  bpm: 108,
  filter: 9600,
  padMix: 0.045,
  leadMix: 0.11,
  arpMix: 0.05,
  bassMix: 0.2,
  drumMix: 0.62,
  sidechain: 0.14,
  progressions: [[0, 4, 5, 3], [0, 3, 4, 0]],
  melodies: [[0, 2, 4, 6, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2]],
  arp: [0, 2, 1, 2],
  kicks: [0, 4, 8, 12],
  snares: [4, 12],
};

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function triad(scale, degree) {
  const len = scale.length;
  const i = ((degree % len) + len) % len;
  return [scale[i], scale[(i + 2) % len], scale[(i + 4) % len]];
}

function clampBpm(v) {
  return Math.max(96, Math.min(136, Math.round(v)));
}

/** Build a full music profile for one level or menu. */
export function buildMusicProfile(level, seed, menu = false, opts = {}) {
  const rng = mulberry32((seed ^ (menu ? 0x51ed270b : level * 0x9e3779b1)) >>> 0);
  const biomeKey = menu ? 'menu' : (opts.biome ?? 'garden');
  const cfg = menu ? MENU : (BIOME[biomeKey] ?? BIOME.garden);
  const steps = SCALE_STEPS[cfg.scale] ?? SCALE_STEPS.pentatonic;
  const root = cfg.roots[Math.floor(rng() * cfg.roots.length)];
  const scale = steps.map((s) => root + s);

  const progDeg = cfg.progressions[Math.floor(rng() * cfg.progressions.length)];
  const prog = progDeg.map((deg) => {
    const notes = triad(scale, deg).map((n) => n + 12);
    return { root: scale[((deg % scale.length) + scale.length) % scale.length], notes, degree: deg };
  });

  const melTemplate = cfg.melodies[Math.floor(rng() * cfg.melodies.length)];
  const melShift = Math.floor(rng() * 3) - 1;
  const melody = melTemplate.map((d) => Math.max(0, d + melShift));

  const boss = !!opts.isBoss && !menu;
  const bpm = clampBpm(cfg.bpm + (level % 5) + (boss ? 8 : 0) + (seed % 3));
  const intensity = menu ? 0.62 : Math.min(1, 0.58 + level * 0.01 + (boss ? 0.12 : 0));

  return {
    scale,
    prog,
    melody,
    arp: cfg.arp,
    kicks: boss ? [...cfg.kicks, 6, 14] : cfg.kicks,
    snares: cfg.snares,
    bpm,
    intensity,
    filterHz: cfg.filter,
    padMix: cfg.padMix,
    leadMix: cfg.leadMix,
    arpMix: cfg.arpMix,
    bassMix: cfg.bassMix * (boss ? 1.15 : 1),
    drumMix: cfg.drumMix * (boss ? 1.1 : 1),
    sidechain: cfg.sidechain,
    biome: biomeKey,
    menu,
    boss,
    phraseSteps: 64,
  };
}

/** Pick arp note (MIDI) for current step. */
export function arpNoteAt(profile, step, chord) {
  const idx = profile.arp[Math.floor(step / 2) % profile.arp.length];
  const note = chord.notes[idx % chord.notes.length];
  const octave = step % 8 === 0 ? 12 : 0;
  return note + octave;
}

/** Pick lead melody note (MIDI) for current step. */
export function leadNoteAt(profile, step) {
  const s = step % 16;
  if (s % 4 !== 0) return null;
  const idx = Math.floor(step / 4) % profile.melody.length;
  const deg = profile.melody[idx];
  const scale = profile.scale;
  const base = scale[deg % scale.length];
  const octave = deg >= 5 ? 24 : 12;
  return base + octave;
}

/** Bass root with occasional fifth. */
export function bassNoteAt(profile, step, chord) {
  const s = step % 16;
  if (s % 4 !== 0 && s !== 2 && s !== 10) return null;
  const fifth = profile.scale[(profile.scale.indexOf(chord.root) + 2) % profile.scale.length];
  return (s === 2 || s === 10) ? fifth : chord.root;
}
