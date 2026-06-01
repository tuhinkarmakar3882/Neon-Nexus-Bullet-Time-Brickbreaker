/** Bridge Phaser PauseScene ↔ React pause overlay on /play. */

export function dispatchPauseOverlayOpen(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('neon:pause-open', { detail }));
}

export function dispatchPauseOverlayClose() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('neon:pause-close'));
}
