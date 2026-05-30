import { mulberry32 } from '../utils/Helpers.js';

export const GOAL_TYPES = {
  clear: {
    label: 'CLEAR ALL',
    desc: 'Destroy every destructible brick.',
  },
  rescue: {
    label: 'RESCUE',
    desc: 'Knock out 2 gnomes before clearing the level.',
    target: 2,
  },
  silence: {
    label: 'SILENCE',
    desc: 'No pot may hit your paddle this level.',
  },
  nestHunt: {
    label: 'NEST HUNT',
    desc: 'Destroy every nest brick.',
  },
  escort: {
    label: 'ESCORT',
    desc: 'Protect the lantern brick until the garden is clear.',
  },
  bossPerch: {
    label: 'BOSS PERCH',
    desc: 'Knock the fortress gnome off its perch, then clear the level.',
    target: 1,
  },
};

export function pickLevelGoal(level, levelSeed, isBoss) {
  const rng = mulberry32((levelSeed ^ 0x90a1) >>> 0);
  if (isBoss) {
    if (rng() < 0.5) return { type: 'bossPerch', ...GOAL_TYPES.bossPerch };
    return { type: 'clear', ...GOAL_TYPES.clear };
  }
  if (level < 3 || rng() > 0.38) return { type: 'clear', ...GOAL_TYPES.clear };
  const pool = level >= 8
    ? ['rescue', 'silence', 'nestHunt', 'escort']
    : level >= 6
      ? ['rescue', 'silence', 'nestHunt']
      : ['rescue', 'silence'];
  const type = pool[Math.floor(rng() * pool.length)];
  return { type, ...GOAL_TYPES[type] };
}

export function goalProgressText(goal, state) {
  if (!goal || goal.type === 'clear') return '';
  if (goal.type === 'rescue') return `KNOCKOUTS ${state.knockouts ?? 0}/${goal.target ?? 2}`;
  if (goal.type === 'silence') return state.potHit ? 'POT HIT — FAIL' : 'POTS: 0 HITS';
  if (goal.type === 'nestHunt') return `NESTS ${state.nestsLeft ?? 0} LEFT`;
  if (goal.type === 'escort') return state.escortLost ? 'LANTERN LOST' : 'ESCORT SAFE';
  if (goal.type === 'bossPerch') return `FORTRESS K.O. ${state.knockouts ?? 0}/${goal.target ?? 1}`;
  return '';
}
