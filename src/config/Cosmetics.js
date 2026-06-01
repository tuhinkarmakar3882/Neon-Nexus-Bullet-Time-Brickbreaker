/** Cosmetic catalog — gem prices, visual-only upgrades. */

/** @typedef {'hull'|'trail'|'theme'} CosmeticKind */

/**
 * @typedef {object} CosmeticItem
 * @property {string} id
 * @property {string} label
 * @property {number} cost
 * @property {boolean} premium
 * @property {string} desc — what changes in-game
 * @property {string} [effect] — short outcome line for shop UI
 * @property {number} [tint] — paddle / ball
 * @property {number} [accent] — garden backdrop accent
 */

/** @type {CosmeticItem[]} */
export const PADDLE_HULLS = [
  { id: 'wood', label: 'Carbon Nexus', cost: 0, tint: 0xffffff, premium: false,
    desc: 'Default carbon-fiber hull.', effect: 'Standard neon paddle look' },
  { id: 'brass', label: 'Brass Nexus', cost: 40, tint: 0xffd860, premium: false,
    desc: 'Brushed brass plating on the paddle body.', effect: 'Golden hull tint' },
  { id: 'moss', label: 'Moss Glass', cost: 65, tint: 0x56d364, premium: false,
    desc: 'Garden glass with moss-green refraction.', effect: 'Green glass hull' },
  { id: 'coral', label: 'Coral Flux', cost: 72, tint: 0xff8866, premium: false,
    desc: 'Warm coral energy along the paddle edges.', effect: 'Coral rim glow' },
  { id: 'violet', label: 'Violet Coil', cost: 88, tint: 0xaa77ff, premium: false,
    desc: 'Violet plasma coils under the hull surface.', effect: 'Purple hull pulse' },
  { id: 'obsidian', label: 'Obsidian Frost', cost: 95, tint: 0x8899cc, premium: true,
    desc: 'Frosted obsidian — cool blue-silver sheen.', effect: 'Premium frost hull' },
  { id: 'midnight', label: 'Midnight Alloy', cost: 110, tint: 0x334466, premium: true,
    desc: 'Deep midnight metal with faint star specks.', effect: 'Premium dark hull' },
];

/** @type {CosmeticItem[]} */
export const BALL_TRAILS = [
  { id: 'comet', label: 'Plasma Comet', cost: 0, tint: 0xffffff, premium: false,
    desc: 'Classic plasma streak behind the ball.', effect: 'Default comet trail' },
  { id: 'gold', label: 'Golden Hour', cost: 35, tint: 0xffd23d, premium: false,
    desc: 'Warm ember particles in the ball wake.', effect: 'Gold ember trail' },
  { id: 'rose', label: 'Rose Petal', cost: 50, tint: 0xff88aa, premium: false,
    desc: 'Soft rose shards scattered on motion.', effect: 'Pink shard trail' },
  { id: 'ember', label: 'Ember Wake', cost: 58, tint: 0xff6622, premium: false,
    desc: 'Fiery embers that flare on fast hits.', effect: 'Orange fire trail' },
  { id: 'frost', label: 'Frost Wake', cost: 68, tint: 0xaaddff, premium: false,
    desc: 'Icy crystals trailing cold motion.', effect: 'Cool crystal trail' },
  { id: 'nexus', label: 'Nexus Pulse', cost: 75, tint: 0x6699ff, premium: true,
    desc: 'Dense nexus plasma — strongest trail FX.', effect: 'Premium blue pulse' },
  { id: 'void', label: 'Void Ribbon', cost: 90, tint: 0x9966ff, premium: true,
    desc: 'Dark violet ribbon with bright core.', effect: 'Premium void trail' },
];

/** @type {CosmeticItem[]} */
export const GARDEN_THEMES = [
  { id: 'default', label: 'Neon Nexus', cost: 0, accent: 0x2fe6c7, premium: false,
    desc: 'Signature teal garden glow.', effect: 'Default arena accent' },
  { id: 'ember', label: 'Ember Shed', cost: 45, accent: 0xff6622, premium: false,
    desc: 'Warm ember tones on backdrop and grid.', effect: 'Orange garden mood' },
  { id: 'frost', label: 'Frost Arbor', cost: 60, accent: 0xaaddff, premium: false,
    desc: 'Cool frost highlights in the parallax garden.', effect: 'Icy blue garden' },
  { id: 'sunset', label: 'Sunset Canopy', cost: 70, accent: 0xffaa44, premium: false,
    desc: 'Golden-hour wash over nebula layers.', effect: 'Sunset gold accent' },
  { id: 'bloom', label: 'Bloom Terrace', cost: 78, accent: 0xff88cc, premium: false,
    desc: 'Soft magenta bloom in the background aurora.', effect: 'Pink garden bloom' },
  { id: 'neon', label: 'Neon Nexus', cost: 85, accent: 0x4488ff, premium: true,
    desc: 'Deep electric blue — premium garden palette.', effect: 'Premium blue garden' },
  { id: 'abyss', label: 'Abyss Grove', cost: 100, accent: 0x5533aa, premium: true,
    desc: 'Dark violet abyss with subtle star motes.', effect: 'Premium violet garden' },
];

export const COSMETIC_SECTIONS = [
  {
    kind: 'hull',
    title: 'PADDLE HULLS',
    blurb: 'Hull finishes change paddle color in the arena.',
    items: PADDLE_HULLS,
  },
  {
    kind: 'trail',
    title: 'BALL TRAILS',
    blurb: 'Motion trails behind each ball — distinct particle styles.',
    items: BALL_TRAILS,
  },
  {
    kind: 'theme',
    title: 'GARDEN THEMES',
    blurb: 'Arena accent color and backdrop mood for your run.',
    items: GARDEN_THEMES,
  },
];

export function cosmeticById(list, id) {
  return list.find((c) => c.id === id) ?? list[0];
}

export function cosmeticCatalog(kind) {
  if (kind === 'hull') return PADDLE_HULLS;
  if (kind === 'trail') return BALL_TRAILS;
  if (kind === 'theme') return GARDEN_THEMES;
  return [];
}
