/** Cosmetic catalog — gem prices, no gameplay advantage. */

export const PADDLE_HULLS = [
  { id: 'wood', label: 'Carbon Nexus', cost: 0, tint: 0xffffff, premium: false },
  { id: 'brass', label: 'Brass Nexus', cost: 40, tint: 0xffd860, premium: false },
  { id: 'moss', label: 'Moss Glass', cost: 65, tint: 0x56d364, premium: false },
  { id: 'obsidian', label: 'Obsidian Frost', cost: 95, tint: 0x8899cc, premium: true },
];

export const BALL_TRAILS = [
  { id: 'comet', label: 'Plasma Comet', cost: 0, tint: 0xffffff, premium: false },
  { id: 'gold', label: 'Golden Hour', cost: 35, tint: 0xffd23d, premium: false },
  { id: 'rose', label: 'Rose Petal', cost: 50, tint: 0xff88aa, premium: false },
  { id: 'nexus', label: 'Nexus Pulse', cost: 75, tint: 0x6699ff, premium: true },
];

export const GARDEN_THEMES = [
  { id: 'default', label: 'Neon Nexus', cost: 0, accent: 0x2fe6c7, premium: false },
  { id: 'ember', label: 'Ember Shed', cost: 45, accent: 0xff6622, premium: false },
  { id: 'frost', label: 'Frost Arbor', cost: 60, accent: 0xaaddff, premium: false },
  { id: 'neon', label: 'Neon Nexus', cost: 85, accent: 0x4488ff, premium: true },
];

export function cosmeticById(list, id) {
  return list.find((c) => c.id === id) ?? list[0];
}
