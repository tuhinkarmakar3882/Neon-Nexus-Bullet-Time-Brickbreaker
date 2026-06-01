'use client';

import { useEffect } from 'react';
import { attachLegalShell, closeLegalShell } from '@/src/shell/LegalShell.js';

export function LegalShellMount() {
  useEffect(() => {
    attachLegalShell(null);
    const back = document.getElementById('html-shell-back');
    const onBack = () => {
      if (window.history.length > 1) window.history.back();
      else closeLegalShell();
    };
    back?.addEventListener('click', onBack);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLegalShell();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      back?.removeEventListener('click', onBack);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div
      id="html-shell"
      className="hidden"
      aria-hidden="true"
      role="dialog"
      aria-modal="true"
      aria-label="Legal document"
    >
      <header className="html-shell-bar">
        <button type="button" id="html-shell-back">
          ← BACK
        </button>
        <span id="html-shell-title">Legal</span>
      </header>
      <iframe id="html-shell-frame" title="Legal document content" />
    </div>
  );
}
