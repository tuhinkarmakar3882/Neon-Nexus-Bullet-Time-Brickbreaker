'use client';

import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, NeonButton } from '@/components/shell/AppShell';
import { ShellAbout } from '@/components/shell/ShellAbout';
import { SettingsSection } from '@/components/shell/SettingsSection';
import { SettingRow } from '@/components/shell/SettingRow';
import { SegmentedControl } from '@/components/shell/SegmentedControl';
import { UiSwitch } from '@/components/shell/UiSwitch';
import { VolumeControl } from '@/components/shell/VolumeControl';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { audio } from '@/src/systems/AudioManager.js';
import { Monetization } from '@/src/systems/Monetization.js';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { VFX_LEVELS, VFX_TIER_COPY, resolveSettings } from '@/src/config/VfxQuality.js';
import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '@/src/config/Constants.js';
import { isIapEnabled } from '@/src/config/AdsConfig.js';
import { isWebStripeEnabled, promptUnlockCode } from '@/src/systems/WebUnlock.js';
import { ROUTES } from '@/lib/shell/routes';
import Link from 'next/link';
import { BookOpen, ShoppingBag } from 'lucide';
import type { GameSettings } from '@/lib/types/settings';
import { SHELL_COPY } from '@/lib/copy/shell';
import { SETTINGS_ICONS } from '@/lib/shell/settingsIcons';
import { PremiumLoader } from '@/components/shell/PremiumLoader';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { SettingsBackupPanel } from '@/components/shell/SettingsBackupPanel';

const COPY = SHELL_COPY.settings;

