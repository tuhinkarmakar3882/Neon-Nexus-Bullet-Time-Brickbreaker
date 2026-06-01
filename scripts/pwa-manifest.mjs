/** Web app manifest — single source of truth for PWA install metadata. */

const ICON_SIZES = [48, 72, 96, 144, 192, 512];
const MASKABLE_SIZES = [192, 512];

export const PWA_THEME = {
  theme_color: '#08050c',
  background_color: '#08050c',
};

export function buildPwaManifest() {
  const androidBase = 'icons/android';
  const iosBase = 'icons/ios';
  const icons = [];

  for (const size of ICON_SIZES) {
    icons.push({
      src: `${androidBase}/android-launchericon-${size}-${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any',
    });
  }

  for (const size of MASKABLE_SIZES) {
    icons.push({
      src: `${androidBase}/android-launchericon-${size}-${size}-maskable.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'maskable',
    });
  }

  for (const size of [120, 152, 167, 180]) {
    icons.push({
      src: `${iosBase}/${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any',
    });
  }

  return {
    name: 'Neon Nexus: Bullet-Time Brick Breaker',
    short_name: 'Neon Nexus',
    description:
      'Free neon brick breaker with bullet-time slow-mo, 25+ power-ups, Jardinain gnomes, and tons of levels to clear.',
    id: './',
    start_url: './',
    scope: './',
    display: 'standalone',
    display_override: ['standalone'],
    orientation: 'portrait',
    ...PWA_THEME,
    categories: ['games', 'entertainment'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    icons,
    screenshots: [
      {
        src: './og-image.png',
        sizes: '1200x630',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Neon Nexus — brick breaker with bullet-time slow-mo',
      },
      {
        src: './icons/android/android-launchericon-512-512.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Neon Nexus app icon',
      },
    ],
  };
}
