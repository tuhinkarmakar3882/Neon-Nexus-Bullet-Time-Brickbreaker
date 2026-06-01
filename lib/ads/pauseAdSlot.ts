/**
 * In-game pause menu banner — DOM slot positioned over the Phaser canvas.
 */

import { AD_PLACEMENTS } from '@/lib/ads/placements';
import { applyBannerPlaceholder, getAdSenseSlotFromEnv, mountAdSenseBanner } from '@/lib/ads/adsenseWeb';

export type PauseAdRect = {
  /** Center X in Phaser game coordinates */
  cx: number;
  /** Center Y in Phaser game coordinates */
  cy: number;
  width: number;
  height: number;
};

function getSlotEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('pause-ad-slot');
}

function gameToScreen(
  game: import('phaser').Game,
  cx: number,
  cy: number,
  w: number,
  h: number,
) {
  const canvas = game.canvas;
  if (!canvas) return null;
  const bounds = canvas.getBoundingClientRect();
  const sx = bounds.width / Math.max(1, game.scale.width);
  const sy = bounds.height / Math.max(1, game.scale.height);
  const width = w * sx;
  const height = h * sy;
  const left = bounds.left + cx * sx - width / 2;
  const top = bounds.top + cy * sy - height / 2;
  return { left, top, width, height };
}

/** Show pause-menu ad slot aligned to a Phaser layout rect. */
export function showPauseAdSlot(game: import('phaser').Game, rect: PauseAdRect): void {
  const el = getSlotEl();
  if (!el || !game?.canvas) return;

  const box = gameToScreen(game, rect.cx, rect.cy, rect.width, rect.height);
  if (!box) return;

  el.dataset.placement = AD_PLACEMENTS.PAUSE_MENU_BANNER;
  el.style.left = `${Math.round(box.left)}px`;
  el.style.top = `${Math.round(box.top)}px`;
  el.style.width = `${Math.round(box.width)}px`;
  el.style.height = `${Math.round(box.height)}px`;
  el.classList.add('pause-ad-slot--visible');
  el.setAttribute('aria-hidden', 'false');

  const slot = getAdSenseSlotFromEnv();
  if (slot && mountAdSenseBanner(el, slot)) return;
  applyBannerPlaceholder(el);
}

/** Reposition on canvas resize while pause stays open. */
export function syncPauseAdSlot(game: import('phaser').Game, rect: PauseAdRect): void {
  if (!getSlotEl()?.classList.contains('pause-ad-slot--visible')) return;
  showPauseAdSlot(game, rect);
}

/** Mount ad inside a React overlay card (pause, game over, …). */
export function mountInlineOverlayAd(
  el: HTMLElement,
  placement: (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS] = AD_PLACEMENTS.PAUSE_MENU_BANNER,
): void {
  el.dataset.placement = placement;
  el.classList.add('pause-ad-slot--visible', 'pause-ad-slot--inline');
  el.setAttribute('aria-hidden', 'false');
  el.style.left = '';
  el.style.top = '';
  el.style.width = '';
  el.style.height = '';

  const slot = getAdSenseSlotFromEnv();
  if (slot && mountAdSenseBanner(el, slot)) return;
  applyBannerPlaceholder(el);
}

/** Mount ad inside the React pause card (no canvas coordinate mapping). */
export function mountPauseAdInContainer(el: HTMLElement): void {
  mountInlineOverlayAd(el, AD_PLACEMENTS.PAUSE_MENU_BANNER);
}

/** Mount ad inside the React game-over card. */
export function mountGameOverAdInContainer(el: HTMLElement): void {
  mountInlineOverlayAd(el, AD_PLACEMENTS.GAME_OVER_MENU_BANNER);
}

export function hideInlineOverlayAd(el: HTMLElement): void {
  el.classList.remove('pause-ad-slot--visible', 'pause-ad-slot--inline');
  el.setAttribute('aria-hidden', 'true');
  el.style.width = '';
  el.style.height = '';
  el.style.left = '';
  el.style.top = '';
  delete el.dataset.adsense;
  el.innerHTML = '';
}

export function hidePauseAdSlot(): void {
  const el = getSlotEl();
  if (!el) return;
  hideInlineOverlayAd(el);
}
