import { createElement, type SVGProps } from 'react';
import type { IconNode } from 'lucide';

export type LucideIconProps = {
  icon: IconNode;
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** When set, used as accessible name; otherwise decorative. */
  label?: string;
};

/** Render a Lucide icon node (same package as in-game power icons). */
export function LucideIcon({
  icon,
  size = 20,
  className,
  strokeWidth = 2,
  label,
}: LucideIconProps) {
  const aria = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...aria}
    >
      {icon.map(([tag, attrs], i) =>
        createElement(tag, { key: `${tag}-${i}`, ...(attrs as SVGProps<SVGElement>) }),
      )}
    </svg>
  );
}
