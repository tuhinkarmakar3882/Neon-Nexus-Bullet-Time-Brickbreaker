/**
 * Netlify Function — verify paid Stripe Checkout session.
 */
import { productIdFromSession, VALID_PRODUCTS } from '../../server/unlock-crypto.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Stripe not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const sessionId = body?.sessionId ?? body?.session_id;
  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'sessionId required' }) };
  }

  let Stripe;
  try {
    Stripe = (await import('stripe')).default;
  } catch {
    return { statusCode: 503, body: JSON.stringify({ error: 'Install stripe package' }) };
  }

  const stripe = new Stripe(stripeKey);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return { statusCode: 402, body: JSON.stringify({ error: 'Payment not completed' }) };
    }
    const productId = productIdFromSession(session);
    if (!productId || !VALID_PRODUCTS.has(productId)) {
      return { statusCode: 422, body: JSON.stringify({ error: 'Unknown product' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, productId, sessionId: session.id }) };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err?.message ?? 'Session lookup failed' }) };
  }
}
