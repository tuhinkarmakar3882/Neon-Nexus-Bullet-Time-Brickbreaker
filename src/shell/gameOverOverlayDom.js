/** Bridge Phaser GameOverScene ↔ React overlay on /play. */

export function dispatchGameOverOverlayOpen(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('neon:gameover-open', { detail }));
}

export function dispatchGameOverOverlayClose() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('neon:gameover-close'));
}
