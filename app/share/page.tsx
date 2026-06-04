'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Share2 } from 'lucide';
import { AppShell, NeonButton } from '@/components/shell/AppShell';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { PremiumLoader } from '@/components/shell/PremiumLoader';
import { useGameMeta } from '@/components/shell/useGameMeta';
import { SHELL_COPY } from '@/lib/copy/shell';
import {
  renderProgressSharePreview,
  triggerProgressShare,
  shareOutcomeHint,
} from '@/lib/shell/triggerShare';
import { ROUTES } from '@/lib/shell/routes';

export default function SharePage() {
  const { gems, highScore } = useGameMeta();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const c = SHELL_COPY.share;

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const url = await renderProgressSharePreview({ gems, highScore });
      setPreviewUrl(url);
    } finally {
      setLoadingPreview(false);
    }
  }, [gems, highScore]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const runShare = useCallback(async () => {
    setBusy(true);
    setHint(c.preparing);
    const res = await triggerProgressShare({ gems, highScore });
    setBusy(false);
    setHint(shareOutcomeHint(res));
  }, [c.preparing, gems, highScore]);

  return (
    <AppShell title={c.title} subtitle={c.subtitle} tone="utility" badge="">
      <div className="share-launcher" role="region" aria-label="Share progress">
        {loadingPreview ? (
          <PremiumLoader title={SHELL_COPY.brand.name} subtitle={c.preparing} compact />
        ) : (
          <>
            {previewUrl ? (
              <figure className="share-preview">
                <img src={previewUrl} alt="Your Neon Nexus progress share card" className="share-preview__img" />
                <figcaption className="share-preview__caption">{c.previewHint}</figcaption>
              </figure>
            ) : null}
            {hint ? (
              <p className="share-launcher-hint" role="status" aria-live="polite">
                {hint}
              </p>
            ) : null}
            <div className="shell-actions share-launcher-actions">
              <NeonButton variant="primary" icon={Share2} onClick={() => void runShare()} disabled={busy}>
                {busy ? c.preparing : c.shareCta}
              </NeonButton>
              <Link href={ROUTES.home} className="neon-btn neon-btn-muted">
                <span className="shell-label">
                  <LucideIcon icon={Home} size={18} className="shell-label__icon" />
                  <span>Home</span>
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
