/** Web app manifest — single source of truth for PWA install metadata. */

const ICON_SIZES = [48, 72, 96, 144, 192, 512];
const MASKABLE_SIZES = [192, 512];

export const PWA_THEME = {
  theme_color: '#0a0d1c',
  background_color: '#05060c',
};

export function buildPwaManifest() {
  const iconBase = 'icons/android';
  const icons = [];

  for (const size of ICON_SIZES) {
    icons.push({
      src: `${iconBase}/android-launchericon-${size}-${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any',
    });
  }

  for (const size of MASKABLE_SIZES) {
    icons.push({
      src: `${iconBase}/android-launchericon-${size}-${size}-maskable.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'maskable',
    });
  }

  return {
    name: 'Neon Nexus: Bullet-Time Brick Breaker',
    short_name: 'Neon Nexus',
    description:
      'Free neon brick breaker with Nexus slow-mo, 27 power-ups, elemental balls, Jardinains, and infinite procedural levels.',
    id: './',
    start_url: './',
    scope: './',
    display: 'standalone',
    display_override: ['standalone', 'fullscreen'],
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
