import type { ReactNode } from 'react';
import type { IconNode } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';

type SettingsSectionProps = {
  title: string;
  icon?: IconNode;
  children: ReactNode;
};

export function SettingsSection({ title, icon, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <div className="settings-section__head">
        {icon ? <LucideIcon icon={icon} size={16} className="settings-section__icon" /> : null}
        <h2 className="settings-section__title">{title}</h2>
      </div>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}
