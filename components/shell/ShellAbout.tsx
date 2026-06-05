'use client';

import Link from 'next/link';
import { APP_VERSION, BUILD_STAMP } from '@/src/config/Version.js';
import { MUSIC_CREDITS } from '@/src/config/MusicCatalog.js';
import { ROUTES } from '@/lib/shell/routes';
import { SHELL_COPY } from '@/lib/copy/shell';

export function ShellAbout() {
  return (
    <section className="shell-about" aria-labelledby="shell-about-title">
      <h2 id="shell-about-title" className="shell-about__title">
        About
      </h2>
      <p className="shell-about__meta">
        v{APP_VERSION} · build {BUILD_STAMP}
      </p>
      <div className="shell-about__links">
        <Link href={ROUTES.terms} className="neon-text-link" prefetch>
          Terms of Service
        </Link>
        <Link href={ROUTES.privacy} className="neon-text-link" prefetch>
          Privacy Policy
        </Link>
      </div>
      <p className="shell-about__music" role="note">
        {MUSIC_CREDITS}
      </p>
      <p className="shell-about__credit">{SHELL_COPY.legal.footerCredit}</p>
    </section>
  );
}
