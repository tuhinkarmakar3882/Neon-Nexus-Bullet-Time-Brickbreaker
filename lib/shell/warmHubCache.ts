import { ROUTES } from '@/lib/shell/routes';
import {
  HUB_PREFETCH_ROUTES,
  type RouterLike,
  prefetchShellHref,
  prefetchShellRoute,
} from '@/lib/shell/hubRoutePrefetch';

export type { RouterLike };

const HUB_WARM_ROUTES = [ROUTES.home, ...HUB_PREFETCH_ROUTES] as const;

function runWhenIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: 4000 });
    return;
  }
  window.setTimeout(fn, 1200);
}

/** Idle prefetch of hub shell pages (Next router + low-priority fetch). */
export function warmHubCache(): void {
  if (typeof window === 'undefined') return;

  runWhenIdle(() => {
    for (const route of HUB_WARM_ROUTES) prefetchShellRoute(route);
  });
}

export function wireHubLinkPrefetch(root: ParentNode = document, router?: RouterLike): () => void {
  const onIntent = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a[href^="/"]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.origin !== window.location.origin) return;
    const path = anchor.pathname.endsWith('/') ? anchor.pathname : `${anchor.pathname}/`;
    if (router) prefetchShellHref(router, path);
    else prefetchShellRoute(path);
  };

  root.addEventListener('pointerenter', onIntent, true);
  root.addEventListener('touchstart', onIntent, { capture: true, passive: true });

  return () => {
    root.removeEventListener('pointerenter', onIntent, true);
    root.removeEventListener('touchstart', onIntent, true);
  };
}
