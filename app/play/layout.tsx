import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Play',
};

/** Play route uses full-viewport shell (body.shell-play from ShellProviders). */
export default function PlayLayout({ children }: { children: ReactNode }) {
  return children;
}
