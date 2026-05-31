/**
 * Vercel serverless — verify a paid Stripe Checkout session and return productId.
 * Used by checkout-success.html and client restore after web purchase.
 */
import { productIdFromSession, VALID_PRODUCTS } from '../server/unlock-crypto.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    res.status(503).json({ error: 'Stripe not configured' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const sessionId = body?.sessionId ?? body?.session_id;
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'sessionId required' });
    return;
  }

  let Stripe;
  try {
    Stripe = (await import('stripe')).default;
  } catch {
    res.status(503).json({ error: 'Install stripe package on server' });
    return;
  }

  const stripe = new Stripe(stripeKey);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      res.status(402).json({ error: 'Payment not completed', payment_status: session.payment_status });
      return;
    }
    const productId = productIdFromSession(session);
    if (!productId || !VALID_PRODUCTS.has(productId)) {
      res.status(422).json({ error: 'Unknown product in session metadata' });
      return;
    }
    res.json({ success: true, productId, sessionId: session.id });
  } catch (err) {
    res.status(400).json({ error: err?.message ?? 'Session lookup failed' });
  }
}
