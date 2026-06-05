/** App/tab background — save active run when leaving gameplay. */
import { Capacitor } from '@capacitor/core';
import { SCENES } from '../config/Constants.js';
import { RunPersistence } from './RunPersistence.js';

let detachLifecycle = null;

export function attachAppLifecycle(game) {
  detachAppLifecycle();
  if (typeof document === 'undefined') return () => {};

  const onHide = () => {
    const gs = game?.scene?.getScene(SCENES.GAME);
    if (gs?.sys?.isActive?.() && !gs.over) RunPersistence.saveRun(gs);
  };

  const onVisibility = () => {
    if (document.hidden) onHide();
  };

  document.addEventListener('visibilitychange', onVisibility);

  let pauseHandle = null;
  if (Capacitor.isNativePlatform()) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('pause', onHide).then((h) => {
        pauseHandle = h;
      });
    }).catch(() => {});
  }

  detachLifecycle = () => {
    document.removeEventListener('visibilitychange', onVisibility);
    pauseHandle?.remove?.();
    pauseHandle = null;
    detachLifecycle = null;
  };

  return detachLifecycle;
}

export function detachAppLifecycle() {
  detachLifecycle?.();
}
