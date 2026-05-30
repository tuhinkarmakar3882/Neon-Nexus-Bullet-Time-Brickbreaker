// Fully synthesized audio via the Web Audio API — no external files, no CDN.
// A lookahead-scheduled music engine (pad + bass + arpeggio + drums over an
// A-minor i–VI–III–VII progression) plus punchy arcade SFX, glued by a master
// compressor. Sound and music are independently toggleable.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// MIDI note numbers
const A2 = 45, C3 = 48, E3 = 52, F2 = 41, G2 = 43, B3 = 59, D4 = 62, G3 = 55, A3 = 57, C4 = 60, E4 = 64, F3 = 53;

// 4-bar progression: Am, F, C, G
const PROG = [
  { root: A2, notes: [A3, C4, E4] },
  { root: F2, notes: [F3, midi(57), C4] },
  { root: C3, notes: [C4, E4, G3] },
  { root: G2, notes: [G3, B3, D4] },
];

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.soundOn = true;
    this.musicOn = true;
    this._timer = null;
    this._step = 0;
    this._nextTime = 0;
    this.bpm = 102;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();

      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 4;
      this.comp.attack.value = 0.003;
      this.comp.release.value = 0.25;

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.comp.connect(this.master);
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicOn ? 0.5 : 0;
      this.musicGain.connect(this.comp);

      // Space: feedback delay for the arp/pad
      this.delay = this.ctx.createDelay(1.0);
      this.delay.delayTime.value = 60 / this.bpm / 2 * 1.5; // dotted-ish
      this.fb = this.ctx.createGain();
      this.fb.gain.value = 0.32;
      this.delayMix = this.ctx.createGain();
      this.delayMix.gain.value = 0.35;
      this.delay.connect(this.fb); this.fb.connect(this.delay);
      this.delay.connect(this.delayMix); this.delayMix.connect(this.musicGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.soundOn ? 0.55 : 0;
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
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }

  setMusicEnabled(on) {
    this.musicOn = on;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.1);
    if (on) this.startMusic();
  }

  // ---------- voices ----------
  _env(node, t, a, d, s, r, peak, sus) {
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(0, t);
    node.gain.linearRampToValueAtTime(peak, t + a);
    node.gain.linearRampToValueAtTime(sus, t + a + d);
    node.gain.setValueAtTime(sus, t + a + d + s);
    node.gain.linearRampToValueAtTime(0.0001, t + a + d + s + r);
  }

  _tone(freq, t, dur, type, vol, dest, detune = 0) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.value = detune;
    osc.connect(g); g.connect(dest || this.musicGain);
    this._env(g, t, 0.006, dur * 0.3, dur * 0.3, dur * 0.4, vol, vol * 0.5);
    osc.start(t); osc.stop(t + dur + 0.05);
    return osc;
  }

  _pad(chord, t, dur) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.linearRampToValueAtTime(1200, t + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(500, t + dur);
    filter.Q.value = 2;
    filter.connect(this.musicGain);
    const g = this.ctx.createGain();
    g.connect(filter);
    this._env(g, t, dur * 0.2, dur * 0.2, dur * 0.3, dur * 0.3, 0.16, 0.12);
    [0, 1, 2].forEach((i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(chord.notes[i]);
      o.detune.value = (i - 1) * 8;
      o.connect(g); o.start(t); o.stop(t + dur + 0.1);
    });
  }

  _bass(noteMidi, t) {
    const dur = 60 / this.bpm * 0.9;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 4;
    osc.type = 'triangle';
    osc.frequency.value = midi(noteMidi);
    osc.connect(f); f.connect(g); g.connect(this.musicGain);
    this._env(g, t, 0.005, 0.05, dur * 0.4, dur * 0.4, 0.34, 0.22);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  _arp(noteMidi, t) {
    const dur = 60 / this.bpm / 4 * 0.9;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = midi(noteMidi);
    osc.connect(g);
    g.connect(this.musicGain);
    g.connect(this.delay);
    this._env(g, t, 0.004, dur * 0.4, 0, dur * 0.6, 0.14, 0.06);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  _kick(t) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + 0.2);
  }

  _noiseHit(t, dur, hp, vol) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.musicGain);
    src.start(t);
  }

  // ---------- sequencer ----------
  startMusic() {
    if (!this.ctx || this._timer) return;
    this._nextTime = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._scheduler(), 25);
  }

  stopMusic() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  _scheduler() {
    if (!this.ctx) return;
    const step16 = 60 / this.bpm / 4;
    while (this._nextTime < this.ctx.currentTime + 0.12) {
      this._playStep(this._step, this._nextTime);
      this._nextTime += step16;
      this._step = (this._step + 1) % 64;
    }
  }

  _playStep(step, t) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = PROG[bar];

    if (s === 0) this._pad(chord, t, (60 / this.bpm) * 4);
    if (s % 4 === 0) this._bass(chord.root, t);
    // arpeggio: ascend, octave-up in second half of the bar
    const note = chord.notes[s % chord.notes.length] + (s >= 8 ? 12 : 0);
    if (s % 2 === 0 || s % 4 === 1) this._arp(note, t);

    if (s === 0 || s === 6 || s === 8) this._kick(t);
    if (s === 4 || s === 12) this._noiseHit(t, 0.18, 1200, 0.28); // snare
    if (s % 2 === 1) this._noiseHit(t, 0.05, 7000, 0.07);          // hat
  }

  // ---------- SFX ----------
  _sfx(freq, dur, type, vol) {
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _sweep(from, to, dur, type, vol) {
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, hp = 200) {
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  // combo raises pitch for a satisfying ascending run
  brick(combo = 0) { this._sfx(440 * Math.pow(2, Math.min(combo, 14) / 12), 0.07, 'square', 0.3); }
  paddle()   { this._sfx(196, 0.06, 'triangle', 0.32); }
  wall()     { this._sfx(294, 0.04, 'sine', 0.18); }
  power()    { this._sweep(440, 1100, 0.25, 'sawtooth', 0.3); }
  explode()  { this._noise(0.4, 0.45, 120); this._sweep(220, 40, 0.45, 'sawtooth', 0.28); }
  lose()     { this._sweep(420, 70, 0.6, 'sawtooth', 0.35); }
  laser()    { this._sfx(1200, 0.04, 'square', 0.16); }
  bulletTime() { this._sweep(900, 260, 0.35, 'sine', 0.28); }
  levelUp()  { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this._sfx(f, 0.18, 'triangle', 0.34), i * 80)); }
  blip(f = 660) { this._sfx(f, 0.05, 'square', 0.25); }
}

export const audio = new AudioManager();
