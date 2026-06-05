/**
 * Push native/web entitlements to MongoDB when signed in.
 */
import { getIdToken, isFirebaseConfigured } from '@/lib/auth/firebaseClient';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { MetaProgress } from '@/src/systems/MetaProgress.js';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export async function syncEntitlementsToCloud() {
  if (!isFirebaseConfigured()) return;
  const token = await getIdToken();
  if (!token) return;

  const entitlements = {
    removeAds: SaveManager.getRemoveAds(),
    premium: MetaProgress.isPremium(),
    stripeRedeemed: SaveManager.getStripeRedeemedKeys(),
  };

  try {
    await fetch(`${API_BASE}/api/entitlements/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entitlements),
    });
  } catch (e) {
    console.warn('[Entitlements] cloud sync failed', e);
  }
}
