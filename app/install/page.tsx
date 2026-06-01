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
    <AppShell title={c.title} tone="utility">
      <h1 className="shell-title shell-title--compact">{c.title}</h1>
      <p className="shell-subtitle">{c.subtitle}</p>

      {standalone ? (
        <p className="shell-hint" style={{ marginTop: 20 }}>
          {c.installed}
        </p>
      ) : (
        <>
          <p className="shell-prose">{c.body}</p>
          <div className="shell-actions shell-actions--centered">
            {canInstall ? (
              <NeonButton variant="primary" onClick={onInstall}>
                {c.cta}
              </NeonButton>
            ) : (
              <p className="shell-hint">
                {c.manualIos}
                <br />
                {c.manualAndroid}
              </p>
            )}
          </div>
        </>
      )}
      {hint && <p className="shell-hint" style={{ marginTop: 16 }}>{hint}</p>}

      {isAndroid && !standalone && (
        <aside className="shell-hint" style={{ marginTop: 24, textAlign: 'left' }} role="note">
          <strong>{c.playProtectTitle}</strong>
          <p style={{ marginTop: 8, marginBottom: 0 }}>{c.playProtectBody}</p>
        </aside>
      )}
    </AppShell>
  );
}
