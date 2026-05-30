import { POWERS } from '../config/PowerUps.js';

// Tracks active *timed* power-ups with frame-driven expiry. Because timing is
// decremented by the GameScene's own delta (not wall-clock setTimeout), pausing
// the scene correctly freezes power durations — fixing a core legacy bug.

export class PowerUpSystem {
  constructor() {
    this.active = new Map(); // key -> remaining ms
    this.onExpire = null;    // (key) => void
  }

  isActive(key) {
    return this.active.has(key);
  }

  activate(key, durMs) {
    const dur = durMs ?? POWERS[key]?.dur ?? 5000;
    this.active.set(key, dur);
  }

  clear(key) {
    if (this.active.delete(key) && this.onExpire) this.onExpire(key);
  }

  clearAll() {
    const keys = [...this.active.keys()];
    this.active.clear();
    if (this.onExpire) keys.forEach((k) => this.onExpire(k));
  }

  // remaining/total ratio for HUD timer bars (0..1)
  ratio(key) {
    if (!this.active.has(key)) return 0;
    const total = POWERS[key]?.dur || 1;
    return Math.max(0, Math.min(1, this.active.get(key) / total));
  }

  tick(dtMs) {
    if (this.active.size === 0) return;
    const expired = [];
    for (const [key, remaining] of this.active) {
      const next = remaining - dtMs;
      if (next <= 0) expired.push(key);
      else this.active.set(key, next);
    }
    for (const key of expired) {
      this.active.delete(key);
      if (this.onExpire) this.onExpire(key);
    }
  }

  keys() {
    return [...this.active.keys()];
  }
}
