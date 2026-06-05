'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ShellBack } from '@/components/shell/ShellBack';
import { attachLegalShell, closeLegalShell } from '@/src/shell/LegalShell.js';

export function LegalShellMount() {
  const pathname = usePathname();
  const isPlay = pathname?.startsWith('/play');

  useEffect(() => {
    if (isPlay) {
      closeLegalShell();
      document.body.classList.remove('neon-legal-open');
      return;
    }
    attachLegalShell(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLegalShell();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [isPlay]);

  if (isPlay) return null;

  return (
    <div
      id="html-shell"
      hidden
      aria-hidden="true"
      role="dialog"
      aria-modal="true"
      aria-label="Legal document"
    >
      <header className="html-shell-bar shell-header shell-header--premium">
        <ShellBack onClick={() => closeLegalShell()} label="Close" />
        <div className="shell-header-meta">
          <h1 id="html-shell-title" className="shell-header-title shell-header-title--prominent">
            Legal
          </h1>
        </div>
      </header>
      <iframe id="html-shell-frame" title="Legal document content" />
    </div>
  );
}
