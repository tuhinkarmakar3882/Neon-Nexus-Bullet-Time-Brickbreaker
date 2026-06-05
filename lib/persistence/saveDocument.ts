import { STORAGE } from '@/src/config/Constants.js';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { Monetization } from '@/src/systems/Monetization.js';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import type { PlayerSaveDocument, PlayerEntitlements } from './types';
import { CURRENT_SAVE_SCHEMA } from './types';

function readMetaRaw(): Record<string, unknown> {
  return (SaveManager.getJson(STORAGE.META, null) as Record<string, unknown> | null) ?? {};
}

function readEntitlements(): PlayerEntitlements {
  return {
    removeAds: SaveManager.getRemoveAds(),
    premium: Boolean(readMetaRaw().premium),
    stripeRedeemed: SaveManager.getStripeRedeemedKeys(),
  };
}

/** Assemble a cloud save document from current local state. */
export function buildLocalSaveDocument(): PlayerSaveDocument {
  const meta = readMetaRaw();
  return {
    schemaVersion: CURRENT_SAVE_SCHEMA,
    revision: 0,
    meta,
    settings: SaveManager.loadSettings() as Record<string, unknown>,
    highScore: SaveManager.getHighScore(),
    returnStreak: MetaProgress.getReturnStreak(),
    returnStreakDate: SaveManager.getString(STORAGE.RETURN_STREAK_DATE, ''),
    run: SaveManager.loadRun(),
    entitlements: readEntitlements(),
    updatedAt: new Date().toISOString(),
  };
}

/** Apply a cloud document to local IndexedDB (does not mark dirty). */
export function applySaveDocument(doc: PlayerSaveDocument): void {
  if (doc.meta) SaveManager.setJson(STORAGE.META, doc.meta);
  if (doc.settings) SaveManager.saveSettings(doc.settings as Parameters<typeof SaveManager.saveSettings>[0]);
  if (Number.isFinite(doc.highScore)) SaveManager.setHighScore(doc.highScore);
  if (Number.isFinite(doc.returnStreak)) SaveManager.setNumber(STORAGE.RETURN_STREAK, doc.returnStreak);
  if (doc.returnStreakDate) SaveManager.setString(STORAGE.RETURN_STREAK_DATE, doc.returnStreakDate);
  if (doc.run) SaveManager.saveRun(doc.run);
  else SaveManager.clearRun();

  const ent = doc.entitlements;
  if (ent) {
    SaveManager.setRemoveAds(!!ent.removeAds);
    Monetization.removeAds = !!ent.removeAds;
    if (ent.stripeRedeemed?.length) {
      SaveManager.setJson(STORAGE.STRIPE_REDEEMED, ent.stripeRedeemed);
    }
    if (ent.premium) MetaProgress.setPremium(true);
    else if (!ent.premium && ent.removeAds) {
      /* keep meta premium from entitlements only when set */
    }
    const meta = readMetaRaw();
    meta.premium = !!ent.premium;
    SaveManager.setJson(STORAGE.META, meta);
  }
}
