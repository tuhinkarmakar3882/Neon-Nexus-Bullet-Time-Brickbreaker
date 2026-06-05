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
    return localStorage.getItem(FTUE_HOME_KEY) === '1';
  } catch {
    return true;
  }
}

export function markHomeFtueSeen(): void {
  try {
    localStorage.setItem(FTUE_HOME_KEY, '1');
  } catch {
    /* private mode */
  }
}
