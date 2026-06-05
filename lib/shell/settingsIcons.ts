import type { IconNode } from 'lucide';
import { CreditCard, Link2, Music, SlidersHorizontal, Sparkles, Smartphone, Volume2, Waves } from 'lucide';

export const SETTINGS_ICONS = {
  graphics: Sparkles,
  audio: Volume2,
  music: Music,
  sfx: Volume2,
  ambience: Waves,
  purchases: CreditCard,
  links: Link2,
  quality: SlidersHorizontal,
  haptics: Smartphone,
} as const satisfies Record<string, IconNode>;
