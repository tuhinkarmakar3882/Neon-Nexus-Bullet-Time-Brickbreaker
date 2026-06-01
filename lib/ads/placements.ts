/**
 * Documented ad surface IDs — DOM slots and native overlays.
 * Web: bottom banner uses #ad-banner (see AdBanner.tsx).
 * Native: AdMob banner / interstitial / rewarded via Monetization + Phaser overlays.
 */
export const AD_PLACEMENTS = {
  /** Fixed bottom strip on React shell routes (home, shop, settings, …). */
  SHELL_BOTTOM_BANNER: 'shell-bottom-banner',
  /** Rectangle inside the in-game pause overlay (Phaser PauseScene). */
  PAUSE_MENU_BANNER: 'pause-menu-banner',
  /** Rectangle inside the React game-over overlay. */
  GAME_OVER_MENU_BANNER: 'game-over-menu-banner',
  /** Full-screen interstitial between levels (Phaser AdBreakScene). */
  GAME_INTERSTITIAL: 'game-interstitial',
  /** Rewarded continue on game over (Phaser GameOverScene). */
  GAME_REWARDED_CONTINUE: 'game-rewarded-continue',
} as const;

export type AdPlacementId = (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS];

/** CSS variable — keep in sync with globals.css */
export const SHELL_BANNER_HEIGHT_PX = 50;
