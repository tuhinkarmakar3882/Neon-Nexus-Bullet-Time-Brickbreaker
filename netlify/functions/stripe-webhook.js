/**
 * Netlify Function — Stripe checkout.session.completed webhook.
 */
import { generateUnlockCode, productIdFromSession, unlockSecret, VALID_PRODUCTS } from '../../server/unlock-crypto.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const unlockKey = unlockSecret();
  if (!secret || !stripeKey) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Stripe not configured' }) };
  }

  let Stripe;
  try {
    Stripe = (await import('stripe')).default;
  } catch {
    return { statusCode: 503, body: JSON.stringify({ error: 'Install stripe package' }) };
  }

  const stripe = new Stripe(stripeKey);
  let evt;
  try {
    evt = stripe.webhooks.constructEvent(event.body, event.headers['stripe-signature'], secret);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }

  if (evt.type === 'checkout.session.completed') {
    const session = evt.data.object;
    const productId = productIdFromSession(session);
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    if (productId && VALID_PRODUCTS.has(productId) && unlockKey) {
      const unlockCode = generateUnlockCode(productId, session.id, unlockKey);
      console.log('[stripe-webhook] fulfilled', { productId, email, unlockCode, sessionId: session.id });
    } else {
      console.log('[stripe-webhook] fulfilled (no code)', { productId, email, sessionId: session.id });
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}
