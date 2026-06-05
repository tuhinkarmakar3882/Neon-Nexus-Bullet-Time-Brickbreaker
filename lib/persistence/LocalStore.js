/**
 * IndexedDB-backed key-value store with synchronous in-memory cache.
 * All reads/writes are instant after init(); IDB writes are async.
 */
import { openDB } from 'idb';
import { STORAGE } from '../../src/config/Constants.js';

const DB_NAME = 'neon-persistence';
const KV_STORE = 'kv';

/** @type {Record<string, string>} */
const cache = {};
/** @type {ReturnType<typeof openDB> | null} */
let dbPromise = null;
let initialized = false;
/** @type {Set<string>} */
const pendingWrites = new Set();
/** @type {ReturnType<typeof setTimeout> | null} */
let flushTimer = null;

export const LEGACY_MIGRATION_KEYS = [
  ...Object.values(STORAGE),
  'nn_ftue_home_v2',
  'nn_journal_toasted',
  'neon_pending_entitlement',
  'neon_stripe_session',
];

export function isLocalStoreReady() {
  return initialized;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPending();
  }, 16);
}

async function flushPending() {
  if (!dbPromise || pendingWrites.size === 0) return;
  const keys = [...pendingWrites];
  pendingWrites.clear();
  try {
    const db = await dbPromise;
    const tx = db.transaction(KV_STORE, 'readwrite');
    for (const key of keys) {
      if (key in cache) {
        await tx.store.put(cache[key], key);
      } else {
        await tx.store.delete(key);
      }
    }
    await tx.done;
  } catch (e) {
    console.warn('[LocalStore] flush failed', e);
    keys.forEach((k) => pendingWrites.add(k));
  }
}

/**
 * @param {string} key
 * @param {string | null} [fallback]
 */
export function getItem(key, fallback = null) {
  if (key in cache) return cache[key];
  return fallback;
}

/**
 * @param {string} key
 * @param {string} value
 */
export function setItem(key, value) {
  cache[key] = String(value);
  pendingWrites.add(key);
  scheduleFlush();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('neon:storage', { detail: { key } }));
  }
}

/** @param {string} key */
export function removeItem(key) {
  delete cache[key];
  pendingWrites.add(key);
  scheduleFlush();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('neon:storage', { detail: { key } }));
  }
}

/** @returns {Promise<void>} */
export async function initLocalStore() {
  if (initialized) return;

  if (typeof indexedDB !== 'undefined') {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(KV_STORE)) {
          db.createObjectStore(KV_STORE);
        }
      },
    });

    const db = await dbPromise;
    const keys = await db.getAllKeys(KV_STORE);
    for (const key of keys) {
      const val = await db.get(KV_STORE, key);
      if (val != null) cache[String(key)] = String(val);
    }
  }

  if (typeof localStorage !== 'undefined') {
    for (const key of LEGACY_MIGRATION_KEYS) {
      if (key in cache) continue;
      try {
        const legacy = localStorage.getItem(key);
        if (legacy !== null) {
          cache[key] = legacy;
          if (dbPromise) {
            const db = await dbPromise;
            await db.put(KV_STORE, legacy, key);
          }
          localStorage.removeItem(key);
        }
      } catch {
        /* private mode */
      }
    }
  }

  initialized = true;
}

/** @returns {Record<string, string>} */
export function dumpCache() {
  return { ...cache };
}

/** For tests — seed cache + IDB */
export async function __testSeed(entries) {
  await initLocalStore();
  for (const [key, value] of Object.entries(entries)) {
    setItem(key, String(value));
  }
  await flushPending();
}
