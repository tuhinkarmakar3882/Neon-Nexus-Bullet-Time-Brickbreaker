import { STORAGE } from '../config/Constants.js';

// Thin, crash-proof wrapper over localStorage (some webviews disable it).
const mem = {};

function get(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return key in mem ? mem[key] : fallback;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    mem[key] = String(value);
  }
}

export const SaveManager = {
  getBool(key, fallback = true) {
    const v = get(key, null);
    return v === null ? fallback : v === 'true';
  },
  setBool(key, value) {
    set(key, !!value);
  },
  getNumber(key, fallback = 0) {
    const v = Number(get(key, fallback));
    return Number.isFinite(v) ? v : fallback;
  },
  setNumber(key, value) {
    set(key, value);
  },
  loadSettings() {
    return {
      sound: this.getBool(STORAGE.SOUND, true),
      music: this.getBool(STORAGE.MUSIC, true),
      bulletTime: this.getBool(STORAGE.BULLET_TIME, true),
      flashText: this.getBool(STORAGE.FLASH_TEXT, true),
      particles: this.getBool(STORAGE.PARTICLES, true),
    };
  },
  saveSettings(s) {
    this.setBool(STORAGE.SOUND, s.sound);
    this.setBool(STORAGE.MUSIC, s.music);
    this.setBool(STORAGE.BULLET_TIME, s.bulletTime);
    this.setBool(STORAGE.FLASH_TEXT, s.flashText);
    this.setBool(STORAGE.PARTICLES, s.particles);
  },
  getHighScore() {
    return this.getNumber(STORAGE.HIGH_SCORE, 0);
  },
  setHighScore(v) {
    this.setNumber(STORAGE.HIGH_SCORE, v);
  },
};
