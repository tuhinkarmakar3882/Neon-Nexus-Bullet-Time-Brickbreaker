/** PWA install prompt — capture beforeinstallprompt at boot; call prompt() from a user click. */

let deferred = null;
const listeners = new Set();

function adoptEarlyCapture() {
  if (typeof window === 'undefined') return;
  const early = window.__neonInstallPrompt;
  if (early) {
    deferred = early;
    window.__neonInstallPrompt = null;
  }
}

export function initInstallPrompt() {
  if (typeof window === 'undefined') return;
  adoptEarlyCapture();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    listeners.forEach((fn) => { try { fn(deferred); } catch { /* ignore */ } });
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((fn) => { try { fn(null); } catch { /* ignore */ } });
  });

  window.addEventListener('neon-install-ready', () => {
    adoptEarlyCapture();
    if (deferred) listeners.forEach((fn) => { try { fn(deferred); } catch { /* ignore */ } });
  });
}

export function getDeferredInstallPrompt() {
  return deferred;
}

export function onInstallPromptReady(fn) {
  listeners.add(fn);
  if (deferred) fn(deferred);
  return () => listeners.delete(fn);
}

export async function triggerInstallPrompt() {
  const promptEvent = deferred;
  if (!promptEvent) return { outcome: 'unavailable' };
  deferred = null;
  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    return { outcome };
  } catch (e) {
    console.warn('[InstallPrompt] prompt failed', e);
    return { outcome: 'dismissed' };
  }
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function canOfferInstall() {
  return shouldShowInstallOffer();
}

/** Hide install CTA when already running as installed PWA / home-screen app. */
export function shouldShowInstallOffer() {
  if (typeof window === 'undefined') return false;
  if (isStandaloneDisplay()) return false;
  return !!deferred;
}
