/**
 * Versioned localStorage migrations — run once at boot before scenes load saves.
 * WebView localStorage persists across app updates (same appId); cleared on uninstall.
 */
import { STORAGE } from '../config/Constants.js';
import { SaveManager } from './SaveManager.js';
import { migrateVfxQuality } from '../config/VfxQuality.js';

export const CURRENT_SAVE_SCHEMA = 2;

const META_SCHEMA_VERSION = 2;
const RUN_FORMAT_VERSION = 2;

function getSchemaVersion() {
  return SaveManager.getNumber(STORAGE.SAVE_SCHEMA, 0);
}

function setSchemaVersion(v) {
  SaveManager.setNumber(STORAGE.SAVE_SCHEMA, v);
}

function migrateVfxFromLegacy() {
  const settings = SaveManager.loadSettings();
  if (!settings?.vfxQuality) {
    const legacy = {
      sound: SaveManager.getBool(STORAGE.SOUND, true),
      music: SaveManager.getBool(STORAGE.MUSIC, true),
      particles: SaveManager.getBool(STORAGE.PARTICLES, true),
      reducedFx: SaveManager.getBool(STORAGE.REDUCED_FX, false),
      scanlines: SaveManager.getBool(STORAGE.SCANLINES, false),
      vfxQuality: null,
    };
    const migrated = migrateVfxQuality(legacy);
    SaveManager.saveSettings({ ...settings, vfxQuality: migrated });
  }
}

function migrateMetaSchema() {
  const raw = SaveManager.getJson(STORAGE.META, null);
  if (!raw || typeof raw !== 'object') {
    SaveManager.setJson(STORAGE.META, { schemaVersion: META_SCHEMA_VERSION });
    return;
  }
  if ((raw.schemaVersion ?? 0) >= META_SCHEMA_VERSION) return;
  const next = {
    ...raw,
    schemaVersion: META_SCHEMA_VERSION,
    cosmetics: raw.cosmetics ?? {
      owned: { hull: ['wood'], trail: ['comet'], theme: ['default'] },
      equipped: { hull: 'wood', trail: 'comet', theme: 'default' },
    },
    codex: raw.codex ?? { powers: [], gnomes: [], bricks: [] },
    stats: raw.stats ?? { knockouts: 0, combosCashed: 0, levelsCleared: 0 },
  };
  SaveManager.setJson(STORAGE.META, next);
}

/** Upgrade in-storage run snapshot v1 → v2 (safe field adds). */
export function upgradeRunSnapshot(snap) {
  if (!snap || typeof snap !== 'object') return null;
  if (snap.version === RUN_FORMAT_VERSION) return snap;
  if (snap.version !== 1) return null;

  return {
    ...snap,
    version: RUN_FORMAT_VERSION,
    powerDropSeq: snap.powerDropSeq ?? 0,
    brickDamage: Array.isArray(snap.brickDamage) ? snap.brickDamage : [],
    pendingGameOver: !!snap.pendingGameOver,
    migratedAt: Date.now(),
  };
}

function migrateRunFormat() {
  const snap = SaveManager.loadRun();
  if (!snap) return;
  const upgraded = upgradeRunSnapshot(snap);
  if (upgraded && upgraded !== snap) {
    SaveManager.saveRun(upgraded);
  }
}

/** Seed nn_haptics and nn_return_streak keys for legacy installs. */
function migrateLegacyPrefs() {
  try {
    if (localStorage.getItem(STORAGE.HAPTICS) === null) {
      SaveManager.setBool(STORAGE.HAPTICS, true);
    }
    if (localStorage.getItem(STORAGE.RETURN_STREAK) === null) {
      SaveManager.setNumber(STORAGE.RETURN_STREAK, 0);
    }
    if (localStorage.getItem(STORAGE.RETURN_STREAK_DATE) === null) {
      SaveManager.setString(STORAGE.RETURN_STREAK_DATE, '');
    }
  } catch {
    /* private mode */
  }
}

const MIGRATIONS = [
  {
    from: 0,
    to: 1,
    run() {
      migrateVfxFromLegacy();
      setSchemaVersion(1);
    },
  },
  {
    from: 1,
    to: 2,
    run() {
      migrateMetaSchema();
      migrateRunFormat();
      migrateLegacyPrefs();
      setSchemaVersion(2);
    },
  },
];

/**
 * Apply pending migrations. Sets `window.__neonSaveMigrated` when run completes.
 * @returns {{ from: number, to: number, runReset?: boolean }}
 */
export function runMigrations() {
  let version = getSchemaVersion();
  const start = version;

  for (const step of MIGRATIONS) {
    if (version === step.from) {
      try {
        step.run();
      } catch (e) {
        console.warn('[SaveMigration] step failed', step.from, '→', step.to, e);
      }
      version = step.to;
    }
  }

  if (version < CURRENT_SAVE_SCHEMA) {
    setSchemaVersion(CURRENT_SAVE_SCHEMA);
    version = CURRENT_SAVE_SCHEMA;
  }

  if (typeof window !== 'undefined') {
    window.__neonSaveMigrated = { from: start, to: version };
  }

  return { from: start, to: version };
}

export { RUN_FORMAT_VERSION, META_SCHEMA_VERSION };
