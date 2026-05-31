/** Best-effort immersive display — Fullscreen API + mobile viewport lock. */

function fullscreenElement() {
  return document.fullscreenElement
    || document.webkitFullscreenElement
    || document.msFullscreenElement
    || null;
}

export function isGameFullscreen() {
  return !!fullscreenElement();
}

export async function requestGameFullscreen() {
  if (typeof document === 'undefined') return false;
  if (fullscreenElement()) return true;

  const root = document.documentElement;
  const req = root.requestFullscreen
    || root.webkitRequestFullscreen
    || root.msRequestFullscreen;

  if (!req) {
    lockMobileViewport();
    return false;
  }

  try {
    await req.call(root);
    lockMobileViewport();
    return true;
  } catch {
    lockMobileViewport();
    return false;
  }
}

export async function exitGameFullscreen() {
  const exit = document.exitFullscreen
    || document.webkitExitFullscreen
    || document.msExitFullscreen;
  if (!exit || !fullscreenElement()) return false;
  try {
    await exit.call(document);
    return true;
  } catch {
    return false;
  }
}

/** Nudge mobile browsers to collapse the URL bar — do not pin html/body height (breaks Phaser). */
export function lockMobileViewport() {
  if (typeof window === 'undefined') return;
  try {
    window.scrollTo(0, 1);
  } catch {
    /* ignore */
  }
}

export function attachFullscreenListener(onChange) {
  if (typeof document === 'undefined') return () => {};
  const handler = () => {
    lockMobileViewport();
    onChange?.(isGameFullscreen());
  };
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}
