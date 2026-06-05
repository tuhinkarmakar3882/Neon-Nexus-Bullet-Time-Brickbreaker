function frameReady(el: Element | null, minSize: number) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width >= minSize && rect.height >= minSize;
}

/** Wait until #game-root (or .play-stage) has a real layout size before Phaser boots. */
export function waitForPlayFrame(minSize = 80, timeoutMs = 8000): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  return new Promise((resolve) => {
    const root = document.getElementById('game-root') ?? document.querySelector('.play-stage');
    const stage = document.querySelector('.play-stage--hud') ?? document.querySelector('.play-stage');
    if (!root) {
      resolve();
      return;
    }

    const ready = () =>
      frameReady(root, minSize) || frameReady(stage, minSize);

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
    if (stage && stage !== root) ro?.observe(stage);
    const vv = window.visualViewport;
    const onViewport = () => {
      if (ready()) finish();
    };
    vv?.addEventListener('resize', onViewport);
    vv?.addEventListener('scroll', onViewport);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (ready()) finish();
      });
    });
    window.setTimeout(() => {
      vv?.removeEventListener('resize', onViewport);
      vv?.removeEventListener('scroll', onViewport);
      finish();
    }, timeoutMs);
  });
}
