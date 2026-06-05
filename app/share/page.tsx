'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/shell/routes';
import { PremiumLoader } from '@/components/shell/PremiumLoader';
import { SHELL_COPY } from '@/lib/copy/shell';

/** Legacy /share/ route — opens the hub share modal instead of duplicating UI. */
export default function SharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`${ROUTES.home}?share=1`);
  }, [router]);

  return <PremiumLoader title={SHELL_COPY.brand.name} subtitle={SHELL_COPY.share.preparing} compact />;
}
