/** Cloud save document — mirrors MongoDB player_saves collection. */

export type PlayerEntitlements = {
  removeAds: boolean;
  premium: boolean;
  stripeRedeemed: string[];
};

export type PlayerSaveDocument = {
  schemaVersion: number;
  revision: number;
  meta: Record<string, unknown>;
  settings: Record<string, unknown>;
  highScore: number;
  returnStreak: number;
  returnStreakDate: string;
  run: Record<string, unknown> | null;
  entitlements: PlayerEntitlements;
  updatedAt: string;
};

export type SyncState = {
  revision: number;
  dirty: boolean;
  lastPushedAt: number | null;
  lastPulledAt: number | null;
  lastSyncError: string | null;
};

export type NudgeState = {
  dismissedAt: number | null;
  showCount: number;
  shownThisSession: boolean;
};

export const CURRENT_SAVE_SCHEMA = 2;
