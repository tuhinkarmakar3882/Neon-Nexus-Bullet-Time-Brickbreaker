import { mulberry32 } from '../utils/Helpers.js';

/** Weekly rotating mutator — same for all players in a given ISO week. */
export const SEASONAL_MUTATORS = [
  { id: 'PotMonsoon', label: 'TWILIGHT BLOOM', desc: 'Pot monsoon week — double pots, double juggle score.' },
  { id: 'GlassFloor', label: 'GLASS GARDEN', desc: 'Glass floor week — one miss hurts, score ×1.5.' },
  { id: 'GnomeParliament', label: 'GNOME PARLIAMENT', desc: 'Extra gnomes, streak heals on knockout.' },
  { id: 'BrickBloom', label: 'VINE SEASON', desc: 'Destroyed bricks sprout blocking vines.' },
  { id: 'CannonsOnly', label: 'CANNON FEST', desc: 'Silver bricks need cannon damage.' },
];

export function seasonalMutatorForDate(d = new Date()) {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.floor((d - jan1) / (7 * 86400000));
  const rng = mulberry32((d.getFullYear() ^ week) >>> 0);
  return SEASONAL_MUTATORS[Math.floor(rng() * SEASONAL_MUTATORS.length)];
}
