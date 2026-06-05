import type { ReactNode } from 'react';
import Link from 'next/link';

type LegalProseProps = {
  children: ReactNode;
  showFooter?: boolean;
  siblingHref?: string;
  siblingLabel?: string;
};

export function LegalProse({ children, showFooter = true, siblingHref, siblingLabel }: LegalProseProps) {
  return (
    <article className="legal-prose">
      {children}
      {showFooter && siblingHref && siblingLabel ? (
        <p className="legal-prose__footer">
          <Link href={siblingHref} prefetch>
            {siblingLabel}
          </Link>
        </p>
      ) : null}
    </article>
  );
}
