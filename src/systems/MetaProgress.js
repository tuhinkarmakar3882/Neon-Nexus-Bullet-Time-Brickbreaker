import { STORAGE } from '../config/Constants.js';
import { SaveManager } from './SaveManager.js';
import { META_SCHEMA_VERSION } from './SaveMigration.js';

const DEFAULT_META = {
  schemaVersion: META_SCHEMA_VERSION,
  treasury: 0,
  gems: 0,
  stars: {},
  dailyBest: 0,
  dailyDate: '',
  loadout: [],
  codex: { powers: [], gnomes: [], bricks: [] },
  stats: { knockouts: 0, combosCashed: 0, levelsCleared: 0 },
  cosmetics: {
    owned: { hull: ['wood'], trail: ['comet'], theme: ['default'] },
    equipped: { hull: 'wood', trail: 'comet', theme: 'default' },
  },
  premium: false,
  lastRunPath: [],
  dailyScores: [],
};

function loadMeta() {
  const raw = SaveManager.getJson(STORAGE.META, {});
  const m = { ...DEFAULT_META, ...raw, schemaVersion: raw.schemaVersion ?? META_SCHEMA_VERSION };
  if (!m.cosmetics) m.cosmetics = { ...DEFAULT_META.cosmetics };
  if (!m.cosmetics.owned) m.cosmetics.owned = { ...DEFAULT_META.cosmetics.owned };
  if (!m.cosmetics.equipped) m.cosmetics.equipped = { ...DEFAULT_META.cosmetics.equipped };
  return m;
}

function saveMeta(meta) {
  SaveManager.setJson(STORAGE.META, meta);
}

