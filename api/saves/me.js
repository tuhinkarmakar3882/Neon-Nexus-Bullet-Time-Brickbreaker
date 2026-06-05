/**
 * Vercel serverless — player cloud save (GET/PUT/DELETE).
 */
import { verifyBearerToken, isFirebaseAdminConfigured } from '../server/firebase-admin.js';
import { getPlayerSavesCollection, isMongoConfigured } from '../server/mongodb.js';

const MAX_BYTES = 256 * 1024;
const RATE_LIMIT_MS = 60_000;
/** @type {Map<string, { count: number, resetAt: number }>} */
const rateMap = new Map();

function checkRate(uid) {
  const now = Date.now();
  let entry = rateMap.get(uid);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_MS };
    rateMap.set(uid, entry);
  }
  entry.count += 1;
  if (entry.count > 30) {
    const err = new Error('Rate limit exceeded');
    err.status = 429;
    throw err;
  }
}

function validateDoc(body) {
  if (!body || typeof body !== 'object') {
    const err = new Error('Invalid body');
    err.status = 400;
    throw err;
  }
  const size = JSON.stringify(body).length;
  if (size > MAX_BYTES) {
    const err = new Error('Payload too large');
    err.status = 413;
    throw err;
  }
  if (body.schemaVersion != null && body.schemaVersion > 10) {
    const err = new Error('Unsupported schema version');
    err.status = 400;
    throw err;
  }
}

export default async function handler(req, res) {
  if (!isMongoConfigured() || !isFirebaseAdminConfigured()) {
    res.status(503).json({ error: 'Cloud save not configured' });
    return;
  }

  let uid;
  try {
    uid = await verifyBearerToken(req.headers.authorization ?? '');
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const col = await getPlayerSavesCollection();

    if (req.method === 'GET') {
      const doc = await col.findOne({ _id: uid });
      if (!doc) {
        res.status(404).json({ error: 'No save found' });
        return;
      }
      const { _id, ...rest } = doc;
      res.status(200).json(rest);
      return;
    }

    if (req.method === 'PUT') {
      checkRate(uid);
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {
          res.status(400).json({ error: 'Invalid JSON' });
          return;
        }
      }
      validateDoc(body);

      const expectedRevision = Number(body.expectedRevision ?? 0);
      const existing = await col.findOne({ _id: uid });
      const currentRevision = existing?.revision ?? 0;

      if (existing && expectedRevision !== currentRevision) {
        const { _id, ...rest } = existing;
        res.status(409).json(rest);
        return;
      }

      const nextRevision = currentRevision + 1;
      const { expectedRevision: _, ...payload } = body;
      const serverEnt = existing?.entitlements ?? {
        removeAds: false,
        premium: false,
        stripeRedeemed: [],
      };
      const doc = {
        _id: uid,
        schemaVersion: payload.schemaVersion ?? 2,
        revision: nextRevision,
        meta: payload.meta ?? {},
        settings: payload.settings ?? {},
        highScore: payload.highScore ?? 0,
        returnStreak: payload.returnStreak ?? 0,
        returnStreakDate: payload.returnStreakDate ?? '',
        run: payload.run ?? null,
        entitlements: {
          removeAds: serverEnt.removeAds || !!payload.entitlements?.removeAds,
          premium: serverEnt.premium || !!payload.entitlements?.premium,
          stripeRedeemed: [
            ...new Set([
              ...(serverEnt.stripeRedeemed ?? []),
              ...(payload.entitlements?.stripeRedeemed ?? []),
            ]),
          ],
        },
        updatedAt: new Date(),
      };

      await col.replaceOne({ _id: uid }, doc, { upsert: true });
      const { _id, ...rest } = doc;
      res.status(200).json(rest);
      return;
    }

    if (req.method === 'DELETE') {
      await col.deleteOne({ _id: uid });
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    const status = e.status ?? 500;
    res.status(status).json({ error: e.message ?? 'Server error' });
  }
}
