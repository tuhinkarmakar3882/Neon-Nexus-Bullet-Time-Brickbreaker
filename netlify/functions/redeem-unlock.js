/**
 * Netlify Function — redeem signed unlock code.
 */
import { unlockSecret, verifyUnlockCode } from '../../server/unlock-crypto.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = unlockSecret();
  if (!secret) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Unlock secret not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const code = body?.code ?? body?.unlockCode;
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: 'code required' }) };
  }

  const verified = verifyUnlockCode(code, secret);
  if (!verified) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid unlock code' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, productId: verified.productId, sessionId: verified.sessionId }) };
}
