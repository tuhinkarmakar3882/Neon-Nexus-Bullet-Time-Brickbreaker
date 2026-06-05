import { getItem, setItem, initLocalStore, isLocalStoreReady } from './LocalStore.js';
import {
  NUDGE_STATE_KEY,
  markDirty,
  readSyncState,
  writeSyncState,
} from './dirty.js';
import type { NudgeState, SyncState } from './types';

export { SYNC_STATE_KEY, NUDGE_STATE_KEY, markDirty } from './dirty.js';

const DEFAULT_NUDGE: NudgeState = {
  dismissedAt: null,
  showCount: 0,
  shownThisSession: false,
};

let initPromise: Promise<void> | null = null;

export async function initPersistence(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = initLocalStore();
  await initPromise;
}

export function isPersistenceReady(): boolean {
  return isLocalStoreReady();
}

export function getSyncState(): SyncState {
  return readSyncState() as SyncState;
}

export function setSyncState(state: Partial<SyncState>): SyncState {
  return writeSyncState(state) as SyncState;
}

export function getNudgeState(): NudgeState {
  try {
    const raw = getItem(NUDGE_STATE_KEY, null);
    if (!raw) return { ...DEFAULT_NUDGE };
    return { ...DEFAULT_NUDGE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NUDGE };
  }
}

export function setNudgeState(state: Partial<NudgeState>): NudgeState {
  const next = { ...getNudgeState(), ...state };
  setItem(NUDGE_STATE_KEY, JSON.stringify(next));
  return next;
}
