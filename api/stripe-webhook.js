/**
 * Vercel serverless — Stripe checkout.session.completed webhook.
 * Generates signed unlock codes logged for email / support fulfillment.
 */
import { generateUnlockCode, productIdFromSession, unlockSecret, VALID_PRODUCTS } from '../server/unlock-crypto.js';

export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const unlockKey = unlockSecret();
  if (!secret || !stripeKey) {
    res.status(503).json({ error: 'Stripe not configured' });
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
  const sig = req.headers['stripe-signature'];
  const rawBody = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const productId = productIdFromSession(session);
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    const uid = session.client_reference_id ?? session.metadata?.firebase_uid ?? null;

    if (uid && productId && VALID_PRODUCTS.has(productId)) {
      try {
        const { upsertEntitlements, isMongoConfigured } = await import('../server/mongodb.js');
        if (isMongoConfigured()) {
          const patch = {
            removeAds: productId === 'remove_ads',
            premium: productId === 'premium',
          };
          await upsertEntitlements(uid, patch);
          const { getPlayerSavesCollection } = await import('../server/mongodb.js');
          const col = await getPlayerSavesCollection();
          await col.updateOne(
            { _id: uid },
            { $set: { entitlements: patch, updatedAt: new Date() } },
            { upsert: true },
          );
        }
      } catch (e) {
        console.warn('[stripe-webhook] entitlements upsert failed', e);
      }
    }

    if (productId && VALID_PRODUCTS.has(productId) && unlockKey) {
      const unlockCode = generateUnlockCode(productId, session.id, unlockKey);
      console.log('[stripe-webhook] fulfilled', { productId, email, unlockCode, sessionId: session.id });
    } else {
      console.log('[stripe-webhook] fulfilled (no code)', { productId, email, sessionId: session.id });
    }
  }

  res.json({ received: true });
}
