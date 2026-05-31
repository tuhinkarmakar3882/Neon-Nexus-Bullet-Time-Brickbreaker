// Pixabay background music + procedural arcade SFX (Web Audio API).

import { POWERS, resolvePowerKey } from '../config/PowerUps.js';
import { MUSIC_TRACKS, trackForLevel, menuTrackForVariant, pixabayAlternates, normalizeMusicVariant, allTrackUrls } from '../config/MusicCatalog.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.soundOn = true;
    this.musicOn = true;
    this._level = 1;
    this._musicSeed = 1;
    this._biome = 'garden';
    this._isBoss = false;
    this._isMenu = true;
    this._currentTrackId = null;
    this._trackSlot = 0;
    this._trackA = null;
    this._trackB = null;
    this._trackFadeId = null;
    this._musicVolScale = 1;
    this._tracksReady = false;
    this._currentTrackDef = null;
    this._musicVariant = 'auto';
  }

  _initTracks() {
    if (this._tracksReady || typeof Audio === 'undefined') return;
    this._trackA = new Audio();
    this._trackB = new Audio();
    this._trackA.preload = 'auto';
    this._trackB.preload = 'auto';
    this._tracksReady = true;
  }

  _activeTrackEl() {
    return this._trackSlot === 0 ? this._trackA : this._trackB;
  }

  _idleTrackEl() {
    return this._trackSlot === 0 ? this._trackB : this._trackA;
  }

  _baseTrackVolume(trackDef) {
    return (trackDef?.volume ?? 0.38) * this._musicVolScale * (this.musicOn ? 1 : 0);
  }

  _stopTracks(immediate = true) {
    if (this._trackFadeId) {
      clearInterval(this._trackFadeId);
      this._trackFadeId = null;
    }
    [this._trackA, this._trackB].forEach((el) => {
      if (!el) return;
      if (immediate) {
        el.pause();
        el.volume = 0;
        el.removeAttribute('src');
      }
    });
  }

  _fadeTrackVolumes(fromEl, toEl, toVol, ms = 1200) {
    if (this._trackFadeId) clearInterval(this._trackFadeId);
    const steps = Math.max(8, Math.round(ms / 40));
    let i = 0;
    const fromStart = fromEl?.volume ?? 0;
    this._trackFadeId = setInterval(() => {
      i++;
      const t = i / steps;
      if (fromEl) fromEl.volume = Math.max(0, fromStart * (1 - t));
      if (toEl) toEl.volume = toVol * t;
      if (i >= steps) {
        clearInterval(this._trackFadeId);
        this._trackFadeId = null;
        if (fromEl) { fromEl.pause(); fromEl.volume = 0; }
        if (toEl) toEl.volume = toVol;
      }
    }, ms / steps);
  }

  async _tryPlayUrl(url, trackDef) {
    const next = this._idleTrackEl();
    const cur = this._activeTrackEl();
    if (!next) return false;

    next.loop = trackDef.loop !== false;
    next.src = url;
    next.volume = 0;

    try {
      await next.play();
    } catch {
      return false;
    }

    this._currentTrackId = trackDef.id;
    this._currentTrackDef = trackDef;
    this._trackSlot = 1 - this._trackSlot;
    this._fadeTrackVolumes(cur, next, this._baseTrackVolume(trackDef));
    return true;
  }

  async _crossfadeToTrack(trackDef) {
    if (!this.musicOn || !trackDef?.url) return false;
    this._initTracks();

    const urls = [trackDef.url, ...pixabayAlternates(trackDef.url, this._musicVariant)];
    for (const url of urls) {
      if (await this._tryPlayUrl(url, trackDef)) return true;
    }
    return false;
  }

  async _playPixabayTrack(trackDef) {
    if (!this.musicOn) return;
    await this._crossfadeToTrack(trackDef);
  }

  /** Preload all catalog URLs (best-effort). */
  preloadMusicCatalog() {
    this._initTracks();
    allTrackUrls().forEach((url) => {
      if (!url) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'audio';
      link.href = url;
      document.head.appendChild(link);
    });
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
    if (!on) {
      this._stopTracks();
      return;
    }
    const active = this._activeTrackEl();
    if (active?.src) {
      active.volume = this._baseTrackVolume(this._currentTrackDef ?? MUSIC_TRACKS.menu);
      active.play().catch(() => {});
      return;
    }
    if (this._isMenu) this.setMenuMusic();
    else this.setLevelMusic(this._level, this._musicSeed, { biome: this._biome, isBoss: this._isBoss });
  }

  setMusicVariant(variant) {
    this._musicVariant = normalizeMusicVariant(variant);
  }

  getMusicVariant() {
    return this._musicVariant;
  }

  applyMusicSettings({ musicVariant, musicVolume } = {}) {
    if (musicVariant != null) this.setMusicVariant(musicVariant);
    if (musicVolume != null) this.setMusicVolume(musicVolume);
    if (!this.musicOn) return;
    if (this._isMenu) this.setMenuMusic();
    else this.setLevelMusic(this._level, this._musicSeed, { biome: this._biome, isBoss: this._isBoss });
  }

  setMenuMusic() {
    this._isMenu = true;
    this._playPixabayTrack(menuTrackForVariant(this._musicVariant));
  }

  setLevelMusic(level, seed = level, opts = {}) {
    this._isMenu = false;
    this._level = level;
    this._musicSeed = seed >>> 0;
    this._biome = opts.biome ?? 'garden';
    this._isBoss = !!opts.isBoss;
    if (opts.musicVariant != null) this._musicVariant = normalizeMusicVariant(opts.musicVariant);
    this._playPixabayTrack(trackForLevel(this._level, this._musicSeed, {
      biome: this._biome,
      isBoss: this._isBoss,
      musicVariant: this._musicVariant,
    }));
  }

  /** Resume Pixabay track after app background (NativeBridge). */
  startMusic() {
    if (!this.musicOn) return;
    const el = this._activeTrackEl();
    if (el?.src) el.play().catch(() => {});
  }

  stopMusic() {
    [this._trackA, this._trackB].forEach((el) => el?.pause());
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
    const active = this._activeTrackEl();
    if (active && !active.paused) {
      const base = active.volume;
      active.volume = base * 0.55;
      setTimeout(() => { if (active && !active.paused) active.volume = base; }, 420);
    }
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
    this._musicVolScale = v;
    const active = this._activeTrackEl();
    if (active && !active.paused) {
      active.volume = this._baseTrackVolume(this._currentTrackDef);
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
