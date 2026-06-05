/**
 * Play-route boot splash — DOM progress until the arena is ready.
 * React owns #boot-splash; do not remove the node from the DOM (Strict Mode / remounts).
 */

const MIN_VISIBLE_MS = 750;
const MAX_WAIT_MS = 45000;

let startedAt = 0;
let dismissed = false;
let currentProgress = 0;
let maxTimeout = null;

function els() {
  const root = document.getElementById('boot-splash');
  if (!root) return null;
  return {
    root,
    bar: root.querySelector('[data-boot-bar]'),
    status: root.querySelector('[data-boot-status]'),
    pct: root.querySelector('[data-boot-pct]'),
  };
}

function emit(name, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function emitProgress() {
  emit('neon:boot-splash-progress', {
    progress: currentProgress,
    label: els()?.status?.textContent ?? '',
  });
}

/**
 * @param {{ progress?: number, label?: string }} opts
 */
export function setBootSplash({ progress, label } = {}) {
  if (dismissed) return;
  if (!startedAt) startedAt = performance.now();

  if (typeof progress === 'number') {
    currentProgress = Math.max(currentProgress, Math.min(100, progress));
  }

  const ui = els();
  if (!ui) return;

  if (ui.bar) ui.bar.style.width = `${currentProgress}%`;
  if (ui.pct) ui.pct.textContent = `${Math.round(currentProgress)}%`;
  if (label && ui.status) ui.status.textContent = label;

  ui.root.setAttribute('aria-valuenow', String(Math.round(currentProgress)));
  if (label && ui.status) ui.status.setAttribute('aria-label', label);
  emitProgress();
}

export function dismissBootSplash(label) {
  if (dismissed) return;
  dismissed = true;
  if (maxTimeout) {
    clearTimeout(maxTimeout);
    maxTimeout = null;
  }

  const finish = () => {
    setBootSplash({ progress: 100, label: label ?? 'Garden ready' });
    const ui = els();
    if (ui?.root) {
      ui.root.classList.add('hide');
      ui.root.setAttribute('aria-busy', 'false');
    }
    emit('neon:boot-splash-dismiss', { label });
  };

  const elapsed = performance.now() - (startedAt || performance.now());
  const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);
  setTimeout(finish, delay);
}

export function armBootSplashTimeout(onStuck) {
  if (maxTimeout) clearTimeout(maxTimeout);
  maxTimeout = setTimeout(() => {
    if (dismissed) return;
    onStuck?.();
    emit('neon:boot-splash-stuck', { progress: currentProgress });
  }, MAX_WAIT_MS);
}

/** Force-dismiss after max wait — used by stuck UI retry. */
export function forceDismissBootSplash(label) {
  dismissBootSplash(label ?? 'Taking longer than usual — entering garden…');
}

export function resetBootSplashState() {
  startedAt = 0;
  dismissed = false;
  currentProgress = 0;
  if (maxTimeout) {
    clearTimeout(maxTimeout);
    maxTimeout = null;
  }
  const ui = els();
  if (ui?.root) {
    ui.root.classList.remove('hide');
    ui.root.setAttribute('aria-busy', 'true');
  }
  emit('neon:boot-splash-reset');
}
