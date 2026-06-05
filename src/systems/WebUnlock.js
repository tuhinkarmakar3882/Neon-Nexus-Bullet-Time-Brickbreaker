/**
 * Web PWA Stripe fulfillment — session redirect + signed unlock codes.
 */
import { Capacitor } from '@capacitor/core';
import { isIapEnabled } from '../config/AdsConfig.js';
import { MetaProgress } from './MetaProgress.js';
import { SaveManager } from './SaveManager.js';
import { getItem, setItem, removeItem } from '../../lib/persistence/LocalStore.js';

const PENDING_ENTITLEMENT = 'neon_pending_entitlement';
const STRIPE_SESSION = 'neon_stripe_session';

function apiBase() {
  return import.meta.env.VITE_API_BASE ?? '';
}

async function postJson(path, body) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(data.error ?? `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function redeemKey(productId, sessionId) {
  return `${productId}:${sessionId ?? 'code'}`;
}

function applyFulfillment(productId, sessionId) {
  const key = redeemKey(productId, sessionId);
  if (SaveManager.hasStripeRedeemedKey(key)) {
    return { success: true, alreadyRedeemed: true, productId };
  }
  if (productId === 'remove_ads') SaveManager.setRemoveAds(true);
  if (productId === 'coins_small') MetaProgress.addGems(50);
  if (productId === 'premium') MetaProgress.setPremium(true);
  SaveManager.addStripeRedeemedKey(key);
  syncMonetizationFlags(productId);
  return { success: true, productId };
}

function syncMonetizationFlags(productId) {
  import('./Monetization.js').then(({ Monetization }) => {
    if (productId === 'remove_ads') {
      Monetization.removeAds = true;
      Monetization.hideBanner();
    }
  }).catch(() => {});
}

function readPendingEntitlement() {
  try {
    const raw = getItem(PENDING_ENTITLEMENT, null);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearPendingEntitlement() {
  try {
    removeItem(PENDING_ENTITLEMENT);
    removeItem(STRIPE_SESSION);
  } catch { /* ignore */ }
}

export function isWebStripeEnabled() {
  return isIapEnabled()
    && !Capacitor.isNativePlatform()
    && !!import.meta.env.VITE_STRIPE_CHECKOUT_URL;
}

export async function fulfillSession(sessionId) {
  const data = await postJson('/api/fulfill-session', { sessionId });
  return applyFulfillment(data.productId, data.sessionId ?? sessionId);
}

export async function redeemUnlockCode(code) {
  const data = await postJson('/api/redeem-unlock', { code: String(code).trim() });
  return applyFulfillment(data.productId, data.sessionId);
}

export async function syncPendingEntitlements() {
  if (!isWebStripeEnabled()) return { synced: false };

  const pending = readPendingEntitlement();
  if (pending?.productId) {
    const res = applyFulfillment(pending.productId, pending.sessionId);
    clearPendingEntitlement();
    return { synced: true, ...res };
  }

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const sessionId = params.get('session_id') ?? (() => {
    try { return getItem(STRIPE_SESSION, null); } catch { return null; }
  })();

  if (sessionId) {
    try {
      const res = await fulfillSession(sessionId);
      clearPendingEntitlement();
      if (params.has('session_id') || params.has('stripe')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('session_id');
        url.searchParams.delete('stripe');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
      return { synced: true, ...res };
    } catch (e) {
      console.warn('[WebUnlock] session fulfill failed', e);
      return { synced: false, error: e.message };
    }
  }

  return { synced: false };
}

export function promptUnlockCode() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(4,2,8,0.92);display:flex;align-items:center;justify-content:center;padding:20px;';
    const card = document.createElement('div');
    card.style.cssText = 'width:min(420px,100%);padding:24px;border:1px solid rgba(0,255,255,0.3);border-radius:12px;background:#0c0814;color:#cfe9ff;font-family:system-ui,sans-serif;';
    card.innerHTML = `
      <p style="margin:0 0 8px;font-size:14px;color:#00ffff;font-weight:700;">Redeem unlock code</p>
      <p style="margin:0 0 16px;font-size:12px;opacity:0.8;line-height:1.4;">Paste the code from your purchase confirmation email.</p>
      <input type="text" spellcheck="false" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #334;background:#120a1c;color:#fff;font-size:14px;" placeholder="remove_ads.cs_xxx…" />
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button type="button" data-act="cancel" style="padding:8px 14px;border-radius:8px;border:1px solid #445;background:transparent;color:#aaa;cursor:pointer;">Cancel</button>
        <button type="button" data-act="ok" style="padding:8px 14px;border-radius:8px;border:none;background:#00aaaa;color:#041018;font-weight:700;cursor:pointer;">Redeem</button>
      </div>
      <p data-err style="margin:12px 0 0;font-size:12px;color:#ff8899;display:none;"></p>
    `;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    const input = card.querySelector('input');
    const errEl = card.querySelector('[data-err]');
    const close = (value) => {
      overlay.remove();
      resolve(value);
    };
    card.querySelector('[data-act="cancel"]').onclick = () => close(null);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    card.querySelector('[data-act="ok"]').onclick = async () => {
      const code = input.value.trim();
      if (!code) {
        errEl.textContent = 'Enter a code.';
        errEl.style.display = 'block';
        return;
      }
      try {
        const res = await redeemUnlockCode(code);
        close(res);
      } catch (e) {
        errEl.textContent = e.message ?? 'Invalid code';
        errEl.style.display = 'block';
      }
    };
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') card.querySelector('[data-act="ok"]').click();
      if (e.key === 'Escape') close(null);
    });
  });
}
