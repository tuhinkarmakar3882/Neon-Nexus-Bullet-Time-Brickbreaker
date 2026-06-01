/** Fullscreen API helpers (opt-in only — play route stays windowed). */

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

/** No-op: we keep the game in a padded frame instead of forcing immersive chrome. */
export function lockMobileViewport() {
  /* intentionally empty */
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
