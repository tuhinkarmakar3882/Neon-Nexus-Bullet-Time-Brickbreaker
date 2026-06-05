'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { NeonButton } from '@/components/shell/AppShell';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { SHELL_COPY } from '@/lib/copy/shell';

export type GemSpendPreview = {
  kind: 'hull' | 'trail' | 'theme';
  hullColor: string;
  trailColor: string;
  themeColor: string;
  hullLabel: string;
  trailLabel: string;
  themeLabel: string;
};

type GemSpendConfirmProps = {
  itemLabel: string;
  cost: number;
  balance: number;
  preview: GemSpendPreview;
  onConfirm: () => void;
  onCancel: () => void;
};

function PreviewSlot({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span className={active ? 'gem-spend-confirm__preview-slot--new' : undefined}>
      {label}
    </span>
  );
}

export function GemSpendConfirm({
  itemLabel,
  cost,
  balance,
  preview,
  onConfirm,
  onCancel,
}: GemSpendConfirmProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useFocusTrap(cardRef, mounted);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const c = SHELL_COPY.shop.confirm;
  const canAfford = balance >= cost;
  const after = balance - cost;
  const shortfall = Math.max(0, cost - balance);

  const previewStyle = {
    '--preview-hull': preview.hullColor,
    '--preview-trail': preview.trailColor,
    '--preview-theme': preview.themeColor,
  } as CSSProperties;

  if (!mounted) return null;

  return createPortal(
    <div
      className="gem-spend-confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="gem-spend-title"
      onClick={onCancel}
    >
      <div
        className="gem-spend-confirm__card"
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="gem-spend-title" className="gem-spend-confirm__title">
          {c.title}
        </h2>
        <p className="gem-spend-confirm__body">{c.body(itemLabel, cost)}</p>

        <div className="gem-spend-confirm__preview" style={previewStyle}>
          <p className="gem-spend-confirm__preview-label">{c.previewLabel}</p>
          <div className="gem-spend-confirm__preview-arena" aria-hidden>
            <div className="gem-spend-confirm__preview-ball-wrap">
              <span className="gem-spend-confirm__preview-trail" />
              <span className="gem-spend-confirm__preview-ball" />
            </div>
            <div className="gem-spend-confirm__preview-paddle" />
          </div>
          <p className="gem-spend-confirm__preview-caption">
            <PreviewSlot label={preview.hullLabel} active={preview.kind === 'hull'} />
            {' hull · '}
            <PreviewSlot label={preview.trailLabel} active={preview.kind === 'trail'} />
            {' trail · '}
            <PreviewSlot label={preview.themeLabel} active={preview.kind === 'theme'} />
            {' garden'}
          </p>
        </div>

        <p
          className={`gem-spend-confirm__balance${canAfford ? '' : ' gem-spend-confirm__balance--insufficient'}`}
        >
          {canAfford ? c.balance(balance, after) : c.balanceInsufficient(balance, cost)}
        </p>
        {!canAfford ? (
          <p className="gem-spend-confirm__shortfall" role="alert">
            {c.insufficient(shortfall)}
          </p>
        ) : null}

        <div className="gem-spend-confirm__actions">
          <NeonButton variant="muted" onClick={onCancel}>
            {c.cancel}
          </NeonButton>
          <NeonButton
            variant="economy"
            onClick={canAfford ? onConfirm : undefined}
            disabled={!canAfford}
            aria-disabled={!canAfford}
          >
            {canAfford ? c.confirm : c.confirmDisabled}
          </NeonButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
