import { ROUTES } from '@/lib/shell/routes';

/** Hub shell routes — safe to prefetch on idle / hover (excludes /play/ by default). */
export const HUB_PREFETCH_ROUTES = [
  ROUTES.codex,
  ROUTES.shop,
  ROUTES.settings,
  ROUTES.share,
  ROUTES.install,
  ROUTES.terms,
  ROUTES.privacy,
] as const;

export const PLAY_PREFETCH_ROUTE = ROUTES.play;

export type RouterLike = { prefetch: (href: string) => void };

const warmed = new Set<string>();

function canWarm(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function';
}

function normalizeShellHref(href: string): string {
  if (!href.startsWith('/')) return `/${href}`;
  if (href === '/') return href;
  return href.endsWith('/') ? href : `${href}/`;
}

/** Low-priority fetch so the service worker caches HTML + linked chunks. */
export function prefetchShellRoute(href: string): void {
  const path = normalizeShellHref(href);
  if (!canWarm() || path.startsWith('http') || warmed.has(path)) return;
  warmed.add(path);
  void fetch(path, { credentials: 'same-origin', priority: 'low' } as RequestInit).catch(() => {
    warmed.delete(path);
  });
}

/** Next.js RSC/chunk prefetch + SW warm fetch for a shell route. */
export function prefetchShellHref(router: RouterLike, href: string): void {
  const path = normalizeShellHref(href);
  try {
    router.prefetch(path);
  } catch {
    /* router may reject unknown paths in dev */
  }
  prefetchShellRoute(path);
}

/** Idle warm of common hub destinations (+ optional play route). */
export function prefetchHubRoutes(router: RouterLike, { includePlay = false } = {}): void {
  for (const route of HUB_PREFETCH_ROUTES) prefetchShellHref(router, route);
  if (includePlay) prefetchShellHref(router, PLAY_PREFETCH_ROUTE);
}

/** Call immediately before client navigation so chunks are hot. */
export function prefetchBeforeNavigate(router: RouterLike, href: string): void {
  prefetchShellHref(router, href);
}
