const FTUE_HOME_KEY = 'nn_ftue_home_v2';
const FTUE_POWER_KEY = 'nn_ftue_power_v1';
const FTUE_NEXUS_KEY = 'nn_ftue_nexus_v1';

export const FTUE_HOME_STEPS = [
  {
    title: 'Launch & move',
    body: 'Tap, click, or press Space to launch the ball. Slide your finger or use ← / → to move the paddle.',
  },
  {
    title: 'Clear the garden',
    body: 'Break every brick to advance. Center hits send the ball straight up; edge hits angle your shots.',
  },
  {
    title: 'Watch the Nains',
    body: 'Jardinains cling to bricks and throw pots. Knock them loose — juggle falling Nains on your paddle for bonus points and power drops.',
  },
  {
    title: 'Catch power capsules',
    body: 'Capsules change your paddle and ball. Catch them with your paddle; some bricks need Laser, Electric, or Explosive power to break.',
  },
  {
    title: 'Nexus bullet-time',
    body: 'Fill the Nexus meter on the right, then double-tap (or double-tap Space) to slow time and line up clutch shots.',
  },
  {
    title: 'Earn & spend gems',
    body: 'Clear levels with stars to earn gems. Visit Garden Shop from the hub to unlock hull, trail, and garden cosmetics.',
  },
] as const;

export const FTUE_POWER_TIP =
  'Side meters charge as you play — tap Gnome or Nexus when they glow for clutch plays.';

export const FTUE_NEXUS_TIP =
  'Nexus charged — double-tap (or double-tap Space) to slow time and line up your shot.';

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

export function hasSeenPowerCoach(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(FTUE_POWER_KEY) === '1';
  } catch {
    return true;
  }
}

export function markPowerCoachSeen(): void {
  try {
    localStorage.setItem(FTUE_POWER_KEY, '1');
  } catch {
    /* private mode */
  }
}

export function hasSeenNexusCoach(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(FTUE_NEXUS_KEY) === '1';
  } catch {
    return true;
  }
}

export function markNexusCoachSeen(): void {
  try {
    localStorage.setItem(FTUE_NEXUS_KEY, '1');
  } catch {
    /* private mode */
  }
}
