# In-App Purchases (IAP)

Full IAP at launch: **Remove Ads**, **Gem Pack (+50)**, **Premium Pass**.

| Platform | Provider | Implementation |
|----------|----------|----------------|
| Android (Capacitor) | RevenueCat → Google Play Billing | [`PlayBilling.js`](../src/systems/PlayBilling.js) |
| iOS (future) | RevenueCat → App Store | Same module, `VITE_REVENUECAT_IOS_KEY` |
| Web PWA | Stripe Checkout + webhook | Payment Link + serverless API |
| Dev / no keys | Demo provider | [`DemoAdProvider.js`](../src/systems/DemoAdProvider.js) simulated store |

## Product catalog

Defined in [`src/config/AdsConfig.js`](../src/config/AdsConfig.js) `products`:

| Product ID | Type | Price | Effect |
|------------|------|-------|--------|
| `remove_ads` | Non-consumable | $2.99 | Sets `SaveManager.removeAds`; hides banner + interstitial |
| `coins_small` | Consumable | $0.99 | `MetaProgress.addGems(50)` |
| `premium` | Non-consumable | $4.99 | `MetaProgress.setPremium(true)` — premium cosmetics |

Use **identical product IDs** in:

- Google Play Console
- RevenueCat dashboard
- Stripe product metadata (web)
- `AdsConfig.products`

## Architecture

```
PurchaseScene / Settings / Shop
        │
        ▼
  Monetization.purchase(productId)
        │
        ├── PlayBilling.purchaseProduct()  ← native (RevenueCat)
        │       └── RC.purchaseStoreProduct()
        │
        ├── provider.purchase()            ← demo fallback
        │
        └── Stripe window.open()           ← web when VITE_STRIPE_CHECKOUT_URL set
```

Restore flow:

```
Settings → Monetization.restorePurchases()
        → PlayBilling.restorePurchases()   ← native
        → PlayBilling.syncStoreEntitlements()
        → applyEntitlements / applyRestoreResult
```

## RevenueCat setup (Android)

### 1. Create project

1. [RevenueCat dashboard](https://app.revenuecat.com/) → New project
2. Add **Google Play** app → link service account JSON from Play Console
3. Copy **Android public API key** → `VITE_REVENUECAT_ANDROID_KEY`

### 2. Entitlements

| Entitlement ID | Grants |
|----------------|--------|
| `remove_ads` | Remove Ads purchase |
| `premium` | Premium Pass |

Map products to entitlements in RevenueCat.

### 3. Products

Create offerings/products matching Play Console SKU IDs:

- `remove_ads`
- `coins_small`
- `premium`

### 4. Code integration

[`PlayBilling.js`](../src/systems/PlayBilling.js):

- `initPlayBilling()` — called from `NativeBridge` on native boot
- `purchaseProduct(productId)` — RevenueCat purchase
- `restorePurchases()` — restore + sync entitlements
- `syncEntitlementsFromCustomerInfo()` — maps RC entitlements to local save

Env:

```bash
VITE_REVENUECAT_ANDROID_KEY=goog_xxxxxxxx
# VITE_REVENUECAT_IOS_KEY=appl_xxxxxxxx   # when iOS ships
```

### 5. Dependency version

```json
"@revenuecat/purchases-capacitor": "^11.3.2"
```

v11 supports **Capacitor 7**. v13+ requires Capacitor 8.

## Stripe setup (Web PWA)

### 1. Products

Create in [Stripe Dashboard](https://dashboard.stripe.com/):

- Remove Ads — $2.99 one-time
- Gem Pack — $0.99 one-time
- Premium Pass — $4.99 one-time

Create **Payment Links** or a Checkout Session endpoint.

### 2. Client env

```bash
VITE_STRIPE_CHECKOUT_URL=https://buy.stripe.com/xxxxxxxx
```

[`PlayBilling.js`](../src/systems/PlayBilling.js) opens:

```
{VITE_STRIPE_CHECKOUT_URL}?product={productId}
```

Returns `{ success: false, pending: true }` — user completes checkout in browser tab.

### 3. Webhook + fulfillment (serverless)

On `checkout.session.completed`, the webhook logs a **signed unlock code** (for email/support). Clients can also fulfill via session ID after Stripe redirect.

**Vercel** — `api/stripe-webhook.js`, `api/fulfill-session.js`, `api/redeem-unlock.js`

**Netlify** — `netlify/functions/*` with `/api/*` redirects in `netlify.toml`

Set Stripe Payment Link success URL to:

```
https://your-domain.com/checkout-success.html?session_id={CHECKOUT_SESSION_ID}
```

Include `product_id` in Payment Link metadata (`remove_ads`, `coins_small`, or `premium`).

Server env (never expose to client):

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Optional separate HMAC secret for unlock codes (defaults to STRIPE_WEBHOOK_SECRET)
# STRIPE_UNLOCK_SECRET=...
```

### 4. Web entitlement delivery

| Path | Flow |
|------|------|
| **Auto (redirect)** | `checkout-success.html` → `/api/fulfill-session` → local entitlement applied on next boot |
| **Restore** | Settings → Restore Purchases → syncs pending Stripe session |
| **Manual code** | Settings → Redeem Unlock Code → `/api/redeem-unlock` |

Unlock code format: `{productId}.{sessionId}.{hmac16}` — generated in webhook logs for email fulfillment.

## Freemium ad gating

Ads run when **both**:

1. `VITE_AD_PROVIDER=google` (or `demo` in dev)
2. `SaveManager.getRemoveAds()` is `false`

[`Monetization.js`](../src/systems/Monetization.js) gates:

- `showBanner()` / `hideBanner()`
- `maybeShowLevelInterstitial()`
- Rewarded ads still available (optional — can gate separately)

Prod warning when `VITE_AD_PROVIDER=demo` in production: [`createAdProvider.js`](../src/systems/createAdProvider.js).

## UI touchpoints

| Scene | Action |
|-------|--------|
| `PurchaseScene` | Demo checkout UI; Stripe opens in browser tab |
| `SettingsScene` | Remove Ads, Restore Purchases, Redeem Unlock Code (web) |
| `ShopScene` | Gem pack shortcut |
| `GameOverScene` | Rewarded continue (ads, not IAP) |

## Testing

### Android

1. Add Gmail accounts as **License testers** in Play Console
2. Upload to **Internal testing** track
3. Install via Play Store test link
4. Purchase with test card — verify entitlements sync
5. Uninstall → reinstall → Restore Purchases

### Web (demo)

With no Stripe URL, `PlayBilling.purchaseProduct()` returns `null` → falls through to demo provider (simulated purchase).

### Web (Stripe test mode)

Use Stripe test keys + test card `4242 4242 4242 4242`.

## Play Console IAP checklist

- [ ] Products created with matching IDs
- [ ] Products **activated**
- [ ] RevenueCat linked to Play billing
- [ ] Privacy policy URL live (see [PWA.md](./PWA.md))
- [ ] App declares "Contains ads" + "In-app purchases"

## Related

- [PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md) — Phase 3
- [ADS.md](./ADS.md) — Remove Ads ad gating
- [RELEASE.md](./RELEASE.md) — Play Store upload
- [PWA.md](./PWA.md) — Stripe webhook hosting
