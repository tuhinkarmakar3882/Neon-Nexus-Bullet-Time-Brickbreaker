'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IconNode } from 'lucide';
import { shellBackHref, navigateToPlay } from '@/lib/shell/routes';
import { WorldBackdrop } from '@/components/shell/WorldBackdrop';
import { ShellBack } from '@/components/shell/ShellBack';
import { LucideIcon } from '@/components/shell/LucideIcon';

export type ShellTone = 'hub' | 'codex' | 'forge' | 'utility' | 'plain';

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backHref?: string;
  from?: string | null;
  tone?: ShellTone;
  /** Page identity chip beside back control; pass "" to hide */
  badge?: string;
  /** legal = full-height scrollable document area */
  layout?: 'default' | 'legal';
};

const TONE_BADGE: Record<ShellTone, string> = {
  hub: 'NEXUS GATE',
  codex: 'CODEX',
  forge: 'GARDEN SHOP',
  utility: 'PREFERENCES',
  plain: '',
};

export function AppShell({
  title,
  subtitle,
  children,
  backHref,
  from,
  tone = 'plain',
  badge,
  layout = 'default',
}: AppShellProps) {
  const href = backHref ?? shellBackHref(from);
  const chip = badge !== undefined ? badge : TONE_BADGE[tone];
  const legalLayout = layout === 'legal';

  return (
    <div
      className={[
        'shell-page',
        `shell-page--${tone}`,
        legalLayout ? 'shell-page--legal-layout' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <WorldBackdrop variant={tone === 'plain' ? 'utility' : tone} />
      <header className="shell-header shell-header--premium">
        {from === 'play' ? (
          <ShellBack onClick={() => navigateToPlay({ resume: true })} />
        ) : (
          <ShellBack href={href} />
        )}
        <div className="shell-header-meta">
          {chip ? <span className="shell-header-badge">{chip}</span> : null}
          <h1 className="shell-header-title shell-header-title--prominent">{title}</h1>
          {subtitle && subtitle.trim() ? (
            <p className="shell-header-subtitle">{subtitle}</p>
          ) : null}
        </div>
      </header>
      <div
        className={[
          'shell-card',
          'shell-card--premium',
          `shell-card--${tone}`,
          legalLayout ? 'shell-card--legal' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

function ShellLabel({ children, icon }: { children: ReactNode; icon?: IconNode }) {
  if (!icon) return <>{children}</>;
  return (
    <span className="shell-label">
      <LucideIcon icon={icon} size={18} className="shell-label__icon" />
      <span>{children}</span>
    </span>
  );
}

type NeonLinkProps = {
  href: string;
  children: ReactNode;
  icon?: IconNode;
  variant?: 'primary' | 'secondary' | 'economy' | 'muted' | 'tertiary';
  className?: string;
};

export function NeonLink({ href, children, icon, variant = 'secondary', className = '' }: NeonLinkProps) {
  if (variant === 'tertiary') {
    const cls = `neon-text-link ${className}`.trim();
    return (
      <Link href={href} className={cls} prefetch>
        <ShellLabel icon={icon}>{children}</ShellLabel>
      </Link>
    );
  }
  const cls = `neon-btn neon-btn-${variant} ${className}`.trim();
  return (
    <Link href={href} className={cls} prefetch>
      <ShellLabel icon={icon}>{children}</ShellLabel>
    </Link>
  );
}

type NeonButtonProps = {
  onClick?: () => void;
  children: ReactNode;
  icon?: IconNode;
  variant?: 'primary' | 'secondary' | 'economy' | 'danger' | 'muted';
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
};

export function NeonButton({
  onClick,
  children,
  icon,
  variant = 'secondary',
  type = 'button',
  className = '',
  disabled,
}: NeonButtonProps) {
  const cls = `neon-btn neon-btn-${variant} ${className}`.trim();
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      <ShellLabel icon={icon}>{children}</ShellLabel>
    </button>
  );
}
