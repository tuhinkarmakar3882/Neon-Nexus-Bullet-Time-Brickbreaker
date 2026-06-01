# Native apps (Capacitor) — Android & iOS

Single web build powers **PWA**, **Android**, and **iOS** via [Capacitor 8](https://capacitorjs.com/docs/).

## Architecture

```text
pnpm run build  →  dist/
                      ├── Deploy to Vercel/Netlify (PWA)
                      └── cap sync  →  android/ + ios/ WebViews
```

| Surface | Monetization | Back navigation |
|---------|----------------|-----------------|
| PWA | Stripe + AdSense | Browser back (`popstate`) + Escape |
| Android / iOS | RevenueCat + AdMob | Hardware back → [`Navigation.js`](../src/systems/Navigation.js) |

## Prerequisites

| Tool | Android | iOS |
|------|---------|-----|
| Node 20+, pnpm 10+ | Yes | Yes |
| JDK 17 | Yes | — |
| Android Studio | Yes | — |
| Xcode 15+ | — | Yes |
| Apple Developer account | — | For device/TestFlight |

## First-time setup

```bash
pnpm install
cp .env.production.example .env.production   # fill AdMob + RevenueCat keys
pnpm run build
pnpm run cap:add:android   # creates android/ (gitignored locally)
pnpm run cap:add:ios       # creates ios/ (gitignored locally)
```

## Daily workflow

```bash
# After any web/game change:
pnpm run cap:android    # build + sync AdMob config + open Android Studio
pnpm run cap:ios        # build + sync + patch Info.plist + open Xcode
```

Or sync both without opening IDE:

```bash
pnpm run cap:sync:all
```

Scripts:

| Script | Purpose |
|--------|---------|
| `cap:sync:all` | `build` → patch AdMob config from env → `cap sync` |
| `sync-capacitor-admob.mjs` | Writes `VITE_ADMOB_APP_ID_*` into `capacitor.config.json` |
| `patch-ios-admob-plist.mjs` | Sets `GADApplicationIdentifier` in `ios/App/App/Info.plist` |

## Environment (native builds)

Set in `.env.production` before `pnpm run build` (Vite inlines `VITE_*`):

```bash
VITE_AD_PROVIDER=google
VITE_AD_TEST_MODE=false
VITE_ADMOB_APP_ID_ANDROID=ca-app-pub-...
VITE_ADMOB_APP_ID_IOS=ca-app-pub-...
VITE_ADMOB_BANNER_ANDROID=...
VITE_ADMOB_INTERSTITIAL_ANDROID=...
VITE_ADMOB_REWARDED_ANDROID=...
# iOS unit IDs as needed
VITE_REVENUECAT_ANDROID_KEY=goog_...
VITE_REVENUECAT_IOS_KEY=appl_...
VITE_AD_CONSENT=true   # EEA / UK
```

**Do not** set `VITE_STRIPE_CHECKOUT_URL` for store builds — web IAP only.

## Android specifics

- App ID: `com.tuhinkarmakar.neonnexus`
- AdMob `APPLICATION_ID` in `android/app/src/main/AndroidManifest.xml` (see [`native/android/AndroidManifest.admob-snippet.xml`](../native/android/AndroidManifest.admob-snippet.xml))
- Release signing & Play upload: [RELEASE.md](./RELEASE.md)
- IAP: [IAP.md](./IAP.md)

## iOS specifics

- Run `pnpm run cap:add:ios` once
- `GADApplicationIdentifier` in `ios/App/App/Info.plist` (patched by `patch-ios-admob-plist.mjs`)
- App Store Connect products linked to RevenueCat
- Portrait gameplay — verify orientations in Xcode if needed

## Back button behavior

[`Navigation.goBack()`](../src/systems/Navigation.js) closes overlays in order (Shop → Settings → Codex → … → Pause), then pauses gameplay, then double-tap to exit on Menu (native only).

Registered from [`NativeBridge.js`](../src/systems/NativeBridge.js) via `@capacitor/app` `backButton` event.

## Save data across updates

[`SaveMigration.js`](../src/systems/SaveMigration.js) runs at boot (`nn_save_schema`). Run snapshots use format version `2`. Uninstall clears WebView storage.

Validate locally:

```bash
pnpm run test:migration
```

## Related docs

- [PWA.md](./PWA.md) — web deploy
- [ADS.md](./ADS.md) — AdMob / AdSense
- [IAP.md](./IAP.md) — RevenueCat + Stripe
- [RELEASE.md](./RELEASE.md) — Play Store signing
