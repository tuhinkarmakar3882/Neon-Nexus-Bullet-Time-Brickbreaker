/**
 * Sync engine — push/pull local saves to MongoDB via Vercel API when signed in.
 */
import { Capacitor } from '@capacitor/core';
import { getIdToken, isFirebaseConfigured } from '@/lib/auth/firebaseClient';
import { buildLocalSaveDocument, applySaveDocument } from '@/lib/persistence/saveDocument';
import { mergeSaveDocuments } from '@/lib/persistence/mergeMeta';
import { getSyncState, setSyncState, markDirty } from '@/lib/persistence/Persistence';
import type { PlayerSaveDocument } from '@/lib/persistence/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';
const DEBOUNCE_MS = 3000;
const PERIODIC_MS = 5 * 60 * 1000;
const PULL_IDLE_MS = 10 * 60 * 1000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
let syncing = false;
let signedIn = false;

export function setSyncSignedIn(value: boolean): void {
  signedIn = value;
  if (value) {
    startPeriodicSync();
  } else if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
}

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  if (!token) throw new Error('Not signed in');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function pullRemote(): Promise<PlayerSaveDocument | null> {
  const headers = await authHeaders();
  const res = await fetch(apiUrl('/api/saves/me'), { headers, method: 'GET' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Pull failed (${res.status})`);
  return res.json();
}

async function pushRemote(doc: PlayerSaveDocument, expectedRevision: number): Promise<PlayerSaveDocument> {
  const headers = await authHeaders();
  const res = await fetch(apiUrl('/api/saves/me'), {
    method: 'PUT',
    headers,
    body: JSON.stringify({ ...doc, expectedRevision }),
  });
  if (res.status === 409) {
    const remote = await res.json();
    const local = buildLocalSaveDocument();
    local.revision = getSyncState().revision;
    const merged = mergeSaveDocuments(local, remote);
    return pushRemote(merged, remote.revision ?? 0);
  }
  if (!res.ok) throw new Error(`Push failed (${res.status})`);
  return res.json();
}

export async function syncNow(opts: { pullFirst?: boolean; includeRun?: boolean } = {}): Promise<boolean> {
  if (!signedIn || !isFirebaseConfigured()) return false;
  if (syncing) return false;
  syncing = true;
  try {
    let remote: PlayerSaveDocument | null = null;
    if (opts.pullFirst !== false) {
      remote = await pullRemote();
    }
    const local = buildLocalSaveDocument();
    const state = getSyncState();
    local.revision = state.revision;

    if (remote) {
      const merged = mergeSaveDocuments(local, remote);
      applySaveDocument(merged);
      const pushed = await pushRemote(merged, remote.revision ?? 0);
      setSyncState({
        revision: pushed.revision ?? merged.revision,
        dirty: false,
        lastPushedAt: Date.now(),
        lastPulledAt: Date.now(),
        lastSyncError: null,
      });
    } else {
      const pushed = await pushRemote(local, 0);
      setSyncState({
        revision: pushed.revision ?? 1,
        dirty: false,
        lastPushedAt: Date.now(),
        lastPulledAt: Date.now(),
        lastSyncError: null,
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('neon:save-synced'));
    }
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sync failed';
    setSyncState({ lastSyncError: msg, dirty: true });
    console.warn('[SyncEngine]', msg);
    return false;
  } finally {
    syncing = false;
  }
}

export function schedulePush(): void {
  if (!signedIn) return;
  markDirty();
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync?.register('neon-save-push'))
      .catch(() => {});
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNow({ pullFirst: false });
  }, DEBOUNCE_MS);
}

export function pushRunSnapshot(): void {
  if (!signedIn) return;
  schedulePush();
}

export function startPeriodicSync(): void {
  if (periodicTimer || !signedIn) return;
  periodicTimer = setInterval(() => {
    const state = getSyncState();
    const idle = state.lastPulledAt ? Date.now() - state.lastPulledAt > PULL_IDLE_MS : true;
    if (state.dirty || idle) {
      void syncNow({ pullFirst: idle });
    }
  }, PERIODIC_MS);
}

export async function syncIfSignedIn(): Promise<void> {
  if (signedIn) await syncNow({ pullFirst: true });
}

export function attachSyncLifecycle(): void {
  if (typeof window === 'undefined') return;

  const onVisible = () => {
    if (document.visibilityState === 'visible' && signedIn) {
      void syncNow({ pullFirst: true });
    }
  };
  document.addEventListener('visibilitychange', onVisible);

  const onPageHide = () => {
    if (!signedIn) return;
    const state = getSyncState();
    if (!state.dirty) return;
    void getIdToken().then((token) => {
      if (!token) return;
      const doc = buildLocalSaveDocument();
      doc.revision = state.revision;
      const body = JSON.stringify({ ...doc, expectedRevision: state.revision });
      navigator.sendBeacon?.(
        apiUrl('/api/saves/me'),
        new Blob([body], { type: 'application/json' }),
      );
    });
  };
  window.addEventListener('pagehide', onPageHide);

  if (Capacitor.isNativePlatform()) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && signedIn) void syncNow({ pullFirst: true });
      });
    }).catch(() => {});
  }
}

export function onFirstSignIn(): Promise<boolean> {
  return syncNow({ pullFirst: true });
}
