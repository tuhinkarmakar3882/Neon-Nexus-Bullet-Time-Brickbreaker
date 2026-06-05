'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NeonButton } from '@/components/shell/AppShell';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { SHELL_COPY } from '@/lib/copy/shell';

type GemSpendConfirmProps = {
  itemLabel: string;
  cost: number;
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function GemSpendConfirm({ itemLabel, cost, balance, onConfirm, onCancel }: GemSpendConfirmProps) {
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
  const after = balance - cost;

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
        <p className="gem-spend-confirm__body">
          {c.body(itemLabel, cost)}
        </p>
        <p className="gem-spend-confirm__balance">
          {c.balance(balance, after)}
        </p>
        <div className="gem-spend-confirm__actions">
          <NeonButton variant="muted" onClick={onCancel}>
            {c.cancel}
          </NeonButton>
          <NeonButton variant="economy" onClick={onConfirm}>
            {c.confirm}
          </NeonButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
