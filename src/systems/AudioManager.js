// Procedural neon synthwave audio — Web Audio API, no external assets.
// Dual-bus mix (music + SFX) with sidechain ducking, per-level generation,
// and crisp arcade one-shots tuned for brick-breaker feedback.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const SCALE_TYPES = ['minor', 'dorian', 'phrygian', 'pentatonic'];
const SCALE_STEPS = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  pentatonic: [0, 3, 5, 7, 10],
};

const ROOT_POOL = [33, 36, 38, 41, 43, 45, 28, 31];

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

function clampBpm(v) {
  return Math.max(82, Math.min(132, Math.round(v)));
}

function triadFromScale(scale, degree) {
  const len = scale.length;
  const i = ((degree % len) + len) % len;
  const j = (i + 2) % len;
  const k = (i + 4) % len;
  return [scale[i], scale[j], scale[k]];
}

function buildProfile(level, seed, menu = false) {
  const rng = mulberry32((seed ^ (menu ? 0x51ed270b : level * 0x9e3779b1)) >>> 0);
  const scaleType = SCALE_TYPES[Math.floor(rng() * SCALE_TYPES.length)];
  const steps = SCALE_STEPS[scaleType];
  const root = ROOT_POOL[Math.floor(rng() * ROOT_POOL.length)];
  const scale = steps.map((s) => root + s);
  const progDegrees = menu
    ? [0, 5, 3, 4]
    : [
      0,
      (3 + Math.floor(rng() * 2)) % 7,
      (5 + Math.floor(rng() * 2)) % 7,
      (4 + Math.floor(rng() * 3)) % 7,
    ];
  const prog = progDegrees.map((deg) => {
    const notes = triadFromScale(scale, deg).map((n) => n + 12);
    return { root: scale[deg % scale.length], notes };
  });
  const bpm = menu
    ? clampBpm(92 + (seed % 4))
    : clampBpm(86 + (level % 9) * 3 + (seed % 7) + Math.floor(level / 6));
  const pattern = Math.floor(rng() * 4);
  const pluckRate = rng() > 0.45 ? 2 : 4; // 8th or 16th plucks
  const intensity = menu ? 0.55 : Math.min(1, 0.45 + level * 0.04 + rng() * 0.25);
  return { prog, bpm, pattern, pluckRate, intensity, scaleType, menu };
}

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.duckGain = null;
    this.soundOn = true;
    this.musicOn = true;
    this._timer = null;
    this._step = 0;
    this._nextTime = 0;
    this.bpm = 96;
    this.profile = buildProfile(1, 1, true);
    this.prog = this.profile.prog;
    this._level = 1;
    this._musicSeed = 1;
    this._isMenu = true;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();

      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -18;
      this.comp.ratio.value = 3.5;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.18;
      this.comp.knee.value = 6;

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.92;
      this.comp.connect(this.master);
      this.master.connect(this.ctx.destination);

      this.duckGain = this.ctx.createGain();
      this.duckGain.gain.value = 1;
      this.duckGain.connect(this.comp);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicOn ? 0.42 : 0;
      this.musicGain.connect(this.duckGain);

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 8200;
      this.musicFilter.Q.value = 0.7;
      this.musicFilter.connect(this.musicGain);

      this.delay = this.ctx.createDelay(1.2);
      this.delay.delayTime.value = (60 / this.bpm / 4) * 3;
      this.fb = this.ctx.createGain();
      this.fb.gain.value = 0.28;
      this.delayMix = this.ctx.createGain();
      this.delayMix.gain.value = 0.22;
      this.delay.connect(this.fb);
      this.fb.connect(this.delay);
      this.delay.connect(this.delayMix);
      this.delayMix.connect(this.musicFilter);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.soundOn ? 0.62 : 0;
      this.sfxGain.connect(this.comp);
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setSoundEnabled(on) {
    this.soundOn = on;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(on ? 0.62 : 0, this.ctx.currentTime, 0.04);
    }
  }

  setMusicEnabled(on) {
    this.musicOn = on;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(on ? 0.42 : 0, this.ctx.currentTime, 0.08);
    }
    if (on) this.startMusic();
    else this.stopMusic();
  }

  _applyProfile(profile) {
    this.profile = profile;
    this.prog = profile.prog;
    this.bpm = profile.bpm;
    if (this.delay) this.delay.delayTime.value = (60 / this.bpm / 4) * 3;
    if (this.musicFilter) {
      const bright = 5200 + profile.intensity * 4800;
      this.musicFilter.frequency.setTargetAtTime(bright, this.ctx?.currentTime ?? 0, 0.12);
    }
  }

  setMenuMusic() {
    this._isMenu = true;
    this._applyProfile(buildProfile(1, Date.now() & 0xffff, true));
    this._step = 0;
    if (this.ctx) this._nextTime = this.ctx.currentTime + 0.08;
    if (this.musicOn) {
      this.stopMusic();
      this.startMusic();
    }
  }

  setLevelMusic(level, seed = level) {
    this._isMenu = false;
    this._level = level;
    this._musicSeed = seed >>> 0;
    this._applyProfile(buildProfile(level, this._musicSeed, false));
    this._step = 0;
    if (this.ctx) this._nextTime = this.ctx.currentTime + 0.08;
    if (this.musicOn) {
      this.stopMusic();
      this.startMusic();
    }
  }

  startMusic() {
    if (!this.ctx || this._timer) return;
    this._nextTime = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._scheduler(), 25);
  }

  stopMusic() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _scheduler() {
    if (!this.ctx) return;
    const step16 = 60 / this.bpm / 4;
    while (this._nextTime < this.ctx.currentTime + 0.14) {
      this._playStep(this._step, this._nextTime);
      this._nextTime += step16;
      this._step = (this._step + 1) % 64;
    }
  }

  _sidechain(t, depth = 0.38, release = 0.11) {
    if (!this.duckGain) return;
    const g = this.duckGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(1 - depth, t + 0.012);
    g.linearRampToValueAtTime(1, t + release);
  }

  _env(node, t, a, d, s, r, peak, sus) {
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(0, t);
    node.gain.linearRampToValueAtTime(peak, t + a);
    node.gain.linearRampToValueAtTime(sus, t + a + d);
    node.gain.setValueAtTime(sus, t + a + d + s);
    node.gain.linearRampToValueAtTime(0.0001, t + a + d + s + r);
  }

  _toMusic(node) {
    node.connect(this.musicFilter);
    node.connect(this.delay);
  }

  _pad(chord, t, dur, vol = 0.14) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, t);
    filter.frequency.linearRampToValueAtTime(1400 + this.profile.intensity * 800, t + dur * 0.35);
    filter.frequency.exponentialRampToValueAtTime(380, t + dur);
    filter.Q.value = 1.2;
    filter.connect(this.musicFilter);

    const g = this.ctx.createGain();
    g.connect(filter);
    this._env(g, t, dur * 0.18, dur * 0.15, dur * 0.35, dur * 0.32, vol, vol * 0.55);

    chord.notes.forEach((n, i) => {
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      o1.type = 'sawtooth';
      o2.type = 'sawtooth';
      o1.frequency.value = midi(n);
      o2.frequency.value = midi(n);
      o1.detune.value = (i - 1) * 11;
      o2.detune.value = (i - 1) * 11 + 7;
      o1.connect(g);
      o2.connect(g);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.12);
      o2.stop(t + dur + 0.12);
    });
  }

  _bass(noteMidi, t, vol = 0.38) {
    const dur = (60 / this.bpm) * 0.92;
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 280;
    f.Q.value = 2;
    osc.type = 'square';
    sub.type = 'sine';
    osc.frequency.value = midi(noteMidi);
    sub.frequency.value = midi(noteMidi - 12);
    osc.connect(f);
    sub.connect(f);
    f.connect(g);
    g.connect(this.musicFilter);
    this._env(g, t, 0.004, 0.04, dur * 0.45, dur * 0.35, vol, vol * 0.65);
    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.06);
    sub.stop(t + dur + 0.06);
  }

  _pluck(noteMidi, t, vol = 0.11) {
    const dur = (60 / this.bpm / this.profile.pluckRate) * 0.85;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = midi(noteMidi);
    f.Q.value = 8;
    osc.type = 'square';
    osc.frequency.value = midi(noteMidi);
    osc.connect(f);
    f.connect(g);
    this._toMusic(g);
    this._env(g, t, 0.002, dur * 0.25, 0, dur * 0.55, vol, 0.001);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  _kick(t, vol = 0.72) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(168, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(g);
    g.connect(this.musicFilter);
    osc.start(t);
    osc.stop(t + 0.22);
    this._sidechain(t, this._isMenu ? 0.22 : 0.34);
  }

  _snare(t, vol = 0.22) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.16, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 1.4;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicFilter);
    src.start(t);
  }

  _hat(t, vol = 0.05, open = false) {
    const dur = open ? 0.09 : 0.035;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = open ? 5200 : 7800;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.musicFilter);
    src.start(t);
  }

  _drumPattern(step, t, chord) {
    const s = step % 16;
    const p = this.profile.pattern;
    const kicks = [
      [0, 4, 8, 12],
      [0, 3, 8, 11],
      [0, 6, 8, 14],
      [0, 2, 8, 10],
    ][p];
    const snares = [4, 12];
    if (kicks.includes(s)) this._kick(t, this._isMenu ? 0.55 : 0.68);
    if (snares.includes(s)) this._snare(t, this._isMenu ? 0.14 : 0.2);
    if (s % 2 === 1) this._hat(t, this._isMenu ? 0.028 : 0.042);
    if (p === 1 && s === 7) this._hat(t, 0.04, true);
    if (p === 3 && (s === 6 || s === 14)) this._hat(t, 0.05, true);
    if (s % 4 === 0) this._bass(chord.root, t, this._isMenu ? 0.28 : 0.34);
  }

  _playStep(step, t) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = this.prog[bar % this.prog.length];

    if (s === 0) this._pad(chord, t, (60 / this.bpm) * 4, this._isMenu ? 0.11 : 0.13 + this.profile.intensity * 0.04);
    this._drumPattern(step, t, chord);

    const pluckEvery = this.profile.pluckRate;
    if (s % pluckEvery === 0 || (pluckEvery === 2 && s % 4 === 1)) {
      const note = chord.notes[s % chord.notes.length] + (s >= 8 ? 12 : 0);
      this._pluck(note, t, 0.07 + this.profile.intensity * 0.05);
    }
  }

  // ---------- SFX voices ----------
  _sfx(freq, dur, type, vol, detune = 0) {
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _sweep(from, to, dur, type, vol) {
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, hp = 200, lp = 0) {
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    let node = f;
    if (lp > 0) {
      const lpF = this.ctx.createBiquadFilter();
      lpF.type = 'lowpass';
      lpF.frequency.value = lp;
      f.connect(lpF);
      node = lpF;
    }
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    node.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
  }

  _chime(notes, gap = 0.055, type = 'sine', vol = 0.22) {
    notes.forEach((f, i) => {
      setTimeout(() => this._sfx(f, 0.12, type, vol - i * 0.015, (i - 1) * 4), i * gap * 1000);
    });
  }

  brick(combo = 0) {
    const step = Math.min(combo, 12);
    this._sfx(520 * Math.pow(2, step / 12), 0.05, 'square', 0.24);
    this._sfx(1040 * Math.pow(2, step / 24), 0.035, 'sine', 0.1);
  }

  paddle() {
    this._sfx(148, 0.07, 'triangle', 0.34);
    this._noise(0.025, 0.08, 400, 2200);
  }

  wall() {
    this._sfx(380, 0.035, 'sine', 0.16);
    this._sfx(760, 0.025, 'triangle', 0.08);
  }

  power() {
    this._chime([523, 659, 784, 988], 0.06, 'triangle', 0.24);
    this._sweep(440, 1200, 0.2, 'sawtooth', 0.18);
  }

  clutch() {
    this._sweep(740, 1040, 0.1, 'sine', 0.22);
    this._sfx(880, 0.05, 'triangle', 0.14, 8);
  }

  gnomePop() {
    this._sweep(320, 640, 0.12, 'triangle', 0.26);
    this._chime([440, 554], 0.05, 'square', 0.16);
  }

  juggle(n = 1) {
    const step = Math.min(Math.max(1, n), 8);
    this._sfx(392 + step * 48, 0.06, 'triangle', 0.2 + step * 0.018);
    if (step >= 3) this._sfx(784 + step * 24, 0.04, 'sine', 0.12);
  }

  fortressShatter() {
    this._noise(0.5, 0.42, 40, 900);
    this._sweep(220, 38, 0.65, 'sawtooth', 0.28);
    this._sfx(82, 0.3, 'square', 0.18);
  }

  powerCategory(cat = 'env') {
    switch (cat) {
      case 'paddle':
        this._chime([294, 370, 440], 0.07, 'triangle', 0.26);
        break;
      case 'ball':
        this._chime([440, 554, 659, 880], 0.05, 'sine', 0.22);
        break;
      case 'wild':
        this._sweep(280, 920, 0.22, 'square', 0.28);
        this._noise(0.06, 0.14, 280, 4000);
        break;
      default:
        this._chime([330, 415, 494, 622], 0.06, 'triangle', 0.22);
    }
  }

  explode() {
    this._noise(0.32, 0.38, 80, 2400);
    this._sweep(280, 48, 0.38, 'sawtooth', 0.24);
    this._sfx(96, 0.15, 'square', 0.16);
  }

  lose() {
    this._sweep(440, 55, 0.55, 'sawtooth', 0.3);
    this._sfx(110, 0.35, 'triangle', 0.2);
  }

  laser() {
    this._sweep(1400, 680, 0.05, 'square', 0.14);
    this._sfx(980, 0.03, 'sine', 0.1);
  }

  bulletTime() {
    this._sweep(880, 180, 0.42, 'sine', 0.26);
    this._noise(0.14, 0.18, 200, 1600);
    this._sfx(55, 0.4, 'triangle', 0.12);
  }

  wowHit() {
    this._chime([523, 659, 784], 0.055, 'square', 0.22);
    this._sweep(620, 1100, 0.16, 'sawtooth', 0.18);
  }

  levelUp() {
    this._chime([392, 494, 587, 740, 880], 0.07, 'triangle', 0.28);
    this._sweep(330, 880, 0.35, 'sine', 0.16);
  }

  blip(f = 660) {
    this._sfx(f, 0.04, 'square', 0.22);
    this._sfx(f * 1.5, 0.025, 'sine', 0.08);
  }

  setSfxVolume(pct) {
    const v = Math.max(0, Math.min(100, pct)) / 100;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.soundOn ? 0.62 * v : 0, this.ctx?.currentTime ?? 0, 0.04);
    }
  }

  setMusicVolume(pct) {
    const v = Math.max(0, Math.min(100, pct)) / 100;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.42 * v : 0, this.ctx?.currentTime ?? 0, 0.08);
    }
  }

  powerNegative() {
    this._sweep(380, 120, 0.32, 'sawtooth', 0.28);
    this._sfx(146, 0.22, 'square', 0.18);
  }

  brickHit(type = 'normal', hpRemaining = 0) {
    if (type === 'gold' || type === 'silver' || type === 'boss') {
      this._sfx(240 + hpRemaining * 35, 0.08, 'square', 0.26);
      this._noise(0.04, 0.1, 600, 3000);
    } else if (type === 'explosive') {
      this._noise(0.06, 0.18, 350, 2800);
      this._sfx(180, 0.06, 'sawtooth', 0.14);
    } else {
      this.brick(0);
    }
  }

  fireHit() {
    this._noise(0.08, 0.22, 140, 1800);
    this._sfx(420, 0.06, 'sawtooth', 0.18);
  }

  frostHit() {
    this._chime([880, 1108, 1318], 0.045, 'sine', 0.18);
    this._noise(0.05, 0.1, 2000, 8000);
  }

  cannonHit() {
    this._sfx(72, 0.2, 'sawtooth', 0.36);
    this._noise(0.12, 0.22, 60, 800);
  }
}

export const audio = new AudioManager();
