/** Bridge Phaser LevelCompleteScene ↔ React overlay on /play. */

export function dispatchLevelCompleteOverlayOpen(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('neon:levelcomplete-open', { detail }));
}

export function dispatchLevelCompleteOverlayClose() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('neon:levelcomplete-close'));
}
