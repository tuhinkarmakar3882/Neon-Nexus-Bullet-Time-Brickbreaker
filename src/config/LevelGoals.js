import { mulberry32 } from '../utils/Helpers.js';

/** Primary win condition for almost every level — destroy all destructible bricks. */
export const GOAL_TYPES = {
  clear: {
    label: 'CLEAR ALL',
    desc: 'Destroy every destructible brick.',
    primary: true,
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

const BONUS_GOAL_POOL = ['rescue', 'silence', 'nestHunt', 'escort'];

/** ~90% clear-all; rare bonus objectives on higher levels for variety. */
export function pickLevelGoal(level, levelSeed, isBoss) {
  const rng = mulberry32((levelSeed ^ 0x90a1) >>> 0);
  if (isBoss) {
    if (rng() < 0.15) return { type: 'bossPerch', ...GOAL_TYPES.bossPerch };
    return { type: 'clear', ...GOAL_TYPES.clear };
  }
  if (level < 8 || rng() > 0.1) return { type: 'clear', ...GOAL_TYPES.clear };
  const pool = level >= 14 ? BONUS_GOAL_POOL : BONUS_GOAL_POOL.filter((t) => t !== 'escort' && t !== 'nestHunt');
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
