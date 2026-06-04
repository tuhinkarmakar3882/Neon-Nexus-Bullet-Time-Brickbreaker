import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Codex',
};

export default function CodexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
