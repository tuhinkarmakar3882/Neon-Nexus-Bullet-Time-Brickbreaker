import type { IconNode } from 'lucide';
import { CreditCard, Link2, Music, SlidersHorizontal, Sparkles, Volume2 } from 'lucide';

export const SETTINGS_ICONS = {
  graphics: Sparkles,
  audio: Volume2,
  music: Music,
  sfx: Volume2,
  purchases: CreditCard,
  links: Link2,
  quality: SlidersHorizontal,
} as const satisfies Record<string, IconNode>;
