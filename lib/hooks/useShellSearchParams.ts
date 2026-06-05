'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Read URL search params without Next.js `useSearchParams()` — that hook suspends and
 * bakes a permanent loader into static export HTML when used inside Suspense.
 */
export function useShellSearchParams() {
  const pathname = usePathname();
  const [search, setSearch] = useState(() =>
    typeof window !== 'undefined' ? window.location.search : '',
  );

  const syncSearch = useCallback(() => {
    if (typeof window === 'undefined') return;
    setSearch(window.location.search);
  }, []);

  useEffect(() => {
    syncSearch();
  }, [pathname, syncSearch]);

  useEffect(() => {
    window.addEventListener('popstate', syncSearch);
    return () => window.removeEventListener('popstate', syncSearch);
  }, [syncSearch]);

  const params = useMemo(
    () => new URLSearchParams(search.replace(/^\?/, '')),
    [search],
  );

  return { params, search, syncSearch };
}
