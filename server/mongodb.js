import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI ?? '';
const dbName = process.env.MONGODB_DB ?? 'neon_nexus';

/** @type {MongoClient | null} */
let client = null;
/** @type {Promise<MongoClient> | null} */
let connectPromise = null;

export function isMongoConfigured() {
  return Boolean(uri);
}

export async function getMongoClient() {
  if (!uri) throw new Error('MONGODB_URI not configured');
  if (client) return client;
  if (!connectPromise) {
    connectPromise = MongoClient.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    }).then((c) => {
      client = c;
      return c;
    });
  }
  return connectPromise;
}

export async function getPlayerSavesCollection() {
  const c = await getMongoClient();
  const col = c.db(dbName).collection('player_saves');
  await col.createIndex({ updatedAt: 1 });
  return col;
}

export async function getEntitlementsCollection() {
  const c = await getMongoClient();
  return c.db(dbName).collection('player_entitlements');
}

/** Upsert entitlements from webhook (server-only). */
export async function upsertEntitlements(uid, patch) {
  const col = await getEntitlementsCollection();
  await col.updateOne(
    { _id: uid },
    {
      $set: { ...patch, updatedAt: new Date() },
      $setOnInsert: { _id: uid },
    },
    { upsert: true },
  );
}
