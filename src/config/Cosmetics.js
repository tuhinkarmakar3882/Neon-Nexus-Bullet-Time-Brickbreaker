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
  { id: 'brass', label: 'Brass Nexus', cost: 55, tint: 0xffd860, premium: false,
    desc: 'Brushed brass plating on the paddle body.', effect: 'Golden hull tint' },
  { id: 'moss', label: 'Moss Glass', cost: 90, tint: 0x56d364, premium: false,
    desc: 'Garden glass with moss-green refraction.', effect: 'Green glass hull' },
  { id: 'coral', label: 'Coral Flux', cost: 100, tint: 0xff8866, premium: false,
    desc: 'Warm coral energy along the paddle edges.', effect: 'Coral rim glow' },
  { id: 'violet', label: 'Violet Coil', cost: 125, tint: 0xaa77ff, premium: false,
    desc: 'Violet plasma coils under the hull surface.', effect: 'Purple hull pulse' },
  { id: 'chrome', label: 'Chrome Mirror', cost: 75, tint: 0xccddee, premium: false,
    desc: 'Polished chrome with mirror highlights.', effect: 'Silver mirror hull' },
  { id: 'sage', label: 'Sage Lattice', cost: 85, tint: 0x88cc99, premium: false,
    desc: 'Garden sage weave under glass panels.', effect: 'Soft sage hull' },
  { id: 'crimson', label: 'Crimson Forge', cost: 95, tint: 0xdd4455, premium: false,
    desc: 'Heat-forged crimson alloy with ember veins.', effect: 'Red forge hull' },
  { id: 'obsidian', label: 'Obsidian Frost', cost: 135, tint: 0x8899cc, premium: true,
    desc: 'Frosted obsidian — cool blue-silver sheen.', effect: 'Premium frost hull' },
  { id: 'midnight', label: 'Midnight Alloy', cost: 155, tint: 0x334466, premium: true,
    desc: 'Deep midnight metal with faint star specks.', effect: 'Premium dark hull' },
];

/** @type {CosmeticItem[]} */
export const BALL_TRAILS = [
  { id: 'comet', label: 'Plasma Comet', cost: 0, tint: 0xffffff, premium: false,
    desc: 'Classic plasma streak behind the ball.', effect: 'Default comet trail' },
  { id: 'gold', label: 'Golden Hour', cost: 50, tint: 0xffd23d, premium: false,
    desc: 'Warm ember particles in the ball wake.', effect: 'Gold ember trail' },
  { id: 'rose', label: 'Rose Petal', cost: 70, tint: 0xff88aa, premium: false,
    desc: 'Soft rose shards scattered on motion.', effect: 'Pink shard trail' },
  { id: 'ember', label: 'Ember Wake', cost: 80, tint: 0xff6622, premium: false,
    desc: 'Fiery embers that flare on fast hits.', effect: 'Orange fire trail' },
  { id: 'frost', label: 'Frost Wake', cost: 95, tint: 0xaaddff, premium: false,
    desc: 'Icy crystals trailing cold motion.', effect: 'Cool crystal trail' },
  { id: 'spark', label: 'Spark Shower', cost: 65, tint: 0xffee88, premium: false,
    desc: 'Bright sparks scatter on every bounce.', effect: 'Yellow spark trail' },
  { id: 'mist', label: 'Garden Mist', cost: 75, tint: 0x88ddcc, premium: false,
    desc: 'Soft teal mist wisps in the ball wake.', effect: 'Misty teal trail' },
  { id: 'prism', label: 'Prism Split', cost: 90, tint: 0xcc88ff, premium: false,
    desc: 'Rainbow shards split on fast motion.', effect: 'Prismatic trail' },
  { id: 'nexus', label: 'Nexus Pulse', cost: 105, tint: 0x6699ff, premium: true,
    desc: 'Dense nexus plasma — strongest trail FX.', effect: 'Premium blue pulse' },
  { id: 'void', label: 'Void Ribbon', cost: 125, tint: 0x9966ff, premium: true,
    desc: 'Dark violet ribbon with bright core.', effect: 'Premium void trail' },
];

/** @type {CosmeticItem[]} */
export const GARDEN_THEMES = [
  { id: 'default', label: 'Neon Nexus', cost: 0, accent: 0x2fe6c7, premium: false,
    desc: 'Signature teal garden glow.', effect: 'Default arena accent' },
  { id: 'ember', label: 'Ember Shed', cost: 65, accent: 0xff6622, premium: false,
    desc: 'Warm ember tones on backdrop and grid.', effect: 'Orange garden mood' },
  { id: 'frost', label: 'Frost Arbor', cost: 85, accent: 0xaaddff, premium: false,
    desc: 'Cool frost highlights in the parallax garden.', effect: 'Icy blue garden' },
  { id: 'sunset', label: 'Sunset Canopy', cost: 98, accent: 0xffaa44, premium: false,
    desc: 'Golden-hour wash over nebula layers.', effect: 'Sunset gold accent' },
  { id: 'bloom', label: 'Bloom Terrace', cost: 110, accent: 0xff88cc, premium: false,
    desc: 'Soft magenta bloom in the background aurora.', effect: 'Pink garden bloom' },
  { id: 'dawn', label: 'Dawn Terrace', cost: 70, accent: 0xffccaa, premium: false,
    desc: 'Peach dawn light over the twilight grid.', effect: 'Warm dawn accent' },
  { id: 'moss', label: 'Moss Canopy', cost: 80, accent: 0x66bb88, premium: false,
    desc: 'Deep garden moss tones in the parallax layers.', effect: 'Verdant moss garden' },
  { id: 'storm', label: 'Storm Nexus', cost: 95, accent: 0x6688cc, premium: false,
    desc: 'Electric storm blues ripple through the arena.', effect: 'Storm blue garden' },
  { id: 'neon', label: 'Neon Nexus', cost: 120, accent: 0x4488ff, premium: true,
    desc: 'Deep electric blue — premium garden palette.', effect: 'Premium blue garden' },
  { id: 'abyss', label: 'Abyss Grove', cost: 140, accent: 0x5533aa, premium: true,
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

/** Sanitize equipped ids — unknown or unowned ids fall back to first owned / catalog default. */
export function resolveEquippedCosmetics(equipped = {}, owned = {}) {
  const pick = (kind, list) => {
    const ownedIds = owned[kind] ?? [];
    const fallback = ownedIds[0] ?? list[0]?.id ?? 'default';
    const id = equipped[kind];
    if (!list.some((c) => c.id === id)) return fallback;
    return ownedIds.includes(id) ? id : fallback;
  };
  return {
    hull: pick('hull', PADDLE_HULLS),
    trail: pick('trail', BALL_TRAILS),
    theme: pick('theme', GARDEN_THEMES),
  };
}

export function cosmeticCatalog(kind) {
  if (kind === 'hull') return PADDLE_HULLS;
  if (kind === 'trail') return BALL_TRAILS;
  if (kind === 'theme') return GARDEN_THEMES;
  return [];
}

export function cosmeticLabel(kind, id) {
  const list = cosmeticCatalog(kind);
  return list.find((c) => c.id === id)?.label ?? id;
}
