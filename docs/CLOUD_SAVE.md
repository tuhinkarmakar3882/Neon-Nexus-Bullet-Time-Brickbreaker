# Cloud Save

Offline-first persistence with **IndexedDB** locally and **MongoDB Atlas** in the cloud. Google sign-in via **Firebase Auth** unlocks cross-device sync.

## Product behavior

| State | Behavior |
|-------|----------|
| Guest | Progress stored in IndexedDB on this device only |
| Signed in | Automatic sync to MongoDB (debounced, periodic, foreground) |
| Nudge | Guests with progress see an occasional dismissible cloud-sync banner |

## Stack

- **Client:** IndexedDB (`idb`) via `lib/persistence/LocalStore.js`
- **Sync:** `lib/persistence/SyncEngine.ts` → `GET/PUT /api/saves/me`
- **Auth:** Firebase Google sign-in (`lib/auth/`)
- **Server:** Vercel serverless + MongoDB Atlas M0 (free tier)

## Environment variables

### Client (build time)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_BASE=          # optional; empty = same origin
```

### Server (Vercel)

```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB=neon_nexus
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## MongoDB Atlas setup

1. Create a free **M0** cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Database name: `neon_nexus`
3. Collection: `player_saves` (created automatically on first write)
4. Index: `{ updatedAt: 1 }` (created by server helper)
5. Allow Vercel IP access or `0.0.0.0/0` for serverless

## Firebase setup

1. Create a Firebase project
2. Enable **Google** sign-in under Authentication
3. Add authorized domains: `localhost`, your production domain
4. Create a web app; copy config to `NEXT_PUBLIC_FIREBASE_*`
5. Generate a service account key for `FIREBASE_*` server vars

## Capacitor native

- Web: Firebase `signInWithPopup`
- Android/iOS: `@capacitor-firebase/authentication` with Google provider

## Sync triggers

- Debounced push (3s) after local writes while signed in
- Every 5 minutes while app is open
- Tab/app foreground
- Hub mount, pause, level complete, hub exit
- Service Worker `neon-save-push` background sync tag
- Manual **Sync now** in Settings

## API routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/saves/me` | GET, PUT, DELETE | Player save document |
| `/api/entitlements/sync` | POST | Push IAP flags after restore |

Stripe webhook writes entitlements when `client_reference_id` or `metadata.firebase_uid` is set on checkout.

## Local migration

On first boot, `Persistence.init()` imports legacy `localStorage` `nn_*` keys into IndexedDB and removes them from localStorage.

## Export / import

Settings → Account includes JSON export/import for manual backup.
