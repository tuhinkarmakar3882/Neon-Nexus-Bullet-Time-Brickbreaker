/** Production analytics sink — forwards neon:analytics to gtag when present. */

type AnalyticsDetail = {
  event: string;
  ts?: number;
  [key: string]: string | number | boolean | undefined;
};

type GtagFn = (
  command: 'event',
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>,
) => void;

function toGtagParams(detail: AnalyticsDetail): Record<string, string | number | boolean | undefined> {
  const { event: _event, ts, ...rest } = detail;
  return { event_timestamp: ts ?? Date.now(), ...rest };
}

export function installProductionAnalyticsSink(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('neon:analytics', (raw) => {
    const detail = (raw as CustomEvent<AnalyticsDetail>).detail;
    if (!detail?.event) return;

    const gtag = (window as Window & { gtag?: GtagFn }).gtag;
    if (typeof gtag === 'function') {
      gtag('event', detail.event, toGtagParams(detail));
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      console.info('[neon:analytics]', detail.event, toGtagParams(detail));
    }
  });
}
