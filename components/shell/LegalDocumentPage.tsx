'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { ShellBack } from '@/components/shell/ShellBack';
import { PremiumLoader } from '@/components/shell/PremiumLoader';
import { TermsContent } from '@/components/shell/legal/TermsContent';
import { PrivacyContent } from '@/components/shell/legal/PrivacyContent';
import { ROUTES } from '@/lib/shell/routes';
import { closeLegalShell } from '@/src/shell/LegalShell.js';

type LegalDoc = 'terms' | 'privacy';

const TITLES: Record<LegalDoc, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

function LegalEmbedView({ doc, inShell }: { doc: LegalDoc; inShell: boolean }) {
  const router = useRouter();

  const onBack = () => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({ neonShell: 'close' }, '*');
      return;
    }
    if (closeLegalShell()) return;
    router.push(ROUTES.home);
  };

  return (
    <div className={`shell-page shell-page--legal-embed${inShell ? ' shell-page--legal-in-shell' : ''}`}>
      {!inShell ? (
        <header className="legal-embed-header shell-header shell-header--premium">
          <ShellBack onClick={onBack} />
          <div className="shell-header-meta">
            <h1 className="shell-header-title shell-header-title--prominent">{TITLES[doc]}</h1>
          </div>
        </header>
      ) : null}
      <div className="legal-embed-scroll">
        {doc === 'terms' ? (
          <TermsContent showFooter={!inShell} />
        ) : (
          <PrivacyContent showFooter={!inShell} />
        )}
      </div>
    </div>
  );
}

function LegalStandaloneView({ doc }: { doc: LegalDoc }) {
  return (
    <AppShell title={TITLES[doc]} tone="plain" badge="" layout="legal">
      <div className="legal-standalone-scroll">
        {doc === 'terms' ? <TermsContent showFooter /> : <PrivacyContent showFooter />}
      </div>
    </AppShell>
  );
}

function LegalFrame({ doc }: { doc: LegalDoc }) {
  const searchParams = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const inShell = searchParams.get('shell') === '1';

  if (embed) {
    return <LegalEmbedView doc={doc} inShell={inShell} />;
  }

  return <LegalStandaloneView doc={doc} />;
}

export function LegalDocumentPage({ doc }: { doc: LegalDoc }) {
  return (
    <Suspense fallback={<PremiumLoader title={TITLES[doc]} />}>
      <LegalFrame doc={doc} />
    </Suspense>
  );
}
