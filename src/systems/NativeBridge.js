/** Capacitor native lifecycle — pause audio, back button, billing init. */
import { Capacitor } from '@capacitor/core';
import { initPlayBilling } from './PlayBilling.js';
import { audio } from './AudioManager.js';

export async function initNativeBridge(game) {
  if (!Capacitor.isNativePlatform()) return;

  await initPlayBilling();

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      const sm = game?.scene;
      if (!sm) return;
      if (sm.isActive('Pause')) {
        sm.getScene('Pause')?.resume?.();
        sm.stop('Pause');
        return;
      }
      if (sm.isActive('Game') && !sm.isPaused('Game')) {
        sm.getScene('Game')?.requestPause?.();
        return;
      }
      App.exitApp();
    });

    App.addListener('pause', () => {
      audio.stopMusic?.();
    });
    App.addListener('resume', () => {
      if (audio.musicOn) audio.startMusic?.();
    });
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
