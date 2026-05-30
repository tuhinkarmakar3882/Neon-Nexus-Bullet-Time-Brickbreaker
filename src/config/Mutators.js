/** Level mutator copy for intro card + HUD. */

export const MUTATOR_INFO = {
  FastBall: {
    label: 'FAST BALL',
    desc: 'Ball speed +15% for this level.',
    color: 0xff8844,
  },
  LowVisibility: {
    label: 'MIST',
    desc: 'Arena dimmed — harder to read hazards.',
    color: 0x8899aa,
  },
  DoubleJardinains: {
    label: 'GNOME DOUBLE',
    desc: 'Twice the gnome pop-up pressure.',
    color: 0x7eb87a,
  },
  NarrowArena: {
    label: 'NARROW',
    desc: 'Paddle starts 25% narrower.',
    color: 0xff6b7a,
  },
  WideArena: {
    label: 'WIDE GARDEN',
    desc: 'Wider paddle, slightly faster movement.',
    color: 0x6699ff,
  },
  GnomeSwarm: {
    label: 'GNOME SWARM',
    desc: 'More gnomes spawn during play.',
    color: 0xd45d8c,
  },
  BrickFrenzy: {
    label: 'BRICK FRENZY',
    desc: 'Enemies spawn faster this level.',
    color: 0xffd23d,
  },
  HeavyGravity: {
    label: 'HEAVY GRAVITY',
    desc: 'Pots & power-ups fall faster.',
    color: 0xc084fc,
  },
  PotMonsoon: {
    label: 'POT MONSOON',
    desc: 'Pots fall 2× rate — juggle points 2×.',
    color: 0xff6644,
  },
  GlassFloor: {
    label: 'GLASS FLOOR',
    desc: 'One miss = life lost — score ×1.5 this level.',
    color: 0xa8e0ff,
  },
  CannonsOnly: {
    label: 'CANNONS ONLY',
    desc: 'Silver bricks need laser/cannon damage.',
    color: 0xffaa44,
  },
  GnomeParliament: {
    label: 'GNOME PARLIAMENT',
    desc: '+2 max gnomes — each knockout heals streak.',
    color: 0x7eb87a,
  },
  BrickBloom: {
    label: 'BRICK BLOOM',
    desc: 'Destroyed bricks sprout blocking vines 3s.',
    color: 0x55aa66,
  },
};

export function mutatorDisplay(id) {
  const m = MUTATOR_INFO[id];
  if (!m) return { label: id, desc: '', color: 0xffd23d };
  return m;
}
