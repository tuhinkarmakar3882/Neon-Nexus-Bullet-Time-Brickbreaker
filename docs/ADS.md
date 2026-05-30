# Google Ads integration

Neon Nexus routes all ads through **`Monetization`** — game scenes never call AdMob/AdSense directly. Swap providers via **`src/config/AdsConfig.js`** or **`.env`** (copy from `.env.example`).

## Architecture

```
Game scenes                    Monetization.js              Provider
─────────────                  ───────────────              ────────
MenuScene.showBanner()    →    showBanner()            →    Google / Demo / Noop
GameScene.completeLevel() →    maybeShowLevelInterstitial()
GameOverScene (rewarded)  →    offerRewarded*()
LevelCompleteScene        →    offerRewardedDoubleBonus()
Settings (Remove Ads)     →    purchase('remove_ads')
```

| File | Role |
|------|------|
| [`src/config/AdsConfig.js`](../src/config/AdsConfig.js) | **Single config** — provider, unit IDs, cadence, test mode |
| [`src/systems/createAdProvider.js`](../src/systems/createAdProvider.js) | Picks provider from config |
| [`src/systems/GoogleAdProvider.js`](../src/systems/GoogleAdProvider.js) | AdMob (native) + AdSense banner (web) |
| [`src/systems/DemoAdProvider.js`](../src/systems/DemoAdProvider.js) | Simulated ads for dev |
| [`src/systems/Monetization.js`](../src/systems/Monetization.js) | Frequency cap, remove-ads gate, IAP hooks |
| [`index.html`](../index.html) `#ad-banner` | Web banner slot |
| [`capacitor.config.json`](../capacitor.config.json) | AdMob plugin app IDs (native) |

## Quick start — production (Android / iOS)

1. **Set provider**
   ```bash
   cp .env.example .env
   # Edit .env:
   VITE_AD_PROVIDER=google
   VITE_AD_TEST_MODE=false
   # Fill VITE_ADMOB_* IDs
   ```
   Or edit `AdsConfig.provider = 'google'` and `AdsConfig.testMode = false` in `AdsConfig.js`.

2. **Install AdMob plugin**
   ```bash
   pnpm add @capacitor-community/admob
   npx cap sync
   ```

3. **Native manifests** — set your AdMob **app ID** (must match config):
   - **Android** `android/app/src/main/AndroidManifest.xml`:
     ```xml
     <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-XXXXXXXX~YYYYYYYY"/>
     ```
   - **iOS** `ios/App/App/Info.plist`:
     ```xml
     <key>GADApplicationIdentifier</key>
     <string>ca-app-pub-XXXXXXXX~YYYYYYYY</string>
     ```

4. **Update `capacitor.config.json`** `plugins.AdMob` with real app IDs and `"isTesting": false`.

5. **Build & run**
   ```bash
   pnpm run cap:android   # or cap:ios
   ```

Test mode uses [Google's official test unit IDs](https://developers.google.com/admob/android/test-ads) automatically — safe for dev builds.

## Quick start — web banner (AdSense)

1. Set `VITE_AD_PROVIDER=google` and fill:
   - `VITE_ADSENSE_CLIENT=ca-pub-…`
   - `VITE_ADSENSE_BANNER_SLOT=…`

2. Banner shows on **Menu** via `Monetization.showBanner()`.

Web **interstitial / rewarded** are not available through basic AdSense. Options:
- Enable in `AdsConfig.web.interstitial` / `rewarded` and wire [`Google Ad Manager`](https://admanager.google.com/) units, then expose:
  ```javascript
  window.__googleShowInterstitial = async () => { /* return true when shown */ };
  window.__googleShowRewarded = async (placement) => { /* return true when rewarded */ };
  ```
- Or ship native apps for full rewarded/interstitial support.

## Ad moments (already wired)

| Moment | API | Scene |
|--------|-----|-------|
| Menu banner | `Monetization.showBanner()` | `MenuScene` |
| Every N levels | `Monetization.maybeShowLevelInterstitial()` | `GameScene.completeLevel()` |
| Continue (rewarded) | `Monetization.offerRewardedContinue()` | `GameOverScene` |
| Revive + 2 powers | `Monetization.offerReviveWithPowers()` | `GameOverScene` |
| 2× level bonus | `Monetization.offerRewardedDoubleBonus()` | `LevelCompleteScene` |
| Remove ads IAP | `Monetization.purchase('remove_ads')` | `SettingsScene` |

Cadence defaults: every **2** levels, **90s** minimum gap — tune in `AdsConfig.interstitial`.

## Providers

| `provider` | Use case |
|------------|----------|
| `demo` | Local dev / web preview (default) |
| `google` | Production AdMob + AdSense |
| `noop` | Ads fully disabled |

## Remove ads

Purchasing `remove_ads` sets `SaveManager` flag → skips banner + interstitials. Rewarded buttons remain available (player opt-in).

## Checklist before store release

- [ ] `VITE_AD_TEST_MODE=false` and real unit IDs in `.env` or `AdsConfig.js`
- [ ] AdMob app IDs in AndroidManifest + Info.plist
- [ ] `capacitor.config.json` AdMob plugin updated
- [ ] Privacy policy + consent (`VITE_AD_CONSENT=true` for EEA if using UMP)
- [ ] Test rewarded continue / revive / double bonus on device
- [ ] Test interstitial cadence across 2+ level clears
