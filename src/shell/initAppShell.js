import { runMigrations } from '../systems/SaveMigration.js';
import { initInstallPrompt } from '../systems/InstallPrompt.js';
import { Monetization } from '../systems/Monetization.js';
import { createAdProvider } from '../systems/createAdProvider.js';
import { SaveManager } from '../systems/SaveManager.js';
import { syncPendingEntitlements } from '../systems/WebUnlock.js';
import { initNativeBridge } from '../systems/NativeBridge.js';
import { establishMenuHistory } from '../systems/Navigation.js';
import { Capacitor } from '@capacitor/core';

let shellReady = false;

/** Boot save migration, install prompt, and ads/IAP for React shell routes. */
export async function initAppShell({ showBanner = true } = {}) {
  if (typeof window === 'undefined') return;
  if (shellReady) {
    if (showBanner) Monetization.showBanner();
    return;
  }
  runMigrations();
  initInstallPrompt();
  establishMenuHistory();

  const adProvider = createAdProvider(null);
  const initMonetization = async () => {
    Monetization.applyConfig();
    Monetization.removeAds = SaveManager.getRemoveAds();
    try {
      await adProvider.init?.();
      if (!Capacitor.isNativePlatform()) {
        await syncPendingEntitlements();
      } else {
        await initNativeBridge(null);
        await Monetization.syncStoreEntitlements();
        await syncPendingEntitlements();
      }
    } catch (e) {
      console.warn('[Shell] monetization init skipped', e);
    }
  };

  await Promise.race([
    Monetization.register({ ...adProvider, init: initMonetization }, null),
    new Promise((r) => setTimeout(r, 3500)),
  ]);

  shellReady = true;
  if (showBanner) Monetization.showBanner();
}

export function hideShellBanner() {
  Monetization.hideBanner();
}
