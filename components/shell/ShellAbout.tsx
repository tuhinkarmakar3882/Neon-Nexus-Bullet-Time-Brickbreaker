'use client';

import Link from 'next/link';
import { APP_VERSION, BUILD_STAMP } from '@/src/config/Version.js';
import { MUSIC_CREDITS } from '@/src/config/MusicCatalog.js';
import { ROUTES, legalEntryHref } from '@/lib/shell/routes';
import { SHELL_COPY } from '@/lib/copy/shell';

type ShellAboutProps = {
  /** Where the legal pages should return when opened from this screen. */
  parentReturnTo?: string;
};

export function ShellAbout({ parentReturnTo = ROUTES.settings }: ShellAboutProps) {
  return (
    <section className="shell-about" aria-labelledby="shell-about-title">
      <h2 id="shell-about-title" className="shell-about__title">
        About
      </h2>
      <p className="shell-about__meta">
        v{APP_VERSION} · build {BUILD_STAMP}
      </p>
      <div className="shell-about__links">
        <Link href={legalEntryHref('terms', parentReturnTo)} className="neon-text-link" >
          Terms of Service
        </Link>
        <Link href={legalEntryHref('privacy', parentReturnTo)} className="neon-text-link" >
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
