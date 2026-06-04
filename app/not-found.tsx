'use client';

import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { ROUTES } from '@/lib/shell/routes';
import { SHELL_COPY } from '@/lib/copy/shell';

export default function NotFound() {
  const c = SHELL_COPY.notFound;
  return (
    <AppShell title={c.title} subtitle={c.subtitle} tone="utility" badge="">
      <div className="shell-actions shell-actions--centered">
        <Link href={ROUTES.home} className="neon-btn neon-btn-primary shell-block-link">
          {c.cta}
        </Link>
      </div>
    </AppShell>
  );
}
