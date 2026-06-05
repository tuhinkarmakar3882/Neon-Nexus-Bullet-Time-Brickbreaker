'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { initAppShell, hideShellBanner } from '@/src/shell/initAppShell.js';
import { audio } from '@/src/systems/AudioManager.js';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '@/src/config/Constants.js';
import { closeLegalShell, isLegalShellOpen, wireLegalShellNavigation } from '@/src/shell/LegalShell.js';
import {
  consumeOverlayHistoryPop,
  markHistorySyncSkipped,
  popOverlayHistory,
  pushOverlayHistory,
} from '@/src/systems/Navigation.js';
import { AdBanner } from '@/components/ads/AdBanner';
import { trackScreenView } from '@/lib/analytics/shellAnalytics';
import { installProductionAnalyticsSink } from '@/lib/analytics/productionSink';
import { initPersistence } from '@/lib/persistence/Persistence';
import { startPeriodicSync, syncIfSignedIn, attachSyncLifecycle } from '@/lib/persistence/SyncEngine';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { registerServiceWorker } from '@/lib/shell/registerServiceWorker';
import { wireHubLinkPrefetch } from '@/lib/shell/warmHubCache';
import { prefetchBeforeNavigate, prefetchHubRoutes } from '@/lib/shell/hubRoutePrefetch';
import { registerShellRouter, unregisterShellRouter } from '@/lib/shell/shellRouter';

type ShellProvidersProps = {
  children: ReactNode;
};

export function ShellProviders({ children }: ShellProvidersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isPlay = pathname?.startsWith('/play');

  useEffect(() => {
    registerShellRouter((href) => {
      prefetchBeforeNavigate(router, href);
      router.push(href);
    });
    return () => unregisterShellRouter();
  }, [router]);

  useEffect(() => {
    if (isPlay) return;
    const prefetch = () => prefetchHubRoutes(router, { includePlay: pathname === '/' });
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(prefetch, { timeout: 3000 });
    } else {
      timeoutId = setTimeout(prefetch, 800);
    }
    return () => {
      if (idleId != null && typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, isPlay, pathname]);

  useEffect(() => {
    audio.attachDocumentLifecycle(() => window.__NEON);
    registerServiceWorker();
    const offPrefetch = wireHubLinkPrefetch(document, router);
    installProductionAnalyticsSink();

    const onSwPush = (e: MessageEvent) => {
      if (e.data?.type === 'neon-save-push') {
        void syncIfSignedIn();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwPush);

    void initPersistence().then(() => {
      attachSyncLifecycle();
      startPeriodicSync();
      void syncIfSignedIn();
    });

    return () => {
      offPrefetch();
      navigator.serviceWorker?.removeEventListener('message', onSwPush);
    };
  }, [router]);

  /** Shell routes play menu music; /play level music is owned by GameScene. */
  useEffect(() => {
    if (isPlay) return;
    audio.init();
    const s = SaveManager.loadSettings();
    audio.applySettings({
      sound: s.sound,
      music: s.music,
      sfxVolume: s.sfxVolume ?? DEFAULT_SFX_VOLUME,
      musicVolume: s.musicVolume ?? DEFAULT_MUSIC_VOLUME,
    });
    if (s.music) audio.setMenuMusic();
  }, [isPlay]);

  useEffect(() => {
    if (pathname) trackScreenView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (isPlay) {
      closeLegalShell();
      document.body.classList.remove('neon-legal-open');
      document.body.classList.remove('shell-scroll');
      document.body.classList.add('shell-play');
      hideShellBanner();
      return () => {
        document.body.classList.remove('shell-play');
        document.body.classList.add('shell-scroll');
      };
    }

    document.body.classList.add('shell-scroll');
    document.body.classList.remove('shell-play');
    wireLegalShellNavigation({
      pushOverlay: pushOverlayHistory,
      popOverlay: popOverlayHistory,
      markSkip: markHistorySyncSkipped,
    });
    const onPopState = () => {
      if (!isLegalShellOpen()) return;
      consumeOverlayHistoryPop();
      closeLegalShell({ fromHistory: true });
    };
    window.addEventListener('popstate', onPopState);
    void initAppShell({ showBanner: true });
    window.__neonGoBack = () => {
      if (window.history.length > 1) window.history.back();
    };

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.body.classList.remove('shell-scroll');
    };
  }, [isPlay]);

  return (
    <AuthProvider>
      <div className="shell-app-root">{children}</div>
      <AdBanner visible={process.env.NEXT_PUBLIC_SHELL_ADS === '1'} />
    </AuthProvider>
  );
}
