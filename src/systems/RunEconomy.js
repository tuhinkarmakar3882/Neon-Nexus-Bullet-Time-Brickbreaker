import { MetaProgress } from './MetaProgress.js';

/** Uncommitted wallet gains during an active run (not persisted until level clear / game over). */
let pendingGems = 0;
let pendingTreasury = 0;

export const RunEconomy = {
  resetRunEconomy() {
    pendingGems = 0;
    pendingTreasury = 0;
  },

  creditRunGems(n) {
    pendingGems += Math.max(0, n);
    return pendingGems;
  },

  creditRunTreasury(n) {
    pendingTreasury += Math.max(0, n);
    return pendingTreasury;
  },

  getPendingGems() {
    return pendingGems;
  },

  getPendingTreasury() {
    return pendingTreasury;
  },

  getDisplayGems() {
    return MetaProgress.getGems() + pendingGems;
  },

  getDisplayTreasury() {
    return MetaProgress.getTreasury() + pendingTreasury;
  },

  /** Flush in-run pickups into saved meta (level clear, game over). */
  commitRunEconomy() {
    if (pendingGems > 0) MetaProgress.addGems(pendingGems);
    if (pendingTreasury > 0) MetaProgress.addTreasury(pendingTreasury);
    pendingGems = 0;
    pendingTreasury = 0;
  },

  /** Drop uncommitted gains when abandoning a run (quit to hub mid-level). */
  discardRunEconomy() {
    pendingGems = 0;
    pendingTreasury = 0;
  },
};
