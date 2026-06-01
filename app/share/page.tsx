'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, NeonButton } from '@/components/shell/AppShell';
import { PremiumLoader } from '@/components/shell/PremiumLoader';
import { useGameMeta } from '@/components/shell/useGameMeta';
import { SHELL_COPY } from '@/lib/copy/shell';
import { triggerProgressShare, shareOutcomeHint } from '@/lib/shell/triggerShare';
import { ROUTES } from '@/lib/shell/routes';

export default function SharePage() {
  const router = useRouter();
  const { gems, highScore } = useGameMeta();
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(true);
  const ran = useRef(false);
  const c = SHELL_COPY.share;

  const runShare = useCallback(async () => {
    setBusy(true);
    setHint(c.preparing);
    const res = await triggerProgressShare({ gems, highScore });
    setBusy(false);
    setHint(shareOutcomeHint(res));
  }, [c.preparing, gems, highScore]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void runShare();
  }, [runShare]);

  return (
    <AppShell title={c.title} tone="utility">
      <div className="share-launcher" role="status" aria-live="polite">
        {busy ? (
          <PremiumLoader title={SHELL_COPY.brand.name} subtitle={c.preparing} compact />
        ) : (
          <>
            {hint ? <p className="share-launcher-hint">{hint}</p> : null}
            <div className="shell-actions share-launcher-actions">
              <NeonButton variant="primary" onClick={() => void runShare()}>
                {c.retry}
              </NeonButton>
              <NeonButton variant="muted" onClick={() => router.push(ROUTES.home)}>
                HOME
              </NeonButton>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
