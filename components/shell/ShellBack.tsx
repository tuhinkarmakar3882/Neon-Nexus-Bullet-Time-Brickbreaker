'use client';

import { ChevronLeft } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';

type ShellBackProps = {
  href?: string;
  onClick?: () => void;
  label?: string;
};

export function ShellBack({ href, onClick, label = 'Back' }: ShellBackProps) {
  const inner = (
    <>
      <LucideIcon icon={ChevronLeft} size={20} className="shell-back__icon" />
      <span>{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="shell-back" onClick={onClick} aria-label={label}>
        {inner}
      </button>
    );
  }

  if (href?.startsWith('http')) {
    return (
      <a href={href} className="shell-back" aria-label={label}>
        {inner}
      </a>
    );
  }

  return (
    <a href={href ?? '/'} className="shell-back" aria-label={label}>
      {inner}
    </a>
  );
}
