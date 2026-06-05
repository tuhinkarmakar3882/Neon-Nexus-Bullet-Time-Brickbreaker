import { warmHubCache } from '@/lib/shell/warmHubCache';

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/** Register offline cache worker (best-effort — game works without it). */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV === 'development' && isLocalDevHost()) return;

  const onReady = () => {
    warmHubCache();
  };

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (reg.active) onReady();
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') onReady();
          });
        });
      })
      .catch((err) => {
        console.warn('[Neon Nexus] service worker registration failed', err);
      });
  };

  if (navigator.serviceWorker.controller) {
    onReady();
  }

  register();
}
