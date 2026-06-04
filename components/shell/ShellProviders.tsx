'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { initAppShell, hideShellBanner } from '@/src/shell/initAppShell.js';
import { closeLegalShell, isLegalShellOpen, wireLegalShellNavigation } from '@/src/shell/LegalShell.js';
import {
  consumeOverlayHistoryPop,
  markHistorySyncSkipped,
  popOverlayHistory,
  pushOverlayHistory,
} from '@/src/systems/Navigation.js';
import { AdBanner } from '@/components/ads/AdBanner';
import { trackScreenView } from '@/lib/analytics/shellAnalytics';

type ShellProvidersProps = {
  children: ReactNode;
};

export function ShellProviders({ children }: ShellProvidersProps) {
  const pathname = usePathname();
  const isPlay = pathname?.startsWith('/play');

  useEffect(() => {
    if (pathname) trackScreenView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (isPlay) {
      document.body.classList.remove('shell-scroll');
      document.body.classList.add('shell-play');
      hideShellBanner();
      return () => {
        document.body.classList.remove('shell-play');
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
    <>
      <div className="shell-app-root">{children}</div>
      <AdBanner visible={process.env.NEXT_PUBLIC_SHELL_ADS === '1'} />
    </>
  );
}
