import { warmHubCache } from '@/lib/shell/warmHubCache';

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function shouldReloadAfterUpdate(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname.startsWith('/play')) return false;
  const neon = (window as Window & { __NEON?: { scene?: { isActive: (k: string) => boolean } } }).__NEON;
  if (neon?.scene?.isActive('Game')) return false;
  return true;
}

function wireServiceWorkerLifecycle(reg: ServiceWorkerRegistration): void {
  const onReady = () => {
    warmHubCache();
    reg.active?.postMessage({ type: 'neon-check-precache' });
  };

  if (reg.active) onReady();

  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') onReady();
    });
  });
}

/** Register offline cache worker (best-effort — game works without it). */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV === 'development' && isLocalDevHost()) return;

  let reloadedForUpdate = false;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloadedForUpdate || !shouldReloadAfterUpdate()) return;
    reloadedForUpdate = true;
    window.location.reload();
  });

  if (navigator.serviceWorker.controller) {
    warmHubCache();
    navigator.serviceWorker.controller.postMessage({ type: 'neon-check-precache' });
  }

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((reg) => {
      wireServiceWorkerLifecycle(reg);
      if (reg.waiting && navigator.serviceWorker.controller) {
        reg.waiting.postMessage({ type: 'neon-check-precache' });
      }
    })
    .catch((err) => {
      console.warn('[Neon Nexus] service worker registration failed', err);
    });
}
