/**
 * Google Play Billing via RevenueCat (native) + Stripe checkout hook (web PWA).
 * Falls back to demo purchase flow when keys are not configured.
 */
import { Capacitor } from '@capacitor/core';
import { isIapEnabled } from '../config/AdsConfig.js';
import { MetaProgress } from './MetaProgress.js';
import { SaveManager } from './SaveManager.js';
import { Monetization } from './Monetization.js';

function isWebStripeEnabled() {
  return !Capacitor.isNativePlatform() && !!import.meta.env.VITE_STRIPE_CHECKOUT_URL;
}

let Purchases = null;
let configured = false;

async function loadPurchases() {
  if (Purchases !== null) return Purchases;
  if (!Capacitor.isNativePlatform()) {
    Purchases = false;
    return false;
  }
  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    Purchases = mod.Purchases;
    return Purchases;
  } catch {
    Purchases = false;
    return false;
  }
}

function androidKey() {
  return import.meta.env.VITE_REVENUECAT_ANDROID_KEY ?? '';
}

function iosKey() {
  return import.meta.env.VITE_REVENUECAT_IOS_KEY ?? '';
}

export async function initPlayBilling() {
  if (!isIapEnabled()) return false;
  const RC = await loadPurchases();
  if (!RC) return false;
  const platform = Capacitor.getPlatform();
  const apiKey = platform === 'ios' ? iosKey() : androidKey();
  if (!apiKey) return false;
  try {
    await RC.configure({ apiKey });
    configured = true;
    return true;
  } catch (e) {
    console.warn('[PlayBilling] configure failed', e);
    return false;
  }
}

export function isPlayBillingReady() {
  return configured;
}

function applyProduct(productId) {
  Monetization.applyEntitlements(productId);
}

export async function purchaseProduct(productId) {
  if (!isIapEnabled()) return { success: false, reason: 'iap_disabled' };
  if (typeof window.__nativePurchase === 'function') {
    return window.__nativePurchase(productId);
  }

  const RC = await loadPurchases();
  if (RC && configured) {
    try {
      const { customerInfo } = await RC.purchaseStoreProduct({ product: { identifier: productId } });
      syncEntitlementsFromCustomerInfo(customerInfo);
      return { success: true, productId };
    } catch (e) {
      if (e?.userCancelled) return { success: false, cancelled: true };
      return { success: false, error: e?.message ?? 'Purchase failed' };
    }
  }

  if (!Capacitor.isNativePlatform()) {
    const stripeUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL;
    if (stripeUrl) {
      const url = `${stripeUrl}?product=${encodeURIComponent(productId)}`;
      window.open(url, '_blank', 'noopener');
      return { success: false, pending: true, message: 'Complete checkout in browser tab' };
    }
  }

  return null;
}

export async function restorePurchases() {
  if (typeof window.__nativeRestore === 'function') {
    return window.__nativeRestore();
  }
  if (isWebStripeEnabled()) {
    try {
      const { syncPendingEntitlements } = await import('./WebUnlock.js');
      const synced = await syncPendingEntitlements();
      if (synced?.success) {
        return {
          success: true,
          removeAds: SaveManager.getRemoveAds(),
          premium: MetaProgress.isPremium(),
          web: true,
        };
      }
    } catch (e) {
      console.warn('[PlayBilling] web restore failed', e);
    }
  }
  const RC = await loadPurchases();
  if (RC && configured) {
    try {
      const { customerInfo } = await RC.restorePurchases();
      syncEntitlementsFromCustomerInfo(customerInfo);
      return {
        success: true,
        removeAds: SaveManager.getRemoveAds(),
        premium: MetaProgress.isPremium(),
      };
    } catch (e) {
      return { success: false, error: e?.message ?? 'Restore failed' };
    }
  }
  return null;
}

export async function syncStoreEntitlements() {
  const RC = await loadPurchases();
  if (!RC || !configured) return false;
  try {
    const { customerInfo } = await RC.getCustomerInfo();
    syncEntitlementsFromCustomerInfo(customerInfo);
    return true;
  } catch {
    return false;
  }
}

function syncEntitlementsFromCustomerInfo(info) {
  const active = info?.entitlements?.active ?? {};
  if (active.remove_ads || active['remove ads']) {
    SaveManager.setRemoveAds(true);
    Monetization.removeAds = true;
  }
  if (active.premium || active['premium pass']) {
    MetaProgress.setPremium(true);
  }
  const products = Object.keys(active);
  products.forEach((id) => {
    if (id.includes('coin') || id === 'coins_small') {
      MetaProgress.addGems(50);
    }
  });
  import('../../lib/persistence/syncEntitlements.ts').then(({ syncEntitlementsToCloud }) => {
    void syncEntitlementsToCloud();
  }).catch(() => {});
}

export function formatStorePrice(productId) {
  const p = AdsConfig.products[productId];
  return p?.price ?? '';
}
