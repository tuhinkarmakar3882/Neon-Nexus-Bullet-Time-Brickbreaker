/** Gem payouts — primary shop currency earned on level clear. */

export function gemsForLevelClear(level = 1, stars = 1) {
  const lv = Math.max(1, level);
  const st = Math.max(1, Math.min(3, stars));
  return 4 + Math.floor(lv / 2) + st * 3;
}
