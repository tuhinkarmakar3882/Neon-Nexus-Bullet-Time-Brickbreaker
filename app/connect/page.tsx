'use client';

import { useEffect } from 'react';
import { EXTERNAL_LINKS } from '@/lib/shell/routes';

/** Legacy /connect/ URL — forward straight to LinkedIn. */
export default function ConnectPage() {
  useEffect(() => {
    window.location.replace(EXTERNAL_LINKS.linkedIn);
  }, []);

  return null;
}
