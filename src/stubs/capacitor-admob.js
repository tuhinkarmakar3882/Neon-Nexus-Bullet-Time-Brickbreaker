/** Web-dev stub when @capacitor-community/admob is not installed (see docs/ADS.md). */
const noop = async () => {};

export const BannerAdSize = { BANNER: 'BANNER' };
export const BannerAdPosition = { BOTTOM_CENTER: 'BOTTOM_CENTER' };

export const AdMob = {
  initialize: noop,
  prepareInterstitial: noop,
  showInterstitial: noop,
  prepareRewardVideoAd: noop,
  showRewardVideoAd: noop,
  showBanner: noop,
  hideBanner: noop,
  removeBanner: noop,
  requestConsentInfo: noop,
  addListener: async () => ({ remove: noop }),
};
