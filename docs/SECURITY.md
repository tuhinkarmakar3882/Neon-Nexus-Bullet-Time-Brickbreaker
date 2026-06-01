# Secrets & credentials

**Never commit** API keys, passwords, keystores, or `.env` files with real values.

## Safe to commit

- `.env.example` and `.env.production.example` (placeholders only)
- `native/android/keystore.properties.example`
- `capacitor.config.json` (test AdMob IDs only — production IDs come from `.env.production` at sync time)

## Gitignored (see root `.gitignore`)

| Path | Purpose |
|------|---------|
| `.env`, `.env.production`, `.env.*.local` | Local & production env vars |
| `*.keystore`, `*.jks`, `keystore.properties` | Android signing |
| `secrets/`, `android/`, `ios/` | Local secrets & native projects |
| `.vercel/`, `.netlify/` | CLI auth state |
| `**/google-services.json`, service account JSON | Store / Firebase credentials |

## Where to put real values

| Secret | Where |
|--------|--------|
| `VITE_*` build vars | `.env.production` (local) or Vercel/Netlify env UI |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Host dashboard only (not `VITE_`) |
| Android keystore | Outside repo; path in `android/keystore.properties` |
| RevenueCat / Play service account | RevenueCat dashboard + local JSON (gitignored) |

## Verify before push

```bash
pnpm run check:secrets
```

If a secret was committed by mistake, rotate it in the provider dashboard, then remove it from git history (`git rm --cached <file>` and consider `git filter-repo` for history cleanup).
