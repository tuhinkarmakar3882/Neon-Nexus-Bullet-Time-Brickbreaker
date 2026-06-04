/** App/tab background — save active run when leaving gameplay. */
import { Capacitor } from '@capacitor/core';
import { SCENES } from '../config/Constants.js';
import { RunPersistence } from './RunPersistence.js';

export function attachAppLifecycle(game) {
  if (typeof document === 'undefined') return;

  const onHide = () => {
    const gs = game?.scene?.getScene(SCENES.GAME);
    if (gs?.sys?.isActive?.() && !gs.over) RunPersistence.saveRun(gs);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onHide();
  });

  if (!Capacitor.isNativePlatform()) return;

  import('@capacitor/app').then(({ App }) => {
    App.addListener('pause', onHide);
  }).catch(() => {});
}
