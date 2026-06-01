// In-game guide copy (Codex) — keep in sync with garden mechanics.

export const HOW_TO_PLAY = {
  title: 'FIELD MANUAL',
  subtitle: 'Twilight Garden · Jardinain Siege',
  basics: [
    'Tap, click, or press Space / Enter to launch the ball. Move your pointer, finger, or ← / → keys to slide the paddle.',
    'P or Esc opens pause; press again to resume. Double-tap or double-tap Space to spend Nexus slow-mo when the meter is full.',
    'Center hits send the ball straight up; edge hits angle up to 30°. Each return adds a little speed.',
    'Jardinains cling to bricks and throw pots at your paddle. Knock them loose for power-up chances.',
    'Juggle a falling Jardinain on your paddle up to seven times for escalating bonus points.',
    'Three juggles on one gnome guarantees a power capsule when it pops.',
    'Catch capsules with your paddle. Gold and steel bricks need Laser, Electric, or Explosive power.',
    'Build combo chains: every eight consecutive hits raises your score multiplier, up to ×3.',
  ],
  sections: [
    {
      title: 'Paddle & Cannons',
      color: 'paddle',
      lines: [
        'Cannons — Fire, Ice, Shock, Napalm, and Laser fire automatically from your paddle.',
        'Catch — Sticky paddle; tap again to release and re-aim.',
        'Expand / Reduce — Widen or narrow your paddle.',
        'Magnet — Pulls capsules toward you. Paddle Spikes — Top spikes block pots, anchors, and enemies.',
        'Flip inverts controls until you grab another capsule.',
      ],
    },
    {
      title: 'Ball Modifiers',
      color: 'ball',
      lines: [
        'Only one ball modifier at a time — the latest pickup replaces the previous one.',
        'Explosive — Destroys bricks in a 3×3 area. Nuke — Clears a cross pattern.',
        'Electric — Breaks any brick in one hit. Frozen — Shatters bricks and spreads frost.',
        'Ball Splitter — Adds a second active ball.',
      ],
    },
    {
      title: 'Garden Effects',
      color: 'env',
      lines: [
        'Earthquake — Knocks every Jardinain off its brick. Time Freeze — Holds gnomes in place.',
        'Shield — One safety bounce at the floor. Extra Paddle — Grants an additional life.',
        'Instant Win — Clears the current level. Black Hole, Brick Freeze, Squeeze, Shuffle, and Joker reshape the field.',
      ],
    },
  ],
  gnomeTiers: [
    'Standard — Regular flowerpot drops and climb-back timing.',
    'Heavy — Shrinks paddle width by 15% per stack when anchored.',
    'Swift — Faster throws and quicker returns to bricks.',
    'Elite — Tracking shots; may scramble controls or HUD briefly.',
  ],
};
