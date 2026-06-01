/** Wait until #game-root (or .play-stage) has a real layout size before Phaser boots. */
export function waitForPlayFrame(minSize = 80, timeoutMs = 8000): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  return new Promise((resolve) => {
    const root = document.getElementById('game-root') ?? document.querySelector('.play-stage');
    if (!root) {
      resolve();
      return;
    }

    const ready = () =>
      root.clientWidth >= minSize && root.clientHeight >= minSize;

    if (ready()) {
      resolve();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ro?.disconnect();
      resolve();
    };

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          if (ready()) finish();
        })
      : null;

    ro?.observe(root);
    requestAnimationFrame(() => {
      if (ready()) finish();
    });
    window.setTimeout(finish, timeoutMs);
  });
}
