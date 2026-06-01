'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { initAppShell, hideShellBanner } from '@/src/shell/initAppShell.js';
import { wireLegalShellNavigation } from '@/src/shell/LegalShell.js';
import {
  markHistorySyncSkipped,
  popOverlayHistory,
  pushOverlayHistory,
} from '@/src/systems/Navigation.js';
import { AdBanner } from '@/components/ads/AdBanner';

type ShellProvidersProps = {
  children: ReactNode;
};

export function ShellProviders({ children }: ShellProvidersProps) {
  const pathname = usePathname();
  const isPlay = pathname?.startsWith('/play');

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
    void initAppShell({ showBanner: true });
    window.__neonGoBack = () => {
      if (window.history.length > 1) window.history.back();
    };

    return () => {
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
