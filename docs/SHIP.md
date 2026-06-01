# Ship checklist — Neon Nexus

**You:** dashboards (AdMob, Play, Stripe, RevenueCat, Vercel).  
**Repo:** `pnpm run ship:check`, `ship:web`, `ship:android` — see below.

## One-time: create `.env.production`

```bash
cp .env.production.example .env.production
```

Fill every value in **`.env.production`** (gitignored — never commit). See [SECURITY.md](./SECURITY.md).

For an **ads-only** first launch, keep `VITE_IAP_ENABLED=false` (default) — gem/remove-ads payments stay hidden; rewarded and interstitial ads still run.

Run:

```bash
pnpm run ship:check        # all targets
pnpm run ship:check:web
pnpm run ship:check:android
```

`VITE_GAME_URL` must match your live domain (no trailing slash). Play **Developer website** and AdMob `app-ads.txt` must use the **same host**.

---

## Web (PWA)

### Tech (automated)

```bash
pnpm run ship:web          # validate env → build out/
```

Deploy `out/` to Vercel or Netlify (see [PWA.md](./PWA.md)). Set the same `VITE_*` in the host dashboard plus server-only `STRIPE_*`.

### You (click ops)

| Step | Where |
|------|--------|
| Connect GitHub repo | Vercel / Netlify |
| Add env vars from `.env.production` | Project settings |
| Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Same (not `VITE_`) |
| Custom domain | DNS → host |
| Stripe products + Payment Links | Stripe Dashboard |
| Webhook URL `https://YOUR-DOMAIN/api/stripe-webhook` | Stripe → Webhooks |
| Payment Link success URL → `/checkout-success.html?session_id={CHECKOUT_SESSION_ID}` | Stripe |
| AdSense site + ad unit | Google AdSense |
| Wait 24h for `app-ads.txt` | AdMob (after deploy) |

Verify: `https://YOUR-DOMAIN/app-ads.txt`, `/privacy.html`, game loads, Stripe test purchase.

---

## Android (Play Store)

### Tech (automated)

```bash
pnpm run cap:add:android   # first time only
pnpm run ship:android        # validate → build → AdMob sync → manifest patch → cap sync
pnpm run ship:android:bundle # release AAB (needs keystore.properties)
```

Signing setup: [native/android/README-signing.md](../native/android/README-signing.md).

### You (click ops)

| Step | Where |
|------|--------|
| AdMob app + ad units | AdMob |
| Play app `com.tuhinkarmakar.neonnexus` | Play Console |
| Products `remove_ads`, `coins_small`, `premium` | Play → Monetize |
| RevenueCat + Play service account | RevenueCat |
| Developer website = `VITE_GAME_URL` host | Play listing |
| Privacy URL = `https://YOUR-DOMAIN/privacy.html` | Play listing |
| License testers | Play → Setup |
| Upload AAB → Internal testing | Play → Release |
| Content rating, Data safety, screenshots | Play listing |

Install from **internal test link** (not only USB) to test IAP.

---

## Commands reference

| Command | Purpose |
|---------|---------|
| `pnpm run ship:check` | Validate `.env.production` |
| `pnpm run ship:web` | Production web build |
| `pnpm run ship:android` | Production native sync |
| `pnpm run ship:android:bundle` | Signed AAB for Play |
| `pnpm run test:smoke` | Headless game flow |
| `pnpm run test:migration` | Save migration fixtures |

---

## Related

- [PWA.md](./PWA.md) · [RELEASE.md](./RELEASE.md) · [IAP.md](./IAP.md) · [NATIVE.md](./NATIVE.md)
