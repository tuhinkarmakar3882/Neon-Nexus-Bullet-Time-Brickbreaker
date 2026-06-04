'use client';

import { useEffect, useState } from 'react';
import { AppShell, NeonButton } from '@/components/shell/AppShell';
import { SHELL_COPY } from '@/lib/copy/shell';
import {
  canOfferInstall,
  isStandaloneDisplay,
  onInstallPromptReady,
  triggerInstallPrompt,
} from '@/src/systems/InstallPrompt.js';

export default function InstallPage() {
  const [hint, setHint] = useState('');
  const [canInstall, setCanInstall] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const c = SHELL_COPY.install;

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setCanInstall(canOfferInstall());
    setIsAndroid(/Android/i.test(navigator.userAgent));
    const off = onInstallPromptReady(() => setCanInstall(canOfferInstall()));
    return () => {
      off();
    };
  }, []);

  const onInstall = async () => {
    const { outcome } = await triggerInstallPrompt();
    if (outcome === 'accepted') setHint(c.status.accepted);
    else if (outcome === 'unavailable') setHint(c.status.unavailable);
    else setHint(c.status.dismissed);
  };

  return (
    <AppShell title={c.title} subtitle={c.subtitle} tone="utility">
      {standalone ? (
        <p className="shell-hint shell-hint--left">{c.installed}</p>
      ) : (
        <>
          <p className="shell-prose">{c.body}</p>
          <div className="shell-actions shell-actions--centered">
            {canInstall ? (
              <NeonButton variant="primary" onClick={onInstall}>
                {c.cta}
              </NeonButton>
            ) : (
              <p className="shell-hint shell-hint--left">
                {c.manualIos}
                <br />
                {c.manualAndroid}
              </p>
            )}
          </div>
        </>
      )}
      {hint ? <p className="shell-hint shell-hint--status">{hint}</p> : null}

      {isAndroid && !standalone && (
        <aside className="install-play-protect" role="note">
          <strong>{c.playProtectTitle}</strong>
          <p>{c.playProtectBody}</p>
        </aside>
      )}
    </AppShell>
  );
}
