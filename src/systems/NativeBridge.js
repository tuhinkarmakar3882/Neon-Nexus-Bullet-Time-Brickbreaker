/** Capacitor native lifecycle — pause audio, back button, billing init. */
import { Capacitor } from '@capacitor/core';
import { SCENES } from '../config/Constants.js';
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
      if (sm.isActive(SCENES.PAUSE)) {
        sm.getScene(SCENES.PAUSE)?.resume?.();
        return;
      }
      if (sm.isActive(SCENES.GAME) && !sm.isPaused(SCENES.GAME)) {
        sm.getScene(SCENES.GAME)?.requestPause?.();
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
