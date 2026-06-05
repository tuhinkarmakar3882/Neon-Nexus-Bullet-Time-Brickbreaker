import type { NeonPlayIntent, PlayIntentMode } from '@/types/global';

const KEY = 'neon-play-intent';
/** Survives intent consumption until GameScene starts — prevents stale autosave from restoring an old run. */
const FORCE_NEW_KEY = 'neon-play-force-new';
/** Set when leaving /play/ for hub — enables warm resume within the same browser session. */
const HUB_SESSION_KEY = 'neon-hub-session-ts';
const HUB_SESSION_TTL_MS = 30 * 60 * 1000;

export function setPlayIntent({ mode = 'new', extra = {} }: { mode?: PlayIntentMode; extra?: Record<string, unknown> } = {}): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(KEY, JSON.stringify({ mode, extra, ts: Date.now() }));
  if (extra.forceNew === true) {
    sessionStorage.setItem(FORCE_NEW_KEY, '1');
  }
}

export function peekForceNew(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(FORCE_NEW_KEY) === '1';
}

export function consumeForceNew(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  const forced = sessionStorage.getItem(FORCE_NEW_KEY) === '1';
  if (forced) sessionStorage.removeItem(FORCE_NEW_KEY);
  return forced;
}

/** Mark hub return after tearing down Phaser — used to optimize hub→play resume boot. */
export function markHubSessionActive(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(HUB_SESSION_KEY, String(Date.now()));
}

export function clearHubSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(HUB_SESSION_KEY);
}

/** Recent hub visit in this tab (full page reload still required — see routes.ts). */
export function isHubSessionWarm(maxAgeMs = HUB_SESSION_TTL_MS): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  const ts = Number(sessionStorage.getItem(HUB_SESSION_KEY));
  return Number.isFinite(ts) && Date.now() - ts < maxAgeMs;
}

function parseIntent(raw: string | null): { mode: PlayIntentMode; extra: Record<string, unknown> } {
  if (!raw) return { mode: 'new', extra: {} };
  try {
    const parsed = JSON.parse(raw) as NeonPlayIntent;
    return {
      mode: parsed.mode === 'resume' ? 'resume' : 'new',
      extra: parsed.extra && typeof parsed.extra === 'object' ? parsed.extra : {},
    };
  } catch {
    return { mode: 'new', extra: {} };
  }
}

/** Read intent without clearing sessionStorage (safe for React Strict Mode double-mount). */
export function peekPlayIntent(): { mode: PlayIntentMode; extra: Record<string, unknown> } {
  if (typeof sessionStorage === 'undefined') return { mode: 'new', extra: {} };
  return parseIntent(sessionStorage.getItem(KEY));
}

/** Clear stored intent after PreloadScene has consumed it. */
export function consumePlayIntent(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(KEY);
}

/** @deprecated Prefer peekPlayIntent + consumePlayIntent */
export function readPlayIntent(): { mode: PlayIntentMode; extra: Record<string, unknown> } {
  const intent = peekPlayIntent();
  consumePlayIntent();
  return intent;
}
