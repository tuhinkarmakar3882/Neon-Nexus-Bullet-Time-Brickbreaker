// In-game guide copy (Codex / help overlay).

export const HOW_TO_PLAY = {
  title: 'GARDEN FIELD GUIDE',
  subtitle: 'Twilight Garden · Jardinains Siege',
  basics: [
    'Tap or click to launch the ball. Move finger or mouse to slide the paddle.',
    'Center hits reflect straight up; edge hits angle up to 30°. Speed rises slightly on each paddle return.',
    'Jardinains pop up on bricks during play and lob pots at your paddle.',
    'Knock one off for a chance to drop a power-up; juggle three times to pop it into a guaranteed capsule.',
    'Juggle falling gnomes on your paddle for escalating score (chain capped at 7).',
    'Catch capsules with your paddle. Gold and steel bricks need Laser, Electric, or Explosive.',
    'Combo chains raise your score multiplier every 8 hits (up to ×3).',
  ],
  sections: [
    {
      title: 'Paddle & Cannons',
      color: 'paddle',
      lines: [
        'Cannons — fire, ice, shock, napalm & laser all auto-fire from the paddle.',
        'Catch — sticky paddle; tap again to release and re-aim.',
        'Expand / Reduce — wider or narrower paddle.',
        'Magnet pulls capsules toward you. Flip reverses controls (grab again to fix).',
      ],
    },
    {
      title: 'Ball Modifiers',
      color: 'ball',
      lines: [
        'Only one ball modifier at a time — latest pickup replaces the old one.',
        'Explosive — 3×3 blast. Nuke — cross wipe. Electric — one-hit any brick.',
        'Frozen — shatters bricks and spreads frost. Ball Splitter doubles active balls.',
      ],
    },
    {
      title: 'Garden Effects',
      color: 'env',
      lines: [
        'Earthquake knocks every gnome off their brick. Time Freeze locks them mid-air.',
        'Shield — one safety bounce. Extra Paddle — bonus life. Instant Win clears the level.',
        'Black Hole, Brick Freeze, Squeeze, Shuffle, and Joker — field wildcards.',
      ],
    },
  ],
  gnomeTiers: [
    'Normal — standard flowerpot drops.',
    'Heavy — anchors shrink paddle width (−15%, stacks).',
    'Speed — rapid throws, fast climb-back.',
    'Elite — tracking shots; may scramble controls or UI.',
  ],
};
