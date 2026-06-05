import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { Capacitor } from '@capacitor/core';
import { ROUTES, armPlayIntent, isOnPlayRoute } from '@/lib/shell/routes';
import { popShellNavigation } from '@/lib/shell/shellNavStack';
import { shellNavigate } from '@/lib/shell/shellRouter';

export type ShellBackOptions = {
  /** Used when there is no prior in-app screen (deep link, refresh, external entry). */
  fallbackHref?: string;
  /** Return to /play/ and arm resume intent (hub opened from an active run). */
  playResume?: boolean;
};

export type ShellBackResult = {
  handled: boolean;
  /** Native home — caller should run double-tap-to-exit logic. */
  atMenuRoot?: boolean;
};

function isHomePath(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return path === '/' || path === '';
}

function resolvePlayResume(opts: ShellBackOptions): boolean {
  if (opts.playResume) return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('from') === 'play';
}

/**
 * Router-free shell back — used by Android hardware back and Navigation.goBack on hub routes.
 * Uses the session nav stack instead of unreliable WebView history.length.
 */
export function executeShellBack(opts: ShellBackOptions = {}): ShellBackResult {
  if (typeof window === 'undefined') return { handled: false };
  if (isOnPlayRoute()) return { handled: false };

  const fallback = opts.fallbackHref ?? ROUTES.home;

  if (resolvePlayResume(opts)) {
    armPlayIntent({ resume: true });
    shellNavigate(ROUTES.play);
    return { handled: true };
  }

  const prev = popShellNavigation();
  if (prev) {
    shellNavigate(prev);
    return { handled: true };
  }

  if (Capacitor.isNativePlatform() && isHomePath()) {
    return { handled: true, atMenuRoot: true };
  }

  if (window.history.length > 1) {
    window.history.back();
    return { handled: true };
  }

  if (!isHomePath()) {
    shellNavigate(fallback);
    return { handled: true };
  }

  return { handled: false };
}

export function performShellBack(router: AppRouterInstance, opts: ShellBackOptions = {}) {
  void router;
  executeShellBack(opts);
}
