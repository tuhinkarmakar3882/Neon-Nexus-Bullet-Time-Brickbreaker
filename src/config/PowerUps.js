// Complete power-up catalogue. Colors preserve the original game's values but
// the labels/comments are corrected and `Shuffle` gets its own distinct hue.
//
// `kind`:
//   - 'timed'   : occupies a slot in the active-power map and expires after `dur`.
//   - 'instant' : fires once, no active duration (Heart, Burst, Velocity, Joker, Shuffle).
//   - 'field'   : a world effect with its own lifecycle (BlackHole, Squeeze).
//
// `bulletTime`: whether picking it up triggers global slow-mo (instant utility
//   pickups no longer needlessly trigger it — fixes the "sludgy" feel bug).

export const POWERS = {
  Expand:     { color: 0x0099ff, dur: 10000, kind: 'timed',   bulletTime: false, desc: 'Wider paddle' },
  Reduce:     { color: 0xff00aa, dur: 10000, kind: 'timed',   bulletTime: false, desc: 'Narrower paddle' },
  Magnet:     { color: 0xffff00, dur: 9000,  kind: 'timed',   bulletTime: false, desc: 'Pull capsules in' },
  Glue:       { color: 0xffd700, dur: 15000, kind: 'timed',   bulletTime: false, desc: 'Ball sticks to paddle' },
  Laser:      { color: 0xff0066, dur: 7000,  kind: 'timed',   bulletTime: false, desc: 'Auto-fire twin lasers' },
  Shield:     { color: 0xddddff, dur: 15000, kind: 'timed',   bulletTime: false, desc: 'One-shot safety floor' },
  Flip:       { color: 0xff007f, dur: 7000,  kind: 'timed',   bulletTime: true,  desc: 'Flip the view' },
  Velocity:   { color: 0x007fff, dur: 0,     kind: 'instant', bulletTime: false, desc: 'Speed up ball' },
  Chill:      { color: 0x00ffaa, dur: 15000, kind: 'timed',   bulletTime: false, desc: 'Slow the ball' },
  Burst:      { color: 0xff00ff, dur: 0,     kind: 'instant', bulletTime: true,  desc: 'Split into 3 balls' },
  Heart:      { color: 0x55ff55, dur: 0,     kind: 'instant', bulletTime: false, desc: '+1 life' },
  Joker:      { color: 0x00ff00, dur: 0,     kind: 'instant', bulletTime: true,  desc: 'Random power-up' },
  Reverse:    { color: 0xff0055, dur: 5000,  kind: 'timed',   bulletTime: true,  desc: 'Inverted controls' },
  Wrap:       { color: 0xffff33, dur: 15000, kind: 'timed',   bulletTime: false, desc: 'Wrap-around walls' },
  Freeze:     { color: 0x00ffff, dur: 10000, kind: 'timed',   bulletTime: false, desc: 'Freeze brick AI' },
  ChargeShot: { color: 0xffc300, dur: 15000, kind: 'timed',   bulletTime: false, desc: 'Next hit one-shots' },
  BlackHole:  { color: 0xff0000, dur: 4000,  kind: 'field',   bulletTime: true,  desc: 'Vortex devours bricks' },
  Missile:    { color: 0xff5733, dur: 7000,  kind: 'timed',   bulletTime: false, desc: 'Boomerang ball' },
  Gravity:    { color: 0xaa00ff, dur: 5000,  kind: 'timed',   bulletTime: false, desc: 'Ball curves to paddle' },
  Echo:       { color: 0xe0e0ff, dur: 8000,  kind: 'timed',   bulletTime: false, desc: 'Orbiting destroyers' },
  Teleport:   { color: 0x00fff0, dur: 8000,  kind: 'timed',   bulletTime: false, desc: 'Phase through bricks' },
  Squeeze:    { color: 0xff4500, dur: 5000,  kind: 'field',   bulletTime: false, desc: 'Shrink all bricks' },
  Shuffle:    { color: 0xff8800, dur: 0,     kind: 'instant', bulletTime: true,  desc: 'Re-roll brick types' },
};

export const POWER_KEYS = Object.keys(POWERS);

export function powerColorHex(key) {
  const c = POWERS[key]?.color ?? 0xffffff;
  return '#' + c.toString(16).padStart(6, '0');
}
