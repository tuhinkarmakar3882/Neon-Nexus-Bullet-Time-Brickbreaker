'use client';

import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, NeonButton } from '@/components/shell/AppShell';
import { ShellAbout } from '@/components/shell/ShellAbout';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { audio } from '@/src/systems/AudioManager.js';
import { Monetization } from '@/src/systems/Monetization.js';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { VFX_LEVELS, resolveSettings } from '@/src/config/VfxQuality.js';
import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '@/src/config/Constants.js';
import { isIapEnabled } from '@/src/config/AdsConfig.js';
import { isWebStripeEnabled, promptUnlockCode } from '@/src/systems/WebUnlock.js';
import { ROUTES } from '@/lib/shell/routes';
import Link from 'next/link';
import type { GameSettings } from '@/lib/types/settings';
import { SHELL_COPY } from '@/lib/copy/shell';
import { PremiumLoader } from '@/components/shell/PremiumLoader';

const COPY = SHELL_COPY.settings;

function SettingsContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '';
  const [settings, setSettings] = useState<GameSettings>(() => SaveManager.loadSettings() as GameSettings);
  const [status, setStatus] = useState('');

  const persist = useCallback((next: GameSettings) => {
    setSettings(next);
    SaveManager.saveSettings(next);
    audio.init();
    audio.setSoundEnabled(next.sound);
    audio.setMusicEnabled(next.music);
    audio.setSfxVolume(next.sfxVolume ?? DEFAULT_SFX_VOLUME);
    audio.setMusicVolume(next.musicVolume ?? DEFAULT_MUSIC_VOLUME);
    if (next.music) audio.applyMusicSettings({ musicVolume: next.musicVolume });
  }, []);

  const toggle = (key: keyof Pick<GameSettings, 'sound' | 'music'>) => {
    const next = { ...settings, [key]: !settings[key] };
    persist(next);
    if (key === 'sound' && next.sound) audio.blip(720);
  };

  const bumpVol = (key: 'sfxVolume' | 'musicVolume', delta: number) => {
    const base = key === 'musicVolume' ? DEFAULT_MUSIC_VOLUME : DEFAULT_SFX_VOLUME;
    const next = {
      ...settings,
      [key]: Math.max(0, Math.min(100, (settings[key] ?? base) + delta)),
    };
    persist(next);
    audio.blip(720);
  };

  const setQuality = (q: string) => {
    const resolved = resolveSettings({ ...settings, vfxQuality: q });
    persist(resolved);
    audio.blip(720);
  };

  const adsRemoved = SaveManager.getRemoveAds() || Monetization.removeAds;

  const buyRemoveAds = async () => {
    setStatus(COPY.status.checkout);
    const res = await Monetization.purchase('remove_ads');
    if (res?.success) setStatus(COPY.status.adsRemoved);
    else if (!res?.cancelled) setStatus(Monetization.purchaseErrorMessage(res));
    else setStatus('');
  };

  const restore = async () => {
    setStatus(COPY.status.restoring);
    const res = await Monetization.restorePurchases();
    if (res?.success && (SaveManager.getRemoveAds() || Monetization.removeAds || MetaProgress.isPremium())) {
      setStatus(COPY.status.restored);
      return;
    }
    setStatus(res?.success ? COPY.status.noPurchases : Monetization.purchaseErrorMessage(res));
  };

  const redeem = async () => {
    setStatus(COPY.status.redeemPrompt);
    const res = await promptUnlockCode();
    setStatus(res?.success ? COPY.status.unlocked : '');
  };

  return (
    <AppShell title={COPY.title} from={from} tone="utility">
      <h1 className="shell-title" style={{ fontSize: '1.25rem' }}>
        {COPY.title}
      </h1>
      <div className="shell-scroll-panel settings-panel">
        <p className="shell-subtitle shell-subtitle--left" style={{ marginBottom: 10, color: 'var(--text-muted)' }}>
          System preferences
        </p>

        <div className="toggle-row">
          <label>{COPY.vfxLabel}</label>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {VFX_LEVELS.map((q) => (
              <button
                key={q}
                type="button"
                className={`toggle-btn ${settings.vfxQuality === q ? 'on' : ''}`}
                onClick={() => setQuality(q)}
              >
                {q.toUpperCase()}
              </button>
            ))}
          </span>
        </div>

        <div className="toggle-row">
          <label>{COPY.soundFx}</label>
          <button type="button" className={`toggle-btn ${settings.sound ? 'on' : ''}`} onClick={() => toggle('sound')}>
            {settings.sound ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="toggle-row">
          <label>{COPY.music}</label>
          <button type="button" className={`toggle-btn ${settings.music ? 'on' : ''}`} onClick={() => toggle('music')}>
            {settings.music ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="toggle-row">
          <label>{COPY.sfxVolume}</label>
          <span>
            <button type="button" className="toggle-btn" onClick={() => bumpVol('sfxVolume', -10)}>−</button>
            <span style={{ margin: '0 8px' }}>{settings.sfxVolume ?? DEFAULT_SFX_VOLUME}%</span>
            <button type="button" className="toggle-btn" onClick={() => bumpVol('sfxVolume', 10)}>+</button>
          </span>
        </div>
        <div className="toggle-row">
          <label>{COPY.musicVolume}</label>
          <span>
            <button type="button" className="toggle-btn" onClick={() => bumpVol('musicVolume', -10)}>−</button>
            <span style={{ margin: '0 8px' }}>{settings.musicVolume ?? DEFAULT_MUSIC_VOLUME}%</span>
            <button type="button" className="toggle-btn" onClick={() => bumpVol('musicVolume', 10)}>+</button>
          </span>
        </div>

        {status && <p className="shell-hint" style={{ margin: '8px 0', color: 'var(--economy)', textAlign: 'left' }}>{status}</p>}

        {adsRemoved ? (
          <p className="shell-hint" style={{ textAlign: 'left' }}>{COPY.adsRemoved}</p>
        ) : (
          isIapEnabled() && Monetization.isStoreAvailable() && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <NeonButton variant="secondary" onClick={buyRemoveAds}>
                {COPY.removeAds(Monetization.formatPrice('remove_ads') || '$2.99')}
              </NeonButton>
              <NeonButton variant="muted" onClick={restore}>
                {COPY.restore}
              </NeonButton>
              {isWebStripeEnabled() && (
                <NeonButton variant="muted" onClick={redeem}>
                  {COPY.redeem}
                </NeonButton>
              )}
            </div>
          )
        )}

        <Link href={ROUTES.shop} className="neon-btn neon-btn-secondary shell-block-link">
          {COPY.shopLink}
        </Link>

        <ShellAbout />
      </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<PremiumLoader compact />}>
      <SettingsContent />
    </Suspense>
  );
}
