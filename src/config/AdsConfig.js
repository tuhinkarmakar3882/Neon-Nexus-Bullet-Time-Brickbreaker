import { envBool as envBoolShared, envStr } from './env.js';

/**
 * Google Ads / AdMob configuration — edit this file or set VITE_* env vars at build time.
 *
 * Quick start (native):
 *   1. Set provider to 'google' (or VITE_AD_PROVIDER=google)
 *   2. Fill appIds + units below (or env vars)
 *   3. pnpm add @capacitor-community/admob && cap sync
 *   4. Add AdMob app IDs to android/app + ios native manifests (see docs/ADS.md)
 *
 * Quick start (web banner):
 *   1. Set provider to 'google'
 *   2. Fill units.banner.web.client + slot (AdSense)
 *   3. Interstitial/rewarded on web require Ad Manager units (see docs/ADS.md)
 */

const GOOGLE_TEST = {
  appIds: {
    android: 'ca-app-pub-3940256099942544~3347511713',
    ios: 'ca-app-pub-3940256099942544~1458002511',
  },
  units: {
    banner: {
      android: 'ca-app-pub-3940256099942544/6300978111',
      ios: 'ca-app-pub-3940256099942544/2934735716',
    },
    interstitial: {
      android: 'ca-app-pub-3940256099942544/1033173712',
      ios: 'ca-app-pub-3940256099942544/4411468910',
    },
    rewarded: {
      android: 'ca-app-pub-3940256099942544/5224354917',
      ios: 'ca-app-pub-3940256099942544/1712485313',
    },
  },
};

function envBool(key, fallback) {
  return envBoolShared(key, fallback);
}

/** Production ad unit IDs — replace with your AdMob / AdSense IDs. */
const PRODUCTION = {
  appIds: {
    android: envStr('VITE_ADMOB_APP_ID_ANDROID'),
    ios: envStr('VITE_ADMOB_APP_ID_IOS'),
  },
  units: {
    banner: {
      android: envStr('VITE_ADMOB_BANNER_ANDROID'),
      ios: envStr('VITE_ADMOB_BANNER_IOS'),
      web: {
        client: envStr('VITE_ADSENSE_CLIENT'),
        slot: envStr('VITE_ADSENSE_BANNER_SLOT'),
      },
    },
    interstitial: {
      android: envStr('VITE_ADMOB_INTERSTITIAL_ANDROID'),
      ios: envStr('VITE_ADMOB_INTERSTITIAL_IOS'),
      web: envStr('VITE_ADMANAGER_INTERSTITIAL_WEB'),
    },
    rewarded: {
      android: envStr('VITE_ADMOB_REWARDED_ANDROID'),
      ios: envStr('VITE_ADMOB_REWARDED_IOS'),
      web: envStr('VITE_ADMANAGER_REWARDED_WEB'),
    },
  },
};

export const AdsConfig = {
  /** 'demo' | 'google' | 'noop' */
  provider: envStr('VITE_AD_PROVIDER', 'demo'),

  /**
   * Real-money IAP (Remove Ads, gem packs, Premium). When false, only ad monetization
   * and in-game gem cosmetics are available. Set VITE_IAP_ENABLED=true to ship purchases.
   */
  iapEnabled: envBool('VITE_IAP_ENABLED', false),

  /** When true, uses Google's official test ad unit IDs (safe for dev builds). */
  testMode: envBool('VITE_AD_TEST_MODE', true),

  appIds: PRODUCTION.appIds,

  units: PRODUCTION.units,

  /**
   * Web surfaces — banner needs AdSense client+slot; interstitial/rewarded use
   * Ad Manager (VITE_ADMANAGER_*) or Phaser overlay fallbacks via webAdBridge.
   */
  web: {
    banner: true,
    interstitial: true,
    rewarded: true,
  },

  interstitial: {
    everyLevels: 2,
    minIntervalMs: 90_000,
    /** Show in-game AdBreak overlay after a native interstitial (usually false). */
    overlayAfterNative: false,
  },

  banner: {
    enabled: true,
    /** Shown on web when AdSense is not configured or in demo provider mode. */
    placeholderLabel: 'Advertisement',
  },

  /** Rewarded placements — map to analytics / AdMob custom data if needed. */
  placements: {
    continue: 'game_over_continue',
    double_bonus: 'level_clear_double',
    revive_powers: 'game_over_revive',
  },

  /** Google UMP / consent — set requestOnInit when publishing in EEA. */
  consent: {
    requestOnInit: envBool('VITE_AD_CONSENT', false),
  },

  products: {
    remove_ads: {
      id: 'remove_ads',
      price: '$2.99',
      type: 'nonconsumable',
      title: 'Remove Ads',
      blurb: 'Hide banner and interstitial ads forever.',
    },
    coins_small: {
      id: 'coins_small',
      price: '$0.99',
      type: 'consumable',
      title: 'Gem Pack',
      blurb: '+50 gems for the Garden Shop.',
    },
    premium: {
      id: 'premium',
      price: '$4.99',
      type: 'nonconsumable',
      title: 'Premium Pass',
      blurb: 'Unlock premium paddle, trail, and garden cosmetics.',
    },
  },
};

/** Resolve platform key: 'android' | 'ios' | 'web'. */
export function adPlatform() {
  if (typeof window === 'undefined') return 'web';
  const cap = window.Capacitor;
  const p = cap?.getPlatform?.() ?? 'web';
  if (p === 'android' || p === 'ios') return p;
  return 'web';
}

export function isNativePlatform() {
  const p = adPlatform();
  return p === 'android' || p === 'ios';
}

export function resolveAppId(platform = adPlatform()) {
  if (AdsConfig.testMode) return GOOGLE_TEST.appIds[platform] ?? '';
  return AdsConfig.appIds[platform] ?? '';
}

export function resolveAdUnit(type, platform = adPlatform()) {
  if (AdsConfig.testMode) {
    const test = GOOGLE_TEST.units[type];
    if (!test) return '';
    if (type === 'banner') return test[platform] ?? '';
    return test[platform] ?? test.android ?? '';
  }
  const prod = AdsConfig.units[type];
  if (!prod) return '';
  if (type === 'banner' && platform === 'web') return prod.web?.slot ? prod.web : null;
  return prod[platform] ?? '';
}

export function isAdSurfaceEnabled(type) {
  if (AdsConfig.provider === 'demo') return true;
  if (AdsConfig.provider === 'noop') return false;
  const platform = adPlatform();
  if (platform === 'web') {
    if (type === 'banner') {
      const slot = resolveAdUnit('banner', 'web');
      return AdsConfig.web.banner && !!(slot?.client && slot?.slot);
    }
    if (type === 'interstitial') return AdsConfig.web.interstitial;
    if (type === 'rewarded') return AdsConfig.web.rewarded;
    return false;
  }
  return !!resolveAdUnit(type, platform);
}

export function isAdsEnabled() {
  return AdsConfig.provider !== 'noop';
}

/** Real-money store (Play / App Store / Stripe). Independent of ad provider. */
export function isIapEnabled() {
  return AdsConfig.iapEnabled === true;
}
