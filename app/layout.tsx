import type { Metadata } from 'next';
import './globals.css';
import { ShellProviders } from '@/components/shell/ShellProviders';
import { HubSpeculationRules } from '@/components/shell/HubSpeculationRules';
import { LegalShellMount } from '@/components/shell/LegalShellMount';

const siteUrl = (process.env.VITE_GAME_URL || 'https://example.com').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title: {
    default: 'Neon Nexus: Bullet-Time Brick Breaker',
    template: '%s · Neon Nexus',
  },
  description:
    'Neon brick breaker with bullet-time slow-mo, 25+ power-ups, Jardinain gnomes, and tons of levels in the twilight garden.',
  openGraph: {
    title: 'Neon Nexus: Bullet-Time Brick Breaker',
    description:
      'Neon brick breaker with bullet-time slow-mo, 25+ power-ups, and tons of levels.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Neon Nexus brick breaker' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Neon Nexus: Bullet-Time Brick Breaker',
    description:
      'Bullet-time bricks, 25+ power-ups, and tons of levels.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/android/android-launchericon-48-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/android/android-launchericon-192-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/android/android-launchericon-512-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Neon Nexus',
  },
};

export { viewport } from './viewport';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
          as="style"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
        <HubSpeculationRules />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__neonInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault();
                window.__neonInstallPrompt = e;
                window.dispatchEvent(new Event('neon-install-ready'));
              });
            `,
          }}
        />
      </head>
      <body>
        <ShellProviders>
          {children}
          <LegalShellMount />
        </ShellProviders>
      </body>
    </html>
  );
}
