import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Install app',
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return children;
}
