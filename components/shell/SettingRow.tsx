import type { ReactNode } from 'react';
import type { IconNode } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';

type SettingRowProps = {
  icon?: IconNode;
  label: string;
  controlId?: string;
  children: ReactNode;
  stacked?: boolean;
};

export function SettingRow({ icon, label, controlId, children, stacked }: SettingRowProps) {
  const labelEl = controlId ? (
    <label htmlFor={controlId} className="setting-row__label">
      {icon ? <LucideIcon icon={icon} size={18} className="setting-row__label-icon" /> : null}
      <span>{label}</span>
    </label>
  ) : (
    <div className="setting-row__label">
      {icon ? <LucideIcon icon={icon} size={18} className="setting-row__label-icon" /> : null}
      <span>{label}</span>
    </div>
  );

  return (
    <div className={`setting-row${stacked ? ' setting-row--stacked' : ''}`}>
      {labelEl}
      <div className="setting-row__control">{children}</div>
    </div>
  );
}
