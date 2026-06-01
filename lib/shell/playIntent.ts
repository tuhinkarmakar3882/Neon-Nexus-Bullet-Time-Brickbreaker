import type { NeonPlayIntent, PlayIntentMode } from '@/types/global';

const KEY = 'neon-play-intent';

export function setPlayIntent({ mode = 'new', extra = {} }: { mode?: PlayIntentMode; extra?: Record<string, unknown> } = {}): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(KEY, JSON.stringify({ mode, extra, ts: Date.now() }));
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
