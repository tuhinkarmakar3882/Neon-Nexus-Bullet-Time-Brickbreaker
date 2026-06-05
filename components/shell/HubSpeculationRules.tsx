import { HUB_PREFETCH_ROUTES } from '@/lib/shell/hubRoutePrefetch';

const PREFETCH_ROUTES = [...HUB_PREFETCH_ROUTES];

/**
 * Browser-native prefetch hints for hub routes.
 * Speculation Rules (Chrome) + classic link prefetch for broader support.
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
