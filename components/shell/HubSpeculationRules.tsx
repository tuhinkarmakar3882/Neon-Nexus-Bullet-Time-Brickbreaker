import { HUB_DOCUMENT_PREFETCH_ROUTES } from '@/lib/shell/hubRoutePrefetch';

const PREFETCH_ROUTES = [...HUB_DOCUMENT_PREFETCH_ROUTES];

/**
 * Browser-native document prefetch for hub routes (excludes /codex/ — see hubRoutePrefetch).
 */
export function HubSpeculationRules() {
  const rules = {
    prefetch: [
      {
        source: 'list',
        urls: PREFETCH_ROUTES,
        eagerness: 'moderate',
      },
    ],
  };

  return (
    <>
      {PREFETCH_ROUTES.map((href) => (
        <link key={href} rel="prefetch" href={href} />
      ))}
      <script
        type="speculationrules"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(rules) }}
      />
    </>
  );
}
