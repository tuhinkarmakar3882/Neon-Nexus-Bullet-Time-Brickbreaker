'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { IconNode } from 'lucide';
import { shellBackHref, navigateToPlay } from '@/lib/shell/routes';
import { WorldBackdrop } from '@/components/shell/WorldBackdrop';
import { LucideIcon } from '@/components/shell/LucideIcon';

export type ShellTone = 'hub' | 'codex' | 'forge' | 'utility' | 'plain';

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backHref?: string;
  from?: string | null;
  tone?: ShellTone;
  /** Page identity chip beside back control */
  badge?: string;
};

const TONE_BADGE: Record<ShellTone, string> = {
  hub: 'NEXUS GATE',
  codex: 'ARCHIVE // TERMINAL',
  forge: 'MERCHANT FORGE',
  utility: 'SYSTEM',
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
}: AppShellProps) {
  const router = useRouter();
  const href = backHref ?? shellBackHref(from);
  const chip = badge ?? TONE_BADGE[tone];

  const onBack = () => {
    if (from === 'play') {
      navigateToPlay({ resume: true });
      return;
    }
    if (href.startsWith('http')) {
      window.location.href = href;
      return;
    }
    router.push(href);
  };

  return (
    <div className={`shell-page shell-page--${tone}`}>
      <WorldBackdrop variant={tone} />
      <header className="shell-header">
        <button type="button" className="shell-back" onClick={onBack} aria-label="Go back">
          ← BACK
        </button>
        <div className="shell-header-meta">
          {chip ? <span className="shell-header-badge">{chip}</span> : null}
          <span className="shell-header-title">{title}</span>
        </div>
      </header>
      <div className={`shell-card shell-card--${tone}`}>
        {subtitle ? <p className="shell-subtitle shell-subtitle--left">{subtitle}</p> : null}
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
