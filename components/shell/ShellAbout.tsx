'use client';

import { APP_VERSION, BUILD_STAMP } from '@/src/config/Version.js';
import { openLegalPage } from '@/src/utils/LegalLinks.js';
import { SHELL_COPY } from '@/lib/copy/shell';

export function ShellAbout() {
  return (
    <section className="shell-about" aria-labelledby="shell-about-title">
      <h2 id="shell-about-title" className="shell-about__title">
        ABOUT
      </h2>
      <p className="shell-about__meta">
        v{APP_VERSION} · build {BUILD_STAMP}
      </p>
      <div className="shell-about__links">
        <button type="button" className="neon-text-link" onClick={() => openLegalPage('terms.html')}>
          Terms of Service
        </button>
        <button type="button" className="neon-text-link" onClick={() => openLegalPage('privacy.html')}>
          Privacy Policy
        </button>
      </div>
      <p className="shell-about__credit">{SHELL_COPY.legal.footerCredit}</p>
    </section>
  );
}
