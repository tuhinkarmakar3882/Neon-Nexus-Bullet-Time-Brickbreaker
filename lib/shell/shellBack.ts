import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { ROUTES, armPlayIntent } from '@/lib/shell/routes';
import { popShellNavigation } from '@/lib/shell/shellNavStack';

export type ShellBackOptions = {
  /** Used when there is no prior in-app screen (deep link, refresh, external entry). */
  fallbackHref?: string;
  /** Return to /play/ and arm resume intent (hub opened from an active run). */
  playResume?: boolean;
};

export function performShellBack(router: AppRouterInstance, opts: ShellBackOptions = {}) {
  const fallback = opts.fallbackHref ?? ROUTES.home;

  if (opts.playResume) {
    armPlayIntent({ resume: true });
    router.push(ROUTES.play);
    return;
  }

  const prev = popShellNavigation();
  if (prev) {
    router.push(prev);
    return;
  }

  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    return;
  }

  router.push(fallback);
}
