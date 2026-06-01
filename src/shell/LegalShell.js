/**
 * HTML shell for legal pages — Phaser stays on the play route; Terms/Privacy are normal web UI.
 * Back (browser, Escape, Android) closes the shell via Navigation.goBack().
 */
let gameRef = null;
let pushHistoryHook = () => {};
let popHistoryHook = () => {};
let skipHistoryHook = () => {};

/** Wire browser back stack sync (called from main.js after Navigation loads). */
export function wireLegalShellNavigation({ pushOverlay, popOverlay, markSkip }) {
  pushHistoryHook = pushOverlay ?? pushHistoryHook;
  popHistoryHook = popOverlay ?? popHistoryHook;
  skipHistoryHook = markSkip ?? skipHistoryHook;
}

let openPage = null;

const SHELL_ID = 'html-shell';
const FRAME_ID = 'html-shell-frame';
const TITLE_ID = 'html-shell-title';

function els() {
  if (typeof document === 'undefined') return {};
  return {
    shell: document.getElementById(SHELL_ID),
    frame: document.getElementById(FRAME_ID),
    title: document.getElementById(TITLE_ID),
    backBtn: document.getElementById('html-shell-back'),
  };
}

export function attachLegalShell(game) {
  gameRef = game;
  const { backBtn } = els();
  backBtn?.addEventListener('click', () => closeLegalShell());

  window.addEventListener('message', (e) => {
    if (e.data?.neonShell === 'close') closeLegalShell();
  });
}

export function isLegalShellOpen() {
  const { shell } = els();
  return !!shell && !shell.classList.contains('hidden');
}

export function closeLegalShell({ fromHistory = false } = {}) {
  if (!isLegalShellOpen()) return false;
  const { shell, frame } = els();
  shell.classList.add('hidden');
  shell.setAttribute('aria-hidden', 'true');
  frame.removeAttribute('src');
  openPage = null;
  document.body.classList.remove('neon-legal-open');
  gameRef?.loop?.wake?.();
  if (!fromHistory) {
    skipHistoryHook();
    popHistoryHook();
  }
  return true;
}

/**
 * @param {'terms.html'|'privacy.html'} page
 */
export function openLegalPage(page) {
  if (typeof window === 'undefined') return;
  const { shell, frame, title } = els();
  if (!shell || !frame) {
    window.location.assign(new URL(page, window.location.href).href);
    return;
  }

  if (isLegalShellOpen() && openPage === page) {
    closeLegalShell();
    return;
  }
  if (isLegalShellOpen()) closeLegalShell({ fromHistory: true });

  const url = new URL(page, window.location.href);
  url.searchParams.set('embed', '1');

  openPage = page;
  title.textContent = page.includes('privacy') ? 'Privacy Policy' : 'Terms of Service';
  frame.src = url.href;
  shell.classList.remove('hidden');
  shell.setAttribute('aria-hidden', 'false');
  document.body.classList.add('neon-legal-open');
  gameRef?.loop?.sleep?.();
  pushHistoryHook();
}
