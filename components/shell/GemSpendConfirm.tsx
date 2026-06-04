'use client';

import { NeonButton } from '@/components/shell/AppShell';
import { SHELL_COPY } from '@/lib/copy/shell';

type GemSpendConfirmProps = {
  itemLabel: string;
  cost: number;
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function GemSpendConfirm({ itemLabel, cost, balance, onConfirm, onCancel }: GemSpendConfirmProps) {
  const c = SHELL_COPY.shop.confirm;
  const after = balance - cost;

  return (
    <div className="gem-spend-confirm" role="alertdialog" aria-labelledby="gem-spend-title">
      <div className="gem-spend-confirm__card">
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
    </div>
  );
}
