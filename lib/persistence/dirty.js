import { getItem, setItem } from './LocalStore.js';

export const SYNC_STATE_KEY = '__neon_sync_state';
export const NUDGE_STATE_KEY = '__neon_nudge_state';

const DEFAULT_SYNC = {
  revision: 0,
  dirty: false,
  lastPushedAt: null,
  lastPulledAt: null,
  lastSyncError: null,
};

/** Mark local save dirty for cloud sync (no-op if sync state unreadable). */
export function markDirty() {
  try {
    const raw = getItem(SYNC_STATE_KEY, null);
    const state = raw ? { ...DEFAULT_SYNC, ...JSON.parse(raw) } : { ...DEFAULT_SYNC };
    state.dirty = true;
    setItem(SYNC_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function readSyncState() {
  try {
    const raw = getItem(SYNC_STATE_KEY, null);
    if (!raw) return { ...DEFAULT_SYNC };
    return { ...DEFAULT_SYNC, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SYNC };
  }
}

export function writeSyncState(patch) {
  const next = { ...readSyncState(), ...patch };
  setItem(SYNC_STATE_KEY, JSON.stringify(next));
  return next;
}
