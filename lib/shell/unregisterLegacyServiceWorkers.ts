const CLEARED_KEY = 'neon-sw-cleared';

/** Tear down any previously installed Neon Nexus service workers and caches. */
export function unregisterLegacyServiceWorkers(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  const alreadyCleared = sessionStorage.getItem(CLEARED_KEY) === '1';

  void navigator.serviceWorker.getRegistrations().then(async (regs) => {
    if (!regs.length && alreadyCleared) return;

    await Promise.all(regs.map((reg) => reg.unregister()));

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('neon-nexus')).map((k) => caches.delete(k)));
    }

    sessionStorage.setItem(CLEARED_KEY, '1');

    if (hadController && !alreadyCleared && !window.location.pathname.startsWith('/play')) {
      window.location.reload();
    }
  });
}
