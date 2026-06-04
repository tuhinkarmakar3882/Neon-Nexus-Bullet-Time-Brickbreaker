'use client';

import { AppShell, NeonButton } from '@/components/shell/AppShell';
import { SHELL_COPY } from '@/lib/copy/shell';

const LINKEDIN = 'https://www.linkedin.com/in/tuhinkarmakar3882/';

export default function ConnectPage() {
  const c = SHELL_COPY.connect;
  return (
    <AppShell title={c.title} subtitle={c.subtitle} tone="utility" badge="">
      <p className="shell-hint shell-hint--left">{c.externalHint}</p>
      <p className="shell-prose">{c.body}</p>
      <div className="shell-actions shell-actions--centered">
        <NeonButton
          variant="primary"
          onClick={() => window.open(LINKEDIN, '_blank', 'noopener,noreferrer')}
        >
          {c.cta}
        </NeonButton>
      </div>
    </AppShell>
  );
}
