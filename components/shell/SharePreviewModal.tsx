'use client';

import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { Share2 } from 'lucide';
import { NeonButton } from '@/components/shell/AppShell';
import { PremiumLoader } from '@/components/shell/PremiumLoader';
import { renderProgressSharePreview, triggerProgressShare, shareOutcomeHint } from '@/lib/shell/triggerShare';
import { trackShareFunnel } from '@/lib/analytics/shellAnalytics';
import { SHELL_COPY } from '@/lib/copy/shell';

type SharePreviewModalProps = {
  gems: number;
  highScore: number;
  onClose: () => void;
};

export function SharePreviewModal({ gems, highScore, onClose }: SharePreviewModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  useFocusTrap(cardRef, true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const c = SHELL_COPY.share;

  useEffect(() => {
    trackShareFunnel('preview', 'home_modal');
    let cancelled = false;
    void (async () => {
      const url = await renderProgressSharePreview({ gems, highScore });
      if (!cancelled) setPreviewUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [gems, highScore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const runShare = async () => {
    setBusy(true);
    trackShareFunnel('start', 'home_modal');
    setHint(c.preparing);
    const res = await triggerProgressShare({ gems, highScore });
    setBusy(false);
    setHint(shareOutcomeHint(res));
    if (res.ok) trackShareFunnel('complete', 'home_modal');
    else trackShareFunnel('cancel', 'home_modal');
  };

  return (
    <div className="share-preview-modal" role="dialog" aria-modal="true" aria-label={c.title}>
      <div className="share-preview-modal__card" ref={cardRef}>
        <button type="button" className="share-preview-modal__close" onClick={onClose} aria-label="Close preview">
          ×
        </button>
        {!previewUrl ? (
          <PremiumLoader compact />
        ) : (
          <img src={previewUrl} alt="Share card preview" className="share-preview-modal__img" />
        )}
        {hint ? (
          <p className="share-preview-modal__hint" role="status" aria-live="polite">
            {hint}
          </p>
        ) : (
          <p className="share-preview-modal__hint">{c.previewHint}</p>
        )}
        <NeonButton variant="primary" icon={Share2} onClick={() => void runShare()} disabled={busy || !previewUrl}>
          {busy ? c.preparing : c.shareCta}
        </NeonButton>
      </div>
    </div>
  );
}
