import { AdsConfig } from '../config/AdsConfig.js';

const PLACEHOLDER_CLASS = 'ad-banner-placeholder';

/** Reserved bottom strip when no live AdSense / AdMob creative is loaded yet. */
export function applyBannerPlaceholder(el = document.getElementById('ad-banner')) {
  if (!el || el.dataset.adsense === '1') return;
  const label = AdsConfig.banner?.placeholderLabel ?? 'Sponsored';
  el.innerHTML = `<span class="${PLACEHOLDER_CLASS}">${label}</span>`;
}

export function showWebBannerBar() {
  const el = document.getElementById('ad-banner');
  if (!el) return null;
  el.classList.add('visible', 'ad-banner-slot--visible');
  el.setAttribute('aria-hidden', 'false');
  return el;
}

export function hideWebBannerBar() {
  const el = document.getElementById('ad-banner');
  if (el) {
    el.classList.remove('visible', 'ad-banner-slot--visible');
    el.setAttribute('aria-hidden', 'true');
  }
}
