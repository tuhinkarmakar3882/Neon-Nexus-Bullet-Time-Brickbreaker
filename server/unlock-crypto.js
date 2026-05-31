import crypto from 'node:crypto';

export const VALID_PRODUCTS = new Set(['remove_ads', 'coins_small', 'premium']);

export function unlockSecret(env = process.env) {
  return env.STRIPE_UNLOCK_SECRET || env.STRIPE_WEBHOOK_SECRET || '';
}

export function generateUnlockCode(productId, sessionId, secret) {
  if (!VALID_PRODUCTS.has(productId)) throw new Error(`Invalid product: ${productId}`);
  const sig = crypto.createHmac('sha256', secret).update(`${productId}|${sessionId}`).digest('hex').slice(0, 16);
  return `${productId}.${sessionId}.${sig}`;
}

export function verifyUnlockCode(code, secret) {
  const trimmed = String(code ?? '').trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0) return null;
  const sig = trimmed.slice(lastDot + 1);
  const rest = trimmed.slice(0, lastDot);
  const firstDot = rest.indexOf('.');
  if (firstDot <= 0) return null;
  const productId = rest.slice(0, firstDot);
  const sessionId = rest.slice(firstDot + 1);
  if (!VALID_PRODUCTS.has(productId) || !sessionId || sig.length !== 16) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${productId}|${sessionId}`).digest('hex').slice(0, 16);
  if (sig !== expected) return null;
  return { productId, sessionId };
}

export function productIdFromSession(session) {
  return session?.metadata?.product_id
    ?? session?.client_reference_id
    ?? session?.metadata?.productId
    ?? null;
}
