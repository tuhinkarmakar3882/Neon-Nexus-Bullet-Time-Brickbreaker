/**
 * Shared AdSense loader + banner mount for shell #ad-banner and Phaser web provider.
 */

export type AdSenseSlot = { client: string; slot: string };

export function getAdSenseSlotFromEnv(): AdSenseSlot | null {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
    ?? process.env.VITE_ADSENSE_CLIENT
    ?? '';
  const slot = process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT
    ?? process.env.VITE_ADSENSE_BANNER_SLOT
    ?? '';
  if (!client || !slot) return null;
  return { client, slot };
}

export function injectAdSenseScript(client: string): void {
  if (typeof document === 'undefined' || !client) return;
  if (document.querySelector('script[data-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  s.crossOrigin = 'anonymous';
  s.dataset.adsense = '1';
  document.head.appendChild(s);
}

/** Mount an AdSense display unit into #ad-banner (or another element). */
export function mountAdSenseBanner(
  el: HTMLElement | null,
  slot: AdSenseSlot,
): boolean {
  if (!el || !slot.client || !slot.slot) return false;

  injectAdSenseScript(slot.client);
  el.innerHTML = '';
  el.dataset.adsense = '1';

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.style.width = '100%';
  ins.style.minHeight = '50px';
  ins.setAttribute('data-ad-client', slot.client);
  ins.setAttribute('data-ad-slot', slot.slot);
  ins.setAttribute('data-full-width-responsive', 'true');
  el.appendChild(ins);

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    return true;
  } catch (e) {
    console.warn('[Ads] AdSense push failed', e);
    el.removeAttribute('data-adsense');
    return false;
  }
}

export function applyBannerPlaceholder(
  el: HTMLElement | null,
  label = 'Sponsored',
): void {
  if (!el || el.dataset.adsense === '1') return;
  el.innerHTML = `<span class="ad-banner-placeholder">${label}</span>`;
}
