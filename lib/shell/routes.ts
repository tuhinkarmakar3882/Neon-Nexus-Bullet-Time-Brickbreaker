import { RunPersistence } from '@/src/systems/RunPersistence.js';
import { SCENES } from '@/src/config/Constants.js';
import { setPlayIntent } from '@/lib/shell/playIntent';

export const ROUTES = {
  home: '/',
  play: '/play/',
  settings: '/settings/',
  codex: '/codex/',
  shop: '/shop/',
  share: '/share/',
  install: '/install/',
  connect: '/connect/',
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
}

export function exitToHome(): void {
  if (typeof window === 'undefined') return;
  destroyPhaserIfAny();
  window.location.href = ROUTES.home;
}

export function navigateToPlay({ resume = false }: { resume?: boolean } = {}): void {
  if (typeof window === 'undefined') return;
  setPlayIntent({
    mode: resume ? 'resume' : 'new',
    extra: { forceNew: !resume },
  });
  window.location.href = ROUTES.play;
}

export function saveRunAndLeavePlay(targetPath: string, query: Record<string, string> = {}): void {
  if (typeof window === 'undefined') return;
  destroyPhaserIfAny();
  window.location.href = pathWithQuery(targetPath, query);
}

export function shellBackHref(from?: string | null): string {
  if (from === 'play') return ROUTES.play;
  return ROUTES.home;
}
