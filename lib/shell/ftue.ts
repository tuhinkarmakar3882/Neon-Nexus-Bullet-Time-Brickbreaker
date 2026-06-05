import { getItem, setItem } from '@/lib/persistence/LocalStore.js';

const FTUE_HOME_KEY = 'nn_ftue_home_v2';

export const FTUE_HOME_STEPS = [
  {
    title: 'Launch & move',
    body: 'Tap, click, or press Space to launch the ball. Slide your finger or use ← / → to move the paddle.',
  },
  {
    title: 'Clear the garden',
    body: 'Break every brick to advance. Knock Jardinains loose for bonus points, power drops, and Nexus meter.',
  },
  {
    title: 'Earn garden gems',
    body: 'Clear levels with stars to earn gems. Spend them in Garden Shop for hull, trail, and theme cosmetics.',
  },
] as const;

export function hasSeenHomeFtue(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (getItem(FTUE_HOME_KEY, null) === '1') return true;
    // Sync fallback — home can mount before IndexedDB cache hydrates.
    if (typeof localStorage !== 'undefined' && localStorage.getItem(FTUE_HOME_KEY) === '1') {
      setItem(FTUE_HOME_KEY, '1');
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Wait for persistence, then decide if the home FTUE should appear. */
export async function shouldShowHomeFtue(): Promise<boolean> {
  const { initPersistence } = await import('@/lib/persistence/Persistence');
  await initPersistence();
  return !hasSeenHomeFtue();
}

export function markHomeFtueSeen(): void {
  try {
    setItem(FTUE_HOME_KEY, '1');
  } catch {
    /* private mode */
  }
}
