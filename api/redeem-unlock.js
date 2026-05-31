/**
 * Vercel serverless — redeem a signed unlock code from Stripe webhook email/support.
 */
import { unlockSecret, verifyUnlockCode } from '../server/unlock-crypto.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secret = unlockSecret();
  if (!secret) {
    res.status(503).json({ error: 'Unlock secret not configured' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const code = body?.code ?? body?.unlockCode;
  if (!code) {
    res.status(400).json({ error: 'code required' });
    return;
  }

  const verified = verifyUnlockCode(code, secret);
  if (!verified) {
    res.status(400).json({ error: 'Invalid unlock code' });
    return;
  }

  res.json({ success: true, productId: verified.productId, sessionId: verified.sessionId });
}
