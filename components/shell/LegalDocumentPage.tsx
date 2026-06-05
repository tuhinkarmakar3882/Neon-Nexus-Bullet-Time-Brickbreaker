'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { ShellBack } from '@/components/shell/ShellBack';
import { TermsContent } from '@/components/shell/legal/TermsContent';
import { PrivacyContent } from '@/components/shell/legal/PrivacyContent';
import { resolveShellBackHref, type LegalNavContext } from '@/lib/shell/routes';
import { performShellBack } from '@/lib/shell/shellBack';
import { useShellSearchParams } from '@/lib/hooks/useShellSearchParams';
import { closeLegalShell } from '@/src/shell/LegalShell.js';

type LegalDoc = 'terms' | 'privacy';

const TITLES: Record<LegalDoc, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

function useLegalNav(): LegalNavContext {
  const { params } = useShellSearchParams();
  return {
    from: params.get('from'),
    returnTo: params.get('return'),
  };
}

function LegalEmbedView({ doc, inShell }: { doc: LegalDoc; inShell: boolean }) {
  const router = useRouter();
  const nav = useLegalNav();

  const onBack = () => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({ neonShell: 'close' }, '*');
      return;
    }
    if (closeLegalShell()) return;
    performShellBack(router, {
      fallbackHref: resolveShellBackHref(nav.from, nav.returnTo),
    });
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
          <TermsContent showFooter={!inShell} nav={nav} />
        ) : (
          <PrivacyContent showFooter={!inShell} nav={nav} />
        )}
      </div>
    </div>
  );
}

function LegalStandaloneView({ doc }: { doc: LegalDoc }) {
  const nav = useLegalNav();
  const backHref = resolveShellBackHref(nav.from, nav.returnTo);

  return (
    <AppShell title={TITLES[doc]} tone="plain" badge="" layout="legal" backHref={backHref} from={nav.from}>
      <div className="legal-standalone-scroll">
        {doc === 'terms' ? <TermsContent showFooter nav={nav} /> : <PrivacyContent showFooter nav={nav} />}
      </div>
    </AppShell>
  );
}

export function LegalDocumentPage({ doc }: { doc: LegalDoc }) {
  const { params } = useShellSearchParams();
  const embed = params.get('embed') === '1';
  const inShell = params.get('shell') === '1';

  if (embed) {
    return <LegalEmbedView doc={doc} inShell={inShell} />;
  }

  return <LegalStandaloneView doc={doc} />;
}
