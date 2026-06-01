/** Open hosted legal pages (PWA / Capacitor WebView). */
export function legalPageUrl(page) {
  if (typeof window === 'undefined') return page;
  return new URL(page, window.location.href).href;
}

export function openLegalPage(page) {
  if (typeof window === 'undefined') return;
  window.open(legalPageUrl(page), '_blank', 'noopener,noreferrer');
}

/** Short notice for purchase / settings UI. */
export const LEGAL_PURCHASE_NOTICE = 'Entertainment only. Purchases are subject to Terms; refunds per platform policy.';
