import { ROUTES } from '@/lib/shell/routes';

/** Hub shell routes — Next.js chunk prefetch on idle / hover (excludes /play/ by default). */
export const HUB_PREFETCH_ROUTES = [
  ROUTES.codex,
  ROUTES.shop,
  ROUTES.settings,
  ROUTES.share,
  ROUTES.install,
  ROUTES.terms,
  ROUTES.privacy,
] as const;

/**
 * Document prefetch is safe for these routes. /codex/ is excluded — v3.2.2+ HTML
 * prefetch broke Android Chrome client navigation (worked in v3.1.x without it).
 */
export const HUB_DOCUMENT_PREFETCH_ROUTES = HUB_PREFETCH_ROUTES.filter(
  (route) => route !== ROUTES.codex,
);

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

function canDocumentWarm(path: string): boolean {
  return (HUB_DOCUMENT_PREFETCH_ROUTES as readonly string[]).includes(path);
}

/** Low-priority fetch to warm shell HTML in the HTTP cache (not used for /codex/). */
export function prefetchShellRoute(href: string): void {
  const path = normalizeShellHref(href);
  if (!canWarm() || path.startsWith('http') || !canDocumentWarm(path) || warmed.has(path)) return;
  warmed.add(path);
  void fetch(path, { credentials: 'same-origin', priority: 'low' } as RequestInit).catch(() => {
    warmed.delete(path);
  });
}

/** Next.js chunk prefetch; optional document warm fetch for safe routes. */
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
