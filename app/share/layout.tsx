import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Share progress',
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
