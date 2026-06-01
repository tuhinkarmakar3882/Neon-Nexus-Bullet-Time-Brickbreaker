# Android & Play Store Release

Guide for shipping **Neon Nexus** as a Capacitor Android app on Google Play.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 10+ |
| JDK | 17 |
| Android Studio | Latest stable |
| Google Play Console | Developer account ($25 one-time) |

## Dependencies (already in `package.json`)

Capacitor **8** + RevenueCat **13** + AdMob community plugin **8**. See [NATIVE.md](./NATIVE.md) for the full cross-platform workflow.

## First-time Android setup

```bash
pnpm install
pnpm run build
npx cap add android        # creates android/ locally (gitignored)
npx cap sync android
npx cap open android       # opens Android Studio
```

Or use the npm script:

```bash
pnpm run cap:android
```

## App identity

| Setting | Value |
|---------|-------|
| App ID | `com.tuhinkarmakar.neonnexus` (`capacitor.config.json`) |
| App name | Neon Nexus |
| Web assets | `out/` (`pnpm run build`, Next.js static export) |

After every web change:

```bash
pnpm run build && npx cap sync android
```

## Native lifecycle

[`src/systems/NativeBridge.js`](../src/systems/NativeBridge.js) runs on native boot:

- **Back button** — [`Navigation.goBack()`](../src/systems/Navigation.js): closes overlays (Shop, Settings, Codex, …), Pause → resume, Game → pause, Menu → double-tap to exit
- **App pause/resume** — stops/starts music via `AudioManager`
- **Status bar** — dark style, `#08050c` background
- **Splash screen** — hidden after Phaser ready
- **Play Billing** — `initPlayBilling()` via RevenueCat

## Release signing

### 1. Generate keystore (once)

```bash
keytool -genkey -v \
  -keystore neon-nexus-release.keystore \
  -alias neon-nexus \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store the keystore and passwords securely (password manager, not in git).

### 2. Gradle signing config

In `android/` (local, not committed), configure signing in `app/build.gradle` or use `android/gradle.properties`:

```properties
NEON_RELEASE_STORE_FILE=../neon-nexus-release.keystore
NEON_RELEASE_STORE_PASSWORD=***
NEON_RELEASE_KEY_ALIAS=neon-nexus
NEON_RELEASE_KEY_PASSWORD=***
```

Build release AAB:

```bash
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

## AdMob (native)

1. Create app in [AdMob console](https://admob.google.com/)
2. Set env vars (see `.env.production.example`) or edit `capacitor.config.json` plugins.AdMob
3. Set `VITE_AD_PROVIDER=google` and `VITE_AD_TEST_MODE=false` for production builds
4. Enable UMP consent for EEA: `VITE_AD_CONSENT=true`

Full ad architecture: [ADS.md](./ADS.md).

## In-app purchases

1. Create products in Google Play Console matching [IAP.md](./IAP.md) product IDs
2. Configure RevenueCat project + Android API key → `VITE_REVENUECAT_ANDROID_KEY`
3. Link Play Console to RevenueCat for receipt validation
4. Test with license testers before production rollout

## Play Store listing checklist

- [ ] **App bundle (AAB)** signed with release keystore
- [ ] **Privacy policy URL** — host `public/privacy.html` on PWA domain (see [PWA.md](./PWA.md))
- [ ] **Content rating** questionnaire completed
- [ ] **Screenshots** — phone + tablet (720×1280 minimum)
- [ ] **Feature graphic** — 1024×500
- [ ] **Short & full description**
- [ ] **Category** — Games → Arcade or Casual
- [ ] **IAP products** — remove_ads, coins_small, premium (non-consumable / consumable)
- [ ] **Ads declaration** — yes, contains ads (unless testing remove-ads build)
- [ ] **Target API level** — `pnpm run ship:android` runs `patch-android-sdk.mjs` (`targetSdkVersion` / `compileSdkVersion` **35**). Verify in `android/variables.gradle` after sync.
- [ ] **Internal testing track** — upload AAB, add testers, verify ads + IAP

## Version bumps

1. Bump `version` in root `package.json`
2. Bump `versionCode` / `versionName` in `android/app/build.gradle`
3. `pnpm run build && npx cap sync android`
4. Build and upload new AAB

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen on launch | Check `webDir: dist` in capacitor.config; run `pnpm run build` first |
| AdMob crash on boot | Verify app ID in manifest matches AdMob console |
| IAP "store unavailable" | RevenueCat key missing or product not published in Play Console |
| Back button exits immediately | Ensure `GameScene.requestPause()` exists and Pause scene is registered |
| Gradle JDK error | Use JDK 17 in Android Studio → Settings → Build Tools |

## Related

- [PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md) — full release roadmap
- [IAP.md](./IAP.md) — RevenueCat product mapping
- [ADS.md](./ADS.md) — AdMob setup
- [PWA.md](./PWA.md) — web deploy (privacy policy hosting)
