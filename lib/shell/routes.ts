import { RunPersistence } from '@/src/systems/RunPersistence.js';
import { SCENES } from '@/src/config/Constants.js';
import { clearHubSession, isHubSessionWarm, markHubSessionActive, setPlayIntent } from '@/lib/shell/playIntent';
import { pushRunSnapshot, schedulePush, syncIfSignedIn } from '@/lib/persistence/SyncEngine';
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
 * Hub ↔ play uses full `location.href` navigation (no client-side router).
 * Session flags (`neon-play-intent`, `neon-hub-session-ts`) carry resume vs new-game intent
 * across reloads; warm hub session skips redundant music prefetch on return to /play/.
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

export function exitToHome(): void {
  if (typeof window === 'undefined') return;
  destroyPhaserIfAny();
  window.location.href = ROUTES.home;
}

export function navigateToPlay({ resume = false }: { resume?: boolean } = {}): void {
  if (typeof window === 'undefined') return;
  const warmResume = resume && isHubSessionWarm() && !!RunPersistence.loadRun();
  if (!resume) {
    RunPersistence.clearRun();
    clearHubSession();
  }
  setPlayIntent({
    mode: warmResume || resume ? 'resume' : 'new',
    extra: { forceNew: !resume, warmBoot: warmResume },
  });
  window.location.href = ROUTES.play;
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
  window.location.href = pathWithQuery(targetPath, { from: 'play', ...query });
}

export function shellBackHref(from?: string | null): string {
  if (from === 'play') return ROUTES.play;
  return ROUTES.home;
}
