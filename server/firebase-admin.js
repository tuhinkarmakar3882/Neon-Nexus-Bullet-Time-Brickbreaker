import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY ?? '';
  return raw.replace(/\\n/g, '\n');
}

export function isFirebaseAdminConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID
    && process.env.FIREBASE_CLIENT_EMAIL
    && process.env.FIREBASE_PRIVATE_KEY,
  );
}

function initAdmin() {
  if (getApps().length) return;
  if (!isFirebaseAdminConfigured()) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey(),
    }),
  });
}

/** @param {string} bearer Authorization header value */
export async function verifyBearerToken(bearer) {
  initAdmin();
  if (!isFirebaseAdminConfigured()) {
    throw new Error('Firebase admin not configured');
  }
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : bearer;
  if (!token) throw new Error('Missing token');
  const decoded = await getAuth().verifyIdToken(token);
  return decoded.uid;
}
