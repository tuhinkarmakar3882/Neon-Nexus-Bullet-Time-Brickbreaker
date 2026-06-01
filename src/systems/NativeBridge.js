/** Capacitor native lifecycle — pause audio, back button, billing init. */
import { Capacitor } from '@capacitor/core';
import { initPlayBilling } from './PlayBilling.js';
import { goBack, requestExitApp } from './Navigation.js';

export async function initNativeBridge(game) {
  if (!Capacitor.isNativePlatform()) return;

  await initPlayBilling();

  try {
    const { App } = await import('@capacitor/app');
    App.addListener(
      'backButton',
      () => {
        const result = goBack(game);
        if (!result.handled) requestExitApp();
      },
      { priority: 10 },
    );

  } catch (e) {
    console.warn('[NativeBridge] App plugin unavailable', e);
  }

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#08050c' });
  } catch { /* optional */ }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* optional */ }
}
