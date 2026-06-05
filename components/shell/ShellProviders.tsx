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
import { unregisterLegacyServiceWorkers } from '@/lib/shell/unregisterLegacyServiceWorkers';
import { registerShellRouter, unregisterShellRouter } from '@/lib/shell/shellRouter';
import { recordShellNavigation, syncShellStackOnPop } from '@/lib/shell/shellNavStack';

type ShellProvidersProps = {
  children: ReactNode;
};

export function ShellProviders({ children }: ShellProvidersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isPlay = pathname?.startsWith('/play');

  useEffect(() => {
    registerShellRouter((href) => {
      router.push(href);
    });
    return () => unregisterShellRouter();
  }, [router]);

  useEffect(() => {
    audio.attachDocumentLifecycle(() => window.__NEON);
    unregisterLegacyServiceWorkers();
    installProductionAnalyticsSink();

    void initPersistence().then(() => {
      attachSyncLifecycle();
      startPeriodicSync();
      void syncIfSignedIn();
    });
  }, []);

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
    if (!pathname || isPlay) return;
    const search = typeof window !== 'undefined' ? window.location.search : '';
    recordShellNavigation(pathname, search);
  }, [pathname, isPlay]);

  useEffect(() => {
    if (isPlay) return;
    const onPop = () => {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      syncShellStackOnPop(window.location.pathname, search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isPlay]);

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
