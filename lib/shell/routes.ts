import { RunPersistence } from '@/src/systems/RunPersistence.js';
import { SCENES } from '@/src/config/Constants.js';
import { clearHubSession, isHubSessionWarm, markHubSessionActive, setPlayIntent } from '@/lib/shell/playIntent';
import { shellNavigate } from '@/lib/shell/shellRouter';
import { pushRunSnapshot } from '@/lib/persistence/SyncEngine';
import { audio } from '@/src/systems/AudioManager.js';
import { SaveManager } from '@/src/systems/SaveManager.js';

export const ROUTES = {
  home: '/',
  play: '/play/',
  settings: '/settings/',
  codex: '/codex/',
  shop: '/shop/',
  share: '/share/',
  install: '/install/',
  connect: '/connect/',
  terms: '/terms/',
  privacy: '/privacy/',
} as const;

export const EXTERNAL_LINKS = {
  linkedIn: 'https://www.linkedin.com/in/tuhinkarmakar3882/',
} as const;

export function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

export type ShellRoute = (typeof ROUTES)[keyof typeof ROUTES];

function pathWithQuery(base: string, params: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  return q ? `${base}?${q}` : base;
}

export function isOnPlayRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.replace(/\/$/, '') === '/play';
}

/**
 * Hub ↔ play uses the Next.js client router (`shellNavigate`).
 * Session flags (`neon-play-intent`, `neon-hub-session-ts`) carry resume vs new-game intent
 * across route changes; warm hub session skips redundant music prefetch on return to /play/.
 */
export function destroyPhaserIfAny(): void {
  const g = window.__NEON;
  if (!g) return;
  try {
    const gs = g.scene?.getScene(SCENES.GAME) as { scene?: { isActive?: () => boolean }; over?: boolean } | undefined;
    if (gs?.scene?.isActive?.() && !gs.over) RunPersistence.saveRun(gs as Parameters<typeof RunPersistence.saveRun>[0]);
  } catch {
    /* tearing down */
  }
  try {
    g.destroy(true);
  } catch {
    /* ignore */
  }
  window.__NEON = undefined;
  markHubSessionActive();
  pushRunSnapshot();
  try {
    audio.teardownPlaySession();
    audio.init();
    const s = SaveManager.loadSettings();
    if (s.music) audio.setMenuMusic();
  } catch {
    /* audio optional during teardown */
  }
}

export function armPlayIntent({ resume = false }: { resume?: boolean } = {}): void {
  const warmResume = resume && isHubSessionWarm() && !!RunPersistence.loadRun();
  if (!resume) {
    RunPersistence.clearRun();
    clearHubSession();
  }
  setPlayIntent({
    mode: warmResume || resume ? 'resume' : 'new',
    extra: { forceNew: !resume, warmBoot: warmResume },
  });
}

export function exitToHome(): void {
  if (typeof window === 'undefined') return;
  destroyPhaserIfAny();
  shellNavigate(ROUTES.home);
}

export function navigateToPlay({ resume = false }: { resume?: boolean } = {}): void {
  if (typeof window === 'undefined') return;
  armPlayIntent({ resume });
  shellNavigate(ROUTES.play);
}

/** Save active run and open a shell route; return via ?from=play + navigateToPlay({ resume: true }). */
export function saveRunAndLeavePlay(targetPath: string, query: Record<string, string> = {}): void {
  if (typeof window === 'undefined') return;
  const g = window.__NEON as { scene?: { getScene: (k: string) => { scene?: { isActive?: () => boolean }; over?: boolean } } } | undefined;
  const gs = g?.scene?.getScene(SCENES.GAME);
  if (gs?.scene?.isActive?.() && !gs.over) {
    RunPersistence.saveRun(gs as Parameters<typeof RunPersistence.saveRun>[0]);
    pushRunSnapshot();
  }
  shellNavigate(pathWithQuery(targetPath, { from: 'play', ...query }));
}

const SHELL_FROM_ROUTES: Record<string, string> = {
  play: ROUTES.play,
  settings: ROUTES.settings,
  shop: ROUTES.shop,
  codex: ROUTES.codex,
  terms: ROUTES.terms,
  privacy: ROUTES.privacy,
  install: ROUTES.install,
  share: ROUTES.share,
  home: ROUTES.home,
};

export function shellRouteHref(
  path: string,
  params?: Record<string, string | null | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}

/** Resolve shell back target from `?from=` and/or explicit `?return=` (full path). */
export function resolveShellBackHref(from?: string | null, returnTo?: string | null): string {
  if (returnTo?.startsWith('/')) return returnTo;
  if (from && SHELL_FROM_ROUTES[from]) return SHELL_FROM_ROUTES[from];
  return ROUTES.home;
}

export function shellBackHref(from?: string | null): string {
  return resolveShellBackHref(from);
}

export type LegalNavContext = {
  from?: string | null;
  returnTo?: string | null;
};

export function legalPageHref(doc: 'terms' | 'privacy', ctx?: LegalNavContext): string {
  const path = doc === 'terms' ? ROUTES.terms : ROUTES.privacy;
  return shellRouteHref(path, {
    from: ctx?.from ?? undefined,
    return: ctx?.returnTo ?? undefined,
  });
}

/** Open Terms/Privacy from another shell page; back returns to `parentReturnTo`. */
export function legalEntryHref(doc: 'terms' | 'privacy', parentReturnTo: string): string {
  return shellRouteHref(doc === 'terms' ? ROUTES.terms : ROUTES.privacy, { return: parentReturnTo });
}

/** Cross-link Terms ↔ Privacy without losing the back stack. */
export function legalSiblingHref(
  target: 'terms' | 'privacy',
  currentDoc: 'terms' | 'privacy',
  ctx?: LegalNavContext,
): string {
  const currentPath = currentDoc === 'terms' ? ROUTES.terms : ROUTES.privacy;
  const targetPath = target === 'terms' ? ROUTES.terms : ROUTES.privacy;
  const selfHref =
    ctx?.returnTo || ctx?.from
      ? shellRouteHref(currentPath, {
          from: ctx?.from ?? undefined,
          return: ctx?.returnTo ?? undefined,
        })
      : currentPath;
  return shellRouteHref(targetPath, { from: currentDoc, return: selfHref });
}
