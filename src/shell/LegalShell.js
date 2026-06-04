/**
 * HTML shell for legal pages — Phaser stays on the play route; Terms/Privacy are normal web UI.
 * Back (browser, Escape, Android) closes the shell via Navigation.goBack().
 */
import { releaseOverlayHistory } from '../systems/Navigation.js';

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
  if (typeof window === 'undefined') return;
  if (window.__neonLegalMessageBound) return;
  window.__neonLegalMessageBound = true;
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
  const { shell, frame, title } = els();
  shell.classList.add('hidden');
  shell.setAttribute('aria-hidden', 'true');
  if (frame) frame.removeAttribute('src');
  if (title) title.textContent = 'Legal';
  openPage = null;
  document.body.classList.remove('neon-legal-open');
  gameRef?.loop?.wake?.();
  if (!fromHistory) {
    releaseOverlayHistory();
  }
  return true;
}

function legalDocStem(page) {
  const raw = String(page).replace(/^\//, '').toLowerCase();
  return raw.includes('privacy') ? 'privacy' : 'terms';
}

/** Static HTML (preferred in overlay iframe). */
function legalHtmlUrl(page) {
  const url = new URL(`/${legalDocStem(page)}.html`, window.location.origin);
  url.searchParams.set('embed', '1');
  return url;
}

/** Next.js route fallback when static HTML is unavailable (SPA hosts). */
function legalAppRouteUrl(page) {
  const url = new URL(`/${legalDocStem(page)}/`, window.location.origin);
  url.searchParams.set('embed', '1');
  url.searchParams.set('shell', '1');
  return url;
}

/**
 * @param {'terms.html'|'privacy.html'|string} page
 */
export function openLegalPage(page) {
  if (typeof window === 'undefined') return;
  const { shell, frame, title } = els();
  if (!shell || !frame) {
    window.location.assign(legalAppRouteUrl(page).href);
    return;
  }

  const stem = legalDocStem(page);
  if (isLegalShellOpen() && openPage === stem) {
    closeLegalShell();
    return;
  }
  if (isLegalShellOpen()) closeLegalShell({ fromHistory: true });

  const htmlUrl = legalHtmlUrl(page);
  const appUrl = legalAppRouteUrl(page);

  openPage = stem;
  title.textContent = stem === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
  frame.removeAttribute('srcdoc');
  frame.src = appUrl.href;

  const onError = () => {
    frame.removeEventListener('error', onError);
    if (frame.src !== htmlUrl.href) frame.src = htmlUrl.href;
  };
  frame.addEventListener('error', onError);
  const fallbackTimer = window.setTimeout(() => {
    try {
      const doc = frame.contentDocument;
      if (!doc || !doc.body?.textContent?.trim()) frame.src = htmlUrl.href;
    } catch {
      /* cross-origin — assume loaded */
    }
  }, 2400);
  frame.addEventListener(
    'load',
    () => {
      window.clearTimeout(fallbackTimer);
      frame.removeEventListener('error', onError);
    },
    { once: true },
  );
  shell.classList.remove('hidden');
  shell.setAttribute('aria-hidden', 'false');
  document.body.classList.add('neon-legal-open');
  gameRef?.loop?.sleep?.();
  pushHistoryHook();
}
