// Procedural music + arcade SFX — Web Audio API, no external assets.

import { POWERS, resolvePowerKey } from '../config/PowerUps.js';
import {
  buildMusicProfile,
  arpNoteAt,
  leadNoteAt,
  bassNoteAt,
  midi,
} from './MusicEngine.js';

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
    this.profile = buildMusicProfile(1, 1, true);
    this.prog = this.profile.prog;
    this._level = 1;
    this._musicSeed = 1;
    this._biome = 'garden';
    this._isBoss = false;
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
      this.musicGain.gain.value = this.musicOn ? 0.36 : 0;
      this.musicGain.connect(this.duckGain);

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 7200;
      this.musicFilter.Q.value = 0.5;
      this.musicFilter.connect(this.musicGain);

      this.delay = this.ctx.createDelay(1.4);
      this.delay.delayTime.value = 0.375;
      this.fb = this.ctx.createGain();
      this.fb.gain.value = 0.14;
      this.delayMix = this.ctx.createGain();
      this.delayMix.gain.value = 0.16;
      this.delay.connect(this.fb);
      this.fb.connect(this.delay);
      this.delay.connect(this.delayMix);
      this.delayMix.connect(this.musicFilter);

      this.reverbDelay = this.ctx.createDelay(0.6);
      this.reverbDelay.delayTime.value = 0.41;
      this.reverbFb = this.ctx.createGain();
      this.reverbFb.gain.value = 0.1;
      this.reverbMix = this.ctx.createGain();
      this.reverbMix.gain.value = 0.1;
      this.reverbDelay.connect(this.reverbFb);
      this.reverbFb.connect(this.reverbDelay);
      this.reverbDelay.connect(this.reverbMix);
      this.reverbMix.connect(this.musicFilter);

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
      this.musicGain.gain.setTargetAtTime(on ? 0.36 : 0, this.ctx.currentTime, 0.08);
    }
    if (on) this.startMusic();
    else this.stopMusic();
  }

  _applyProfile(profile) {
    this.profile = profile;
    this.prog = profile.prog;
    this.bpm = profile.bpm;
    const beat = 60 / this.bpm / 4;
    if (this.delay) this.delay.delayTime.setTargetAtTime(beat * 3, this.ctx?.currentTime ?? 0, 0.08);
    if (this.musicFilter) {
      this.musicFilter.frequency.setTargetAtTime(profile.filterHz ?? 7200, this.ctx?.currentTime ?? 0, 0.2);
    }
  }

  _fadeMusic(to, dur = 0.35) {
    if (!this.musicGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setTargetAtTime(to, t, dur * 0.35);
  }

  setMenuMusic() {
    this._isMenu = true;
    this._fadeMusic(0, 0.25);
    this.stopMusic();
    this._applyProfile(buildMusicProfile(1, Date.now() & 0xffff, true));
    this._step = 0;
    if (this.ctx) this._nextTime = this.ctx.currentTime + 0.12;
    if (this.musicOn) {
      this.startMusic();
      this._fadeMusic(0.36, 0.4);
    }
  }

  setLevelMusic(level, seed = level, opts = {}) {
    this._isMenu = false;
    this._level = level;
    this._musicSeed = seed >>> 0;
    this._biome = opts.biome ?? 'garden';
    this._isBoss = !!opts.isBoss;
    this._fadeMusic(0, 0.22);
    this.stopMusic();
    this._applyProfile(buildMusicProfile(level, this._musicSeed, false, {
      biome: this._biome,
      isBoss: this._isBoss,
    }));
    this._step = 0;
    if (this.ctx) this._nextTime = this.ctx.currentTime + 0.12;
    if (this.musicOn) {
      this.startMusic();
      this._fadeMusic(0.36, 0.45);
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
      this._step = (this._step + 1) % (this.profile.phraseSteps ?? 64);
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
    node.connect(this.reverbDelay);
  }

  _pad(chord, t, dur, vol = 0.07) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.linearRampToValueAtTime(3200 + this.profile.intensity * 1200, t + dur * 0.18);
    filter.frequency.exponentialRampToValueAtTime(1400, t + dur);
    filter.Q.value = 0.6;
    filter.connect(this.musicFilter);
    filter.connect(this.reverbDelay);

    const g = this.ctx.createGain();
    g.connect(filter);
    this._env(g, t, dur * 0.08, dur * 0.1, dur * 0.55, dur * 0.2, vol, vol * 0.72);

    chord.notes.forEach((n, i) => {
      const o = this.ctx.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'triangle';
      o.frequency.value = midi(n);
      o.detune.value = (i - 1) * 4;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
  }

  _bass(noteMidi, t, vol = 0.2) {
    const dur = (60 / this.bpm) * 0.72;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520;
    osc.type = 'sawtooth';
    osc.frequency.value = midi(noteMidi);
    osc.connect(f);
    f.connect(g);
    g.connect(this.musicFilter);
    this._env(g, t, 0.004, 0.04, dur * 0.55, dur * 0.22, vol, vol * 0.78);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _arp(noteMidi, t, vol = 0.045) {
    const dur = (60 / this.bpm / 2) * 0.62;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(midi(noteMidi) * 3.2, t);
    f.frequency.exponentialRampToValueAtTime(midi(noteMidi) * 1.4, t + dur);
    osc.type = 'square';
    osc.frequency.value = midi(noteMidi);
    osc.connect(f);
    f.connect(g);
    this._toMusic(g);
    this._env(g, t, 0.002, dur * 0.1, 0, dur * 0.35, vol, 0.001);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _lead(noteMidi, t, vol = 0.1) {
    const dur = (60 / this.bpm) * 0.68;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 6800;
    osc.type = 'square';
    osc.frequency.value = midi(noteMidi);
    osc.connect(f);
    f.connect(g);
    this._toMusic(g);
    this._env(g, t, 0.004, dur * 0.08, dur * 0.42, dur * 0.22, vol, vol * 0.62);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  _kick(t, vol = 0.55) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.1);
    g.gain.setValueAtTime(vol * (this.profile.drumMix ?? 0.55), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g);
    g.connect(this.musicFilter);
    osc.start(t);
    osc.stop(t + 0.2);
    this._sidechain(t, this.profile.sidechain ?? 0.14);
  }

  _snare(t, vol = 0.16) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 1.6;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2200;
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * (this.profile.drumMix ?? 0.55), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicFilter);
    src.start(t);
  }

  _hat(t, vol = 0.045, open = false) {
    const dur = open ? 0.07 : 0.028;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = open ? 6000 : 8500;
    const g = this.ctx.createGain();
    g.gain.value = vol * (this.profile.drumMix ?? 0.55);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicFilter);
    src.start(t);
  }

  _drumPattern(step, t, chord) {
    const s = step % 16;
    const kicks = this.profile.kicks ?? [0, 8];
    const snares = this.profile.snares ?? [4, 12];
    if (kicks.includes(s)) this._kick(t);
    if (snares.includes(s)) this._snare(t);
    if (s % 2 === 1) this._hat(t, 0.04);
    if (s === 6 || s === 14) this._hat(t, 0.03, true);
  }

  _playStep(step, t) {
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const chord = this.prog[bar];
    const p = this.profile;

    if (s === 0) {
      this._pad(chord, t, (60 / this.bpm) * 4, p.padMix ?? 0.07);
    }

    this._drumPattern(step, t, chord);

    if (step % 2 === 0) {
      this._arp(arpNoteAt(p, step, chord), t, p.arpMix ?? 0.045);
    }

    const lead = leadNoteAt(p, step);
    if (lead != null) this._lead(lead, t, p.leadMix ?? 0.1);

    const bass = bassNoteAt(p, step, chord);
    if (bass != null) this._bass(bass, t, p.bassMix ?? 0.2);
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

  /** Per-power pickup sting — keyed off catalog entry. */
  powerPickup(key) {
    const k = resolvePowerKey(key);
    const def = POWERS[k];
    if (!def) { this.power(); return; }
    if (def.polarity === 'neg') { this.powerNegative(); return; }
    const hash = [...k].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
    const catPitch = {
      paddle: [294, 370, 440, 554, 659],
      ball: [440, 554, 659, 784, 988],
      env: [330, 415, 494, 622, 740],
      wild: [220, 277, 349, 415, 523],
    }[def.category] ?? [392, 494, 587];
    const base = catPitch[hash % catPitch.length] + (hash % 9) * 6;
    const wave = def.category === 'ball' ? 'sawtooth' : def.category === 'wild' ? 'square' : 'triangle';
    this._chime([base, base * 1.26, base * 1.52, base * 1.88], 0.048, wave, 0.24);
    if (def.cannon === 'laser') this._sweep(1200, 680, 0.08, 'square', 0.14);
    else if (def.cannon === 'fire' || def.cannon === 'napalm') this._noise(0.07, 0.16, 120, 2200);
    else if (def.cannon === 'ice') this.frostHit();
    else if (def.cannon === 'shock') this._sweep(880, 1320, 0.1, 'sawtooth', 0.12);
    else if (def.ballMod === 'explosive' || def.ballMod === 'nuke') this._noise(0.05, 0.14, 200, 3200);
    else if (def.ballMod === 'frost') this._chime([880, 1174, 1396], 0.04, 'sine', 0.16);
    else if (def.ballMod === 'electric') this._sweep(660, 1180, 0.09, 'square', 0.12);
    else if (def.kind === 'instant') this._chime([523, 659, 784, 988, 1174], 0.06, 'triangle', 0.28);
  }

  gemPickup() {
    this._chime([988, 1174, 1396], 0.038, 'sine', 0.22);
    this._sfx(1760, 0.05, 'triangle', 0.12);
  }

  /** Brick destroy — type-specific timbre + combo pitch lift. */
  brickBreak(type = 'normal', combo = 0, hpRemaining = 0) {
    const step = Math.min(combo, 14);
    const lift = Math.pow(2, step / 12);
    switch (type) {
      case 'silver':
        this._sfx(320 * lift, 0.07, 'square', 0.28);
        this._chime([640, 800, 960].map((f) => f * lift), 0.035, 'triangle', 0.14);
        break;
      case 'reinforced':
        this._sfx(180 + hpRemaining * 40, 0.09, 'sawtooth', 0.26);
        this._noise(0.05, 0.12, 500, 2800);
        break;
      case 'boss':
        this._sfx(140 * lift, 0.12, 'square', 0.32);
        this._noise(0.08, 0.18, 80, 1800);
        this._sweep(220, 80, 0.2, 'sawtooth', 0.16);
        break;
      case 'explosive':
      case 'seedpod':
        this._noise(0.1, 0.22, 280, 3400);
        this._sfx(160, 0.07, 'sawtooth', 0.18);
        this._sweep(400, 60, 0.15, 'square', 0.14);
        break;
      case 'nest':
      case 'beehive':
        this._chime([440, 554, 659].map((f) => f * lift), 0.04, 'square', 0.2);
        this._sweep(520, 880, 0.1, 'triangle', 0.14);
        break;
      case 'moss':
        this._sfx(260 * lift, 0.06, 'triangle', 0.18);
        this._noise(0.04, 0.08, 800, 4000);
        break;
      case 'invisible':
        this._sweep(880, 440, 0.08, 'sine', 0.16);
        this._sfx(660 * lift, 0.04, 'triangle', 0.12);
        break;
      case 'portal':
        this._sweep(300, 900, 0.12, 'sine', 0.18);
        this._sfx(720 * lift, 0.05, 'triangle', 0.1);
        break;
      case 'shifting':
      case 'mirror':
        this._sfx(480 * lift, 0.05, 'square', 0.2);
        this._sfx(720 * lift, 0.035, 'sine', 0.1);
        break;
      case 'linked':
        this._chime([392, 494, 587].map((f) => f * lift), 0.04, 'triangle', 0.18);
        break;
      case 'hostage':
        this._chime([523, 659, 784], 0.06, 'sine', 0.24);
        this._sweep(440, 880, 0.14, 'triangle', 0.12);
        break;
      case 'gold':
        this._chime([784, 988, 1174], 0.045, 'sine', 0.26);
        this._sfx(880, 0.06, 'triangle', 0.14);
        break;
      default:
        this.brick(combo);
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
      this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.36 * v : 0, this.ctx?.currentTime ?? 0, 0.08);
    }
  }

  powerNegative() {
    this._sweep(380, 120, 0.32, 'sawtooth', 0.28);
    this._sfx(146, 0.22, 'square', 0.18);
  }

  brickHit(type = 'normal', hpRemaining = 0) {
    this.brickBreak(type, 0, hpRemaining);
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