function notifyVfxChange(resolved: ReturnType<typeof resolveSettings>) {
  if (typeof window === 'undefined') return;
  window.__NEON?.events?.emit('settings:vfx', resolved);
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '';
  const [settings, setSettings] = useState<GameSettings>(() => SaveManager.loadSettings() as GameSettings);
  const [status, setStatus] = useState('');

  const persist = useCallback((next: GameSettings) => {
    const resolved = resolveSettings(next);
    setSettings(resolved as GameSettings);
    SaveManager.saveSettings(resolved as GameSettings);
    audio.init();
    audio.applySettings({
      sound: resolved.sound,
      music: resolved.music,
      sfxVolume: resolved.sfxVolume ?? DEFAULT_SFX_VOLUME,
      musicVolume: resolved.musicVolume ?? DEFAULT_MUSIC_VOLUME,
    });
    audio.setMusicEnabled(resolved.music);
    notifyVfxChange(resolved);
  }, []);

  const toggle = (key: keyof Pick<GameSettings, 'sound' | 'music' | 'haptics' | 'ambience'>) => {
    const next = { ...settings, [key]: !settings[key] };
    persist(next);
    if (key === 'sound' && next.sound) audio.blip(720);
  };

  const bumpVol = (key: 'sfxVolume' | 'musicVolume', delta: number) => {
    const step = key === 'musicVolume' ? 5 : 10;
    const base = key === 'musicVolume' ? DEFAULT_MUSIC_VOLUME : DEFAULT_SFX_VOLUME;
    const raw = (settings[key] ?? base) + delta;
    const clamped = Math.max(0, Math.min(100, raw));
    const nextVal = key === 'musicVolume' ? Math.round(clamped / step) * step : clamped;
    persist({ ...settings, [key]: nextVal });
    audio.blip(720);
  };

  const setQuality = (q: string) => {
    persist({ ...settings, vfxQuality: q });
    audio.blip(720);
  };

  const adsRemoved = SaveManager.getRemoveAds() || Monetization.removeAds;
  const showPurchases =
    adsRemoved || (isIapEnabled() && Monetization.isStoreAvailable());

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

  const activeTier = settings.vfxQuality ?? 'ultra';
  const tierHint = VFX_TIER_COPY[activeTier as keyof typeof VFX_TIER_COPY] ?? VFX_TIER_COPY.ultra;
  const sfxVol = settings.sfxVolume ?? DEFAULT_SFX_VOLUME;
  const musicVol = settings.musicVolume ?? DEFAULT_MUSIC_VOLUME;

  return (
    <AppShell title={COPY.title} from={from} tone="utility" badge="">
      <div className="shell-scroll-panel settings-panel">
        <SettingsBackupPanel />

        <SettingsSection title={COPY.sections.graphics} icon={SETTINGS_ICONS.graphics}>
          <SettingRow icon={SETTINGS_ICONS.quality} label={COPY.vfxLabel} stacked>
            <SegmentedControl
              options={VFX_LEVELS}
              value={activeTier}
              onChange={setQuality}
              ariaLabel={COPY.vfxLabel}
              formatLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
            />
          </SettingRow>
          <p className="shell-hint shell-hint--left">{tierHint}</p>
        </SettingsSection>

        <SettingsSection title={COPY.sections.audio} icon={SETTINGS_ICONS.audio}>
          <SettingRow icon={SETTINGS_ICONS.sfx} label={COPY.soundFx} controlId="setting-sound">
            <UiSwitch id="setting-sound" on={settings.sound} onToggle={() => toggle('sound')} />
          </SettingRow>
          <SettingRow icon={SETTINGS_ICONS.music} label={COPY.music} controlId="setting-music">
            <UiSwitch id="setting-music" on={settings.music} onToggle={() => toggle('music')} />
          </SettingRow>
          <SettingRow icon={SETTINGS_ICONS.ambience} label={COPY.ambience} controlId="setting-ambience">
            <UiSwitch id="setting-ambience" on={settings.ambience !== false} onToggle={() => toggle('ambience')} />
          </SettingRow>
          <SettingRow icon={SETTINGS_ICONS.sfx} label={COPY.sfxVolume}>
            <VolumeControl
              value={sfxVol}
              onDecrease={() => bumpVol('sfxVolume', -10)}
              onIncrease={() => bumpVol('sfxVolume', 10)}
              decreaseLabel="Decrease SFX volume"
              increaseLabel="Increase SFX volume"
            />
          </SettingRow>
          <SettingRow icon={SETTINGS_ICONS.music} label={COPY.musicVolume}>
            <VolumeControl
              value={musicVol}
              onDecrease={() => bumpVol('musicVolume', -5)}
              onIncrease={() => bumpVol('musicVolume', 5)}
              decreaseLabel="Decrease music volume"
              increaseLabel="Increase music volume"
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title={COPY.sections.feedback} icon={SETTINGS_ICONS.haptics}>
          <SettingRow icon={SETTINGS_ICONS.haptics} label={COPY.haptics} controlId="setting-haptics">
            <UiSwitch
              id="setting-haptics"
              on={settings.haptics !== false}
              onToggle={() => toggle('haptics')}
            />
          </SettingRow>
        </SettingsSection>

        {showPurchases ? (
        <SettingsSection title={COPY.sections.purchases} icon={SETTINGS_ICONS.purchases}>
          {status ? <p className="shell-hint shell-hint--status">{status}</p> : null}
          {adsRemoved ? (
            <p className="shell-hint shell-hint--left">{COPY.adsRemoved}</p>
          ) : (
            <div className="settings-actions-stack">
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
          )}
        </SettingsSection>
        ) : null}

        <SettingsSection title={COPY.sections.links} icon={SETTINGS_ICONS.links}>
          <Link
            href={from === 'play' ? `${ROUTES.shop}?from=play` : ROUTES.shop}
            className="neon-btn neon-btn-secondary shell-block-link"
          >
            <LucideIcon icon={ShoppingBag} size={18} className="shell-label__icon" />
            <span>{COPY.shopLink}</span>
          </Link>
          <Link
            href={from === 'play' ? `${ROUTES.codex}?from=play` : ROUTES.codex}
            className="neon-btn neon-btn-secondary shell-block-link"
          >
            <LucideIcon icon={BookOpen} size={18} className="shell-label__icon" />
            <span>{COPY.codexLink}</span>
          </Link>
          <ShellAbout />
        </SettingsSection>
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
