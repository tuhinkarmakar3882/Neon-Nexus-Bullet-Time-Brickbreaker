import Link from 'next/link';
import { legalSiblingHref, type LegalNavContext } from '@/lib/shell/routes';
import { LegalProse } from '@/components/shell/legal/LegalProse';

type PrivacyContentProps = {
  showFooter?: boolean;
  nav?: LegalNavContext;
};

export function PrivacyContent({ showFooter = true, nav }: PrivacyContentProps) {
  const termsHref = legalSiblingHref('terms', 'privacy', nav);

  return (
    <LegalProse showFooter={showFooter} siblingHref={termsHref} siblingLabel="Terms of Service">
      <h2 className="legal-prose__doc-title">Privacy Policy</h2>
      <p>
        <strong>Neon Nexus: Bullet-Time Brick Breaker</strong> · Last updated: June 2026
      </p>

      <div className="legal-prose__notice">
        <p>
          <strong>Entertainment only.</strong> This policy describes how the casual game Neon Nexus handles information.
          Use of the game is also governed by our{' '}
          <Link href={termsHref} prefetch>
            Terms of Service
          </Link>
          , including disclaimers
          and limitations of liability. <strong>We are not responsible for third-party services</strong> (ads, payments,
          app stores) beyond describing them here.
        </p>
      </div>

      <h2>Overview</h2>
      <p>
        We aim to collect only what is needed to run the game, show ads (if enabled), process purchases through platform
        providers, and save progress on your device. We do not sell your personal information.
      </p>

      <h2>Data stored on your device</h2>
      <ul>
        <li>Game progress, settings, high scores, and cosmetics (typically browser or app local storage)</li>
        <li>Purchase entitlements (e.g. remove ads, premium status) cached locally after store or web verification</li>
        <li>Optional unlock codes or session identifiers for web checkout fulfillment</li>
      </ul>
      <p>
        <strong>You are responsible for backing up your device.</strong> Uninstalling the app or clearing site data may
        permanently delete local progress. We are not liable for lost saves or entitlements caused by device or platform
        actions.
      </p>

      <h2>Information processed by third parties</h2>
      <p>
        When you use features that rely on external providers, they may collect identifiers and usage data under their own
        policies:
      </p>
      <ul>
        <li>
          <strong>Google AdMob / AdSense</strong> — advertising identifiers and ad interaction data.{' '}
          <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
            Google Privacy Policy
          </a>
        </li>
        <li>
          <strong>Google Play / RevenueCat</strong> — purchase and subscription data on Android
        </li>
        <li>
          <strong>Apple App Store / RevenueCat</strong> — purchase data on iOS (when available)
        </li>
        <li>
          <strong>Stripe</strong> — payment data when you complete web checkout
        </li>
        <li>
          <strong>Pixabay</strong> — CDN delivery of background music streams (no account required for playback)
        </li>
        <li>
          <strong>Hosting (e.g. Vercel, Netlify)</strong> — standard server logs (IP, user agent) for the web version
        </li>
      </ul>
      <p>
        We do not control and are not responsible for third-party collection, security, or use of data. Contact those
        providers to exercise rights that apply to their processing.
      </p>

      <h2>Consent (EEA / UK)</h2>
      <p>
        Where required, we use Google’s User Messaging Platform (UMP) or similar tools to request consent before
        personalized ads. You can change ad choices in your device or Google account settings.
      </p>

      <h2>Children</h2>
      <p>
        The game is intended for general audiences as casual entertainment. We do not knowingly collect personal
        information from children under 13 (or the applicable age in your region). If you believe a child provided personal
        data, contact us and we will take reasonable steps to delete it.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable measures appropriate to a small entertainment app, but{' '}
        <strong>no method of transmission or storage is 100% secure.</strong> Use the game at your own risk.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy; the “Last updated” date will change. Continued use after updates means you accept the
        revised policy where permitted by law.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your region, you may have rights to access, correct, or delete personal data held by us. Much of your
        game data is stored only on your device—clearing app or site data removes it. For platform or ad-provider data, use
        their tools. Contact us for other requests.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:support@example.com">support@example.com</a>
      </p>
    </LegalProse>
  );
}
