'use client';

import { Archive } from 'lucide';
import { useAuth } from '@/lib/auth/AuthProvider';
import { SettingsSection } from '@/components/shell/SettingsSection';
import { SaveBackupSection } from '@/components/shell/SaveBackupSection';
import { SHELL_COPY } from '@/lib/copy/shell';

/** Export / import / delete — only when cloud save is deployed. */
export function SettingsBackupPanel() {
  const { configured } = useAuth();
  if (!configured) return null;

  return (
    <SettingsSection title={SHELL_COPY.settings.sections.backup} icon={Archive}>
      <SaveBackupSection />
    </SettingsSection>
  );
}
