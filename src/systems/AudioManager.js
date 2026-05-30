// Fully synthesized audio via the Web Audio API — no external files, no CDN,
// no autoplay/CORS headaches. Produces crisp arcade SFX and a subtle evolving
// ambient pad so the game is "ready to ship" offline on every platform.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.musicNodes = [];
    this._started = false;
  }

  // Must be called from a user gesture (browser autoplay policy).
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.enabled ? 0.18 : 0;
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.enabled ? 0.6 : 0;
      this.sfxGain.connect(this.master);
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(on ? 0.18 : 0, t, 0.1);
    this.sfxGain.gain.setTargetAtTime(on ? 0.6 : 0, t, 0.05);
  }

  blip(freq = 440, dur = 0.08, type = 'square', vol = 0.5) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  sweep(from, to, dur = 0.18, type = 'sawtooth', vol = 0.4) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur = 0.25, vol = 0.5) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(filter); filter.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  // High-level SFX
  brick()    { this.blip(520 + Math.random() * 120, 0.06, 'square', 0.35); }
  paddle()   { this.blip(220, 0.05, 'triangle', 0.4); }
  wall()     { this.blip(330, 0.04, 'sine', 0.25); }
  power()    { this.sweep(420, 920, 0.22, 'sawtooth', 0.35); }
  explode()  { this.noise(0.35, 0.5); this.sweep(180, 40, 0.4, 'sawtooth', 0.3); }
  lose()     { this.sweep(360, 80, 0.5, 'sawtooth', 0.4); }
  levelUp()  { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.4), i * 90)); }
  laser()    { this.blip(880, 0.04, 'square', 0.2); }
  bulletTime() { this.sweep(600, 200, 0.3, 'sine', 0.3); }

  startMusic() {
    if (!this.ctx || this._started) return;
    this._started = true;
    // Two slow detuned saw pads through a gentle lowpass = neon ambience.
    const baseFreqs = [110, 164.81];
    baseFreqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = idx ? 6 : -6;
      lfo.frequency.value = 0.05 + idx * 0.03;
      lfoGain.gain.value = 400;
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      g.gain.value = 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
      osc.start();
      lfo.start();
      this.musicNodes.push(osc, lfo);
    });
  }
}

export const audio = new AudioManager();
