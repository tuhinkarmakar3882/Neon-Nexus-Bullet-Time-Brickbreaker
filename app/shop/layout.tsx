import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Garden Shop',
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
