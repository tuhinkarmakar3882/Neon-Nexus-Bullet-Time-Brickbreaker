import { mulberry32 } from '../utils/Helpers.js';

/** Per-level optional contract — bonus power on completion. */
export function rollContract(level, levelSeed) {
  const rng = mulberry32((levelSeed ^ 0xc07ac7) >>> 0);
  if (level < 4 || rng() > 0.55) return null;
  const tier = level >= 12 && rng() < 0.35 ? 'elite' : 'normal';
  const types = [
    {
      id: 'noPotHit',
      label: 'CLEAN GARDEN',
      desc: 'Complete without a pot hitting paddle → rare power',
      reward: 'rare',
    },
    {
      id: 'knockoutElite',
      label: 'ELITE BOUNTY',
      desc: tier === 'elite' ? 'Knock out 1 Elite gnome → guaranteed rare' : 'Knock out 2 gnomes → bonus power',
      tier,
      target: tier === 'elite' ? 1 : 2,
      reward: 'rare',
    },
    {
      id: 'juggleChain',
      label: 'JUGGLE MASTER',
      desc: 'Land a 4-hit juggle → instant power draft pip',
      target: 4,
      reward: 'draftPip',
    },
  ];
  return types[Math.floor(rng() * types.length)];
}
