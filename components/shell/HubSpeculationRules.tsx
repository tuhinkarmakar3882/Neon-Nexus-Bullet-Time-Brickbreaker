import { HUB_PREFETCH_ROUTES } from '@/lib/shell/hubRoutePrefetch';

/**
 * Browser-native hover/touch prefetch for hub routes (Speculation Rules API).
 * /play/ is excluded — Phaser chunks are prefetched via Next router on home idle only.
 */
export function HubSpeculationRules() {
  const rules = {
    prefetch: [
      {
        source: 'list',
        urls: [...HUB_PREFETCH_ROUTES],
        eagerness: 'moderate',
      },
    ],
  };

  return (
    <script
      type="speculationrules"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(rules) }}
    />
  );
}
