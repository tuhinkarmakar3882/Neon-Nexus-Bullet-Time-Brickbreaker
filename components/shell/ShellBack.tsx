'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { performShellBack } from '@/lib/shell/shellBack';
import { ROUTES } from '@/lib/shell/routes';

type ShellBackProps = {
  /** Fallback when there is no prior hub screen in this session. */
  fallbackHref?: string;
  playResume?: boolean;
  onClick?: () => void;
  label?: string;
};

export function ShellBack({
  fallbackHref = ROUTES.home,
  playResume,
  onClick,
  label = 'Back',
}: ShellBackProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }
    performShellBack(router, { fallbackHref, playResume });
  };

  return (
    <button type="button" className="shell-back" onClick={handleBack} aria-label={label}>
      <LucideIcon icon={ChevronLeft} size={20} className="shell-back__icon" />
      <span>{label}</span>
    </button>
  );
}
