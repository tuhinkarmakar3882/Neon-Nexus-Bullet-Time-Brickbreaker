/**
 * Vercel serverless — sync verified entitlements from client restore / webhook.
 */
import { verifyBearerToken, isFirebaseAdminConfigured } from '../server/firebase-admin.js';
import { upsertEntitlements, isMongoConfigured, getPlayerSavesCollection } from '../server/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!isMongoConfigured() || !isFirebaseAdminConfigured()) {
    res.status(503).json({ error: 'Not configured' });
    return;
  }

  let uid;
  try {
    uid = await verifyBearerToken(req.headers.authorization ?? '');
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
  }

  const patch = {
    removeAds: !!body?.removeAds,
    premium: !!body?.premium,
    stripeRedeemed: Array.isArray(body?.stripeRedeemed) ? body.stripeRedeemed : [],
  };

  await upsertEntitlements(uid, patch);

  const col = await getPlayerSavesCollection();
  await col.updateOne(
    { _id: uid },
    {
      $set: {
        entitlements: patch,
        updatedAt: new Date(),
      },
    },
    { upsert: false },
  );

  res.status(200).json({ ok: true, entitlements: patch });
}
