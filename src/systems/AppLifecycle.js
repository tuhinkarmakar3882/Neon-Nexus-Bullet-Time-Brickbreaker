/** App/tab background — pause audio and save run when appropriate. */
import { Capacitor } from '@capacitor/core';
import { SCENES } from '../config/Constants.js';
import { audio } from './AudioManager.js';
import { RunPersistence } from './RunPersistence.js';

export function attachAppLifecycle(game) {
  if (typeof document === 'undefined') return;

  const onHide = () => {
    const gs = game?.scene?.getScene(SCENES.GAME);
    if (gs?.sys?.isActive?.() && !gs.over) RunPersistence.saveRun(gs);
    audio.pauseForBackground();
  };

  const onShow = () => {
    audio.resumeFromBackground(game);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onHide();
    else onShow();
  });

  if (!Capacitor.isNativePlatform()) return;

  import('@capacitor/app').then(({ App }) => {
    App.addListener('pause', onHide);
    App.addListener('resume', onShow);
  }).catch(() => {});
}
