/**
 * @deprecated Unused — Pixabay loops + AudioManager filter/intensity/sidechain are used instead.
 * Kept for reference if adaptive MusicEngine layers are wired in a future milestone.
 * Procedural music profiles — upbeat major/lydian arcade feel per biome.
 */

export const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const SCALE_STEPS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
};

/** Upbeat I–V–vi–IV / I–IV–V–I style progressions only. */
const BIOME = {
  garden: {
    roots: [60, 62, 64, 57],
    scale: 'major',
    bpm: 124,
    filter: 11200,
    padMix: 0.048,
    leadMix: 0.14,
    arpMix: 0.068,
    bassMix: 0.26,
    drumMix: 0.78,
    sidechain: 0.2,
    progressions: [[0, 4, 5, 3], [0, 4, 3, 0], [0, 3, 4, 0]],
    melodies: [
      [0, 2, 4, 6, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2],
      [0, 4, 2, 4, 6, 4, 2, 0, 4, 6, 4, 2, 4, 6, 4, 2],
    ],
    arp: [0, 2, 1, 2],
    kicks: [0, 4, 8, 12],
    snares: [4, 12],
  },
  nexus: {
    roots: [60, 62, 64],
    scale: 'lydian',
    bpm: 128,
    filter: 11800,
    padMix: 0.046,
    leadMix: 0.15,
    arpMix: 0.072,
    bassMix: 0.28,
    drumMix: 0.82,
    sidechain: 0.22,
    progressions: [[0, 4, 5, 3], [0, 3, 4, 0], [0, 4, 3, 5]],
    melodies: [
      [0, 2, 4, 6, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2],
      [0, 4, 6, 4, 2, 4, 6, 4, 2, 0, 4, 6, 4, 2, 4, 6],
    ],
    arp: [0, 2, 1, 2],
    kicks: [0, 3, 6, 8, 11, 14],
    snares: [4, 12],
  },
  frost: {
    roots: [59, 60, 62],
    scale: 'lydian',
    bpm: 122,
    filter: 10800,
    padMix: 0.05,
    leadMix: 0.13,
    arpMix: 0.065,
    bassMix: 0.24,
    drumMix: 0.74,
    sidechain: 0.18,
    progressions: [[0, 4, 5, 3], [0, 3, 4, 0], [0, 4, 3, 0]],
    melodies: [
      [0, 2, 4, 6, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2],
      [0, 2, 4, 2, 4, 6, 4, 2, 0, 2, 4, 6, 4, 2, 4, 6],
    ],
    arp: [0, 2, 1, 2],
    kicks: [0, 6, 8, 14],
    snares: [4, 12],
  },
  ember: {
    roots: [55, 57, 59],
    scale: 'major',
    bpm: 132,
    filter: 12400,
    padMix: 0.052,
    leadMix: 0.16,
    arpMix: 0.075,
    bassMix: 0.3,
    drumMix: 0.85,
    sidechain: 0.24,
    progressions: [[0, 4, 5, 3], [0, 3, 4, 0], [0, 4, 3, 5]],
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
  roots: [60, 62, 64],
  scale: 'lydian',
  bpm: 120,
  filter: 11000,
  padMix: 0.042,
  leadMix: 0.12,
  arpMix: 0.055,
  bassMix: 0.22,
  drumMix: 0.68,
  sidechain: 0.16,
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
  return Math.max(118, Math.min(140, Math.round(v)));
}

/** Build a full music profile for one level or menu. */
export function buildMusicProfile(level, seed, menu = false, opts = {}) {
  const rng = mulberry32((seed ^ (menu ? 0x51ed270b : level * 0x9e3779b1)) >>> 0);
  const biomeKey = menu ? 'menu' : (opts.biome ?? 'garden');
  const cfg = menu ? MENU : (BIOME[biomeKey] ?? BIOME.garden);
  const steps = SCALE_STEPS[cfg.scale] ?? SCALE_STEPS.major;
  const root = cfg.roots[Math.floor(rng() * cfg.roots.length)];
  const scale = steps.map((s) => root + s);

  const progDeg = cfg.progressions[Math.floor(rng() * cfg.progressions.length)];
  const prog = progDeg.map((deg) => {
    const notes = triad(scale, deg).map((n) => n + 12);
    return { root: scale[((deg % scale.length) + scale.length) % scale.length], notes, degree: deg };
  });

  const melTemplate = cfg.melodies[Math.floor(rng() * cfg.melodies.length)];
  const melShift = Math.floor(rng() * 2);
  const melody = melTemplate.map((d) => Math.max(0, d + melShift));

  const boss = !!opts.isBoss && !menu;
  const fallback = !!opts.fallback;
  const bpm = clampBpm((fallback ? cfg.bpm * 0.82 : cfg.bpm) + (level % 4) + (boss ? 6 : 0));
  const intensity = menu ? 0.68 : Math.min(1, 0.62 + level * 0.008 + (boss ? 0.12 : 0));
  const drumScale = fallback ? 0.42 : 1;
  const padScale = fallback ? 1.55 : 1;
  const leadScale = fallback ? 0.55 : 1;

  return {
    scale,
    prog,
    melody,
    arp: cfg.arp,
    kicks: boss ? [...cfg.kicks, 6, 14] : (fallback ? [0, 8] : cfg.kicks),
    snares: fallback ? [4, 12] : cfg.snares,
    bpm,
    intensity,
    filterHz: fallback ? cfg.filter * 0.92 : cfg.filter,
    padMix: cfg.padMix * padScale,
    leadMix: cfg.leadMix * leadScale,
    arpMix: cfg.arpMix * (fallback ? 0.85 : 1),
    bassMix: cfg.bassMix * (boss ? 1.12 : 1) * (fallback ? 0.75 : 1),
    drumMix: cfg.drumMix * (boss ? 1.08 : 1) * drumScale,
    sidechain: cfg.sidechain * (fallback ? 0.55 : 1),
    useSoftLead: fallback,
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