/** Deterministic daily seed from calendar date (offline-friendly). */
export function dailySeedForDate(d = new Date()) {
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const MetaProgress = {
  getTreasury() {
    return loadMeta().treasury ?? 0;
  },
  addTreasury(n) {
    const m = loadMeta();
    m.treasury = (m.treasury ?? 0) + Math.max(0, n);
    saveMeta(m);
    return m.treasury;
  },
  spendTreasury(n) {
    const m = loadMeta();
    const cost = Math.max(0, n);
    if ((m.treasury ?? 0) < cost) return false;
    m.treasury -= cost;
    saveMeta(m);
    return true;
  },
  getGems() {
    return loadMeta().gems ?? 0;
  },
  addGems(n) {
    const m = loadMeta();
    m.gems = (m.gems ?? 0) + Math.max(0, n);
    saveMeta(m);
    return m.gems;
  },
  spendGems(n) {
    const m = loadMeta();
    const cost = Math.max(0, n);
    if ((m.gems ?? 0) < cost) return false;
    m.gems -= cost;
    saveMeta(m);
    return true;
  },
  isPremium() {
    return !!loadMeta().premium;
  },
  setPremium(v) {
    const m = loadMeta();
    m.premium = !!v;
    saveMeta(m);
  },
  getEquipped() {
    return loadMeta().cosmetics?.equipped ?? DEFAULT_META.cosmetics.equipped;
  },
  ownsCosmetic(kind, id) {
    const m = loadMeta();
    const owned = m.cosmetics?.owned?.[kind] ?? [];
    return owned.includes(id);
  },
  unlockCosmetic(kind, id) {
    const m = loadMeta();
    if (!m.cosmetics) m.cosmetics = { ...DEFAULT_META.cosmetics };
    if (!m.cosmetics.owned[kind]) m.cosmetics.owned[kind] = [];
    if (!m.cosmetics.owned[kind].includes(id)) {
      m.cosmetics.owned[kind].push(id);
      saveMeta(m);
    }
  },
  equipCosmetic(kind, id) {
    const m = loadMeta();
    if (!m.cosmetics) m.cosmetics = { ...DEFAULT_META.cosmetics };
    m.cosmetics.equipped[kind] = id;
    saveMeta(m);
  },
  getLastRunPath() {
    return loadMeta().lastRunPath ?? [];
  },
  saveLastRunPath(path) {
    const m = loadMeta();
    m.lastRunPath = (path ?? []).slice(-120);
    saveMeta(m);
  },
  getLoadout() {
    const m = loadMeta();
    return Array.isArray(m.loadout) ? m.loadout.filter(Boolean).slice(0, 3) : [];
  },
  setLoadout(keys) {
    const m = loadMeta();
    m.loadout = keys.filter(Boolean).slice(0, 3);
    saveMeta(m);
  },
  getStars(levelKey) {
    const m = loadMeta();
    return m.stars?.[levelKey] ?? 0;
  },
  setStars(levelKey, stars) {
    const m = loadMeta();
    if (!m.stars) m.stars = {};
    m.stars[levelKey] = Math.max(m.stars[levelKey] ?? 0, stars);
    saveMeta(m);
  },
  getDailyBest() {
    const m = loadMeta();
    if (m.dailyDate !== todayKey()) return 0;
    return m.dailyBest ?? 0;
  },
  setDailyBest(score) {
    const m = loadMeta();
    m.dailyDate = todayKey();
    m.dailyBest = Math.max(m.dailyBest ?? 0, score);
    saveMeta(m);
  },
  recordDailyScore(score) {
    const m = loadMeta();
    const key = todayKey();
    if (m.dailyDate !== key) {
      m.dailyDate = key;
      m.dailyScores = [];
      m.dailyBest = 0;
    }
    m.dailyScores = [...(m.dailyScores ?? []), Math.max(0, score)];
    m.dailyScores.sort((a, b) => b - a);
    m.dailyScores = m.dailyScores.slice(0, 5);
    m.dailyBest = Math.max(m.dailyBest ?? 0, score);
    saveMeta(m);
    return { scores: m.dailyScores, rank: m.dailyScores.filter((s) => s > score).length + 1 };
  },
  getDailyRank(score) {
    const board = this.getDailyLeaderboard();
    return board.filter((s) => s > score).length + 1;
  },
  getDailyLeaderboard() {
    const m = loadMeta();
    if (m.dailyDate !== todayKey()) return [];
    return m.dailyScores ?? [];
  },
  getJournalAchievements() {
    const m = loadMeta();
    const stats = m.stats ?? DEFAULT_META.stats;
    const codex = m.codex ?? DEFAULT_META.codex;
    return [
      { id: 'first_ko', label: 'First Jardinain knocked loose', done: (stats.knockouts ?? 0) >= 1 },
      { id: 'gambit', label: 'Cashed a combo gambit', done: (stats.combosCashed ?? 0) >= 1 },
      { id: 'cleared_10', label: 'Cleared ten garden levels', done: (stats.levelsCleared ?? 0) >= 10 },
      { id: 'gem_collector', label: 'Fifty gems secured', done: (m.gems ?? 0) >= 50 },
      { id: 'gnome_scholar', label: 'Three gnome tiers catalogued', done: (codex.gnomes?.length ?? 0) >= 3 },
      { id: 'power_collector', label: 'Twelve powers discovered', done: (codex.powers?.length ?? 0) >= 12 },
    ];
  },
  countTotalStars() {
    const stars = loadMeta().stars ?? {};
    return Object.values(stars).reduce((n, s) => n + (s ?? 0), 0);
  },
  unlockCodex(kind, id) {
    const m = loadMeta();
    if (!m.codex) m.codex = { powers: [], gnomes: [], bricks: [] };
    const list = m.codex[kind] ?? [];
    if (!list.includes(id)) {
      list.push(id);
      m.codex[kind] = list;
      saveMeta(m);
    }
  },
  getCodex() {
    return loadMeta().codex ?? DEFAULT_META.codex;
  },
  bumpStat(key, n = 1) {
    const m = loadMeta();
    if (!m.stats) m.stats = { ...DEFAULT_META.stats };
    m.stats[key] = (m.stats[key] ?? 0) + n;
    saveMeta(m);
  },
  getStats() {
    return loadMeta().stats ?? DEFAULT_META.stats;
  },
};
