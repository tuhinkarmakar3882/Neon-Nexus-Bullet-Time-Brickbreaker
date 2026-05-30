import { STORAGE } from '../config/Constants.js';
import { migrateVfxQuality, normalizeVfxQuality } from '../config/VfxQuality.js';

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
  getJson(key, fallback = null) {
    try {
      const v = get(key, null);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  setJson(key, value) {
    set(key, JSON.stringify(value));
  },
  loadSettings() {
    const sound = this.getBool(STORAGE.SOUND, true);
    const music = this.getBool(STORAGE.MUSIC, true);
    const storedQuality = get(STORAGE.VFX_QUALITY, null);
    const legacy = {
      sound,
      music,
      particles: this.getBool(STORAGE.PARTICLES, true),
      reducedFx: this.getBool(STORAGE.REDUCED_FX, false),
      scanlines: this.getBool(STORAGE.SCANLINES, false),
      vfxQuality: storedQuality,
    };
    return {
      sound,
      music,
      vfxQuality: storedQuality ? normalizeVfxQuality(storedQuality) : migrateVfxQuality(legacy),
      sfxVolume: this.getNumber(STORAGE.SFX_VOLUME, 100),
      musicVolume: this.getNumber(STORAGE.MUSIC_VOLUME, 100),
    };
  },
  saveSettings(s) {
    this.setBool(STORAGE.SOUND, s.sound);
    this.setBool(STORAGE.MUSIC, s.music);
    set(STORAGE.VFX_QUALITY, normalizeVfxQuality(s.vfxQuality));
    this.setNumber(STORAGE.SFX_VOLUME, s.sfxVolume ?? 100);
    this.setNumber(STORAGE.MUSIC_VOLUME, s.musicVolume ?? 100);
  },
  getHighScore() {
    return this.getNumber(STORAGE.HIGH_SCORE, 0);
  },
  setHighScore(v) {
    this.setNumber(STORAGE.HIGH_SCORE, v);
  },
  getRemoveAds() {
    return this.getBool(STORAGE.REMOVE_ADS, false);
  },
  setRemoveAds(v) {
    this.setBool(STORAGE.REMOVE_ADS, v);
  },
  loadRun() {
    return this.getJson(STORAGE.RUN, null);
  },
  saveRun(snapshot) {
    if (snapshot) this.setJson(STORAGE.RUN, snapshot);
  },
  clearRun() {
    try { localStorage.removeItem(STORAGE.RUN); } catch { delete mem[STORAGE.RUN]; }
  },
};
