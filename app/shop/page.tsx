'use client';

import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { useGameMeta } from '@/components/shell/useGameMeta';
import { COSMETIC_SECTIONS } from '@/src/config/Cosmetics.js';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { emitCosmeticsChanged } from '@/src/systems/CosmeticsBridge.js';
import { Monetization } from '@/src/systems/Monetization.js';
import { isIapEnabled } from '@/src/config/AdsConfig.js';
import { audio } from '@/src/systems/AudioManager.js';
import { cssHex } from '@/src/config/Palette.js';
import { SHELL_COPY } from '@/lib/copy/shell';
import { PremiumLoader } from '@/components/shell/PremiumLoader';
import { countCosmetics } from '@/lib/shell/progression';
import { NeonButton } from '@/components/shell/AppShell';

const COPY = SHELL_COPY.shop;

function ShopContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '';
  const { gems, refresh } = useGameMeta();
  const [status, setStatus] = useState('');
  const [, tick] = useState(0);
  const forceUpdate = () => tick((n) => n + 1);
  const vault = countCosmetics();

  const onSelect = useCallback((c: { id: string; cost: number; premium?: boolean; label: string; effect?: string; desc?: string }, kind: string) => {
    if (c.cost === 0 && !MetaProgress.ownsCosmetic(kind, c.id)) {
      MetaProgress.unlockCosmetic(kind, c.id);
    }
    const owned = MetaProgress.ownsCosmetic(kind, c.id);
    if (owned) {
      if (MetaProgress.equipCosmetic(kind, c.id)) {
        emitCosmeticsChanged(null);
        audio.blip(880);
        setStatus(from === 'play' ? COPY.status.equippedLive : COPY.status.equipped);
      } else {
        setStatus(COPY.status.equipFailed);
        audio.blip(220);
      }
      forceUpdate();
      refresh();
      return;
    }
    if (c.premium && !MetaProgress.isPremium()) {
      setStatus(isIapEnabled() ? COPY.status.premiumRequired : COPY.status.premiumSoon);
      return;
    }
    if (MetaProgress.spendGems(c.cost)) {
      MetaProgress.unlockCosmetic(kind, c.id);
      if (MetaProgress.equipCosmetic(kind, c.id)) {
        emitCosmeticsChanged(null);
        audio.blip(880);
        setStatus(COPY.status.unlocked);
      }
      forceUpdate();
      refresh();
    } else {
      setStatus(COPY.status.insufficientGems);
      audio.blip(220);
    }
  }, [from, refresh]);

  const buyProduct = async (sku: string) => {
    setStatus(COPY.status.processing);
    const res = await Monetization.purchase(sku);
    if (res?.success) {
      setStatus(COPY.status.thanks);
      refresh();
      forceUpdate();
    } else if (!res?.cancelled) {
      setStatus(Monetization.purchaseErrorMessage(res));
    } else setStatus('');
  };

  const eq = MetaProgress.getEquipped();

  return (
    <AppShell title={COPY.title} from={from} tone="forge">
      <div className="forge-header">
        <div>
          <h1 className="shell-title" style={{ marginBottom: 4 }}>
            {COPY.title}
          </h1>
          <p className="shell-subtitle shell-subtitle--left" style={{ margin: 0 }}>
            {COPY.subtitle}
          </p>
        </div>
        <div>
          <div className="forge-balance">{gems.toLocaleString()} 💎</div>
          <p className="forge-equipped">
            Vault {vault.owned}/{vault.total} · {eq.hull} · {eq.trail} · {eq.theme}
          </p>
        </div>
      </div>

      {status && <p className="shell-hint" style={{ color: 'var(--economy)', textAlign: 'left' }}>{status}</p>}

      <div className="shell-scroll-panel forge-showcase">
        {COSMETIC_SECTIONS.map((section) => (
          <div key={section.kind}>
            <h2 className="forge-section-title">{section.title}</h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>{section.blurb}</p>
            {section.items.map((c) => {
              const owned = MetaProgress.ownsCosmetic(section.kind, c.id);
              const equipped =
                (section.kind === 'hull' && eq.hull === c.id)
                || (section.kind === 'trail' && eq.trail === c.id)
                || (section.kind === 'theme' && eq.theme === c.id);
              const tint = section.kind === 'theme' ? c.accent : c.tint;
              let actionLabel: string = COPY.actions.equip;
              if (c.premium && !MetaProgress.isPremium() && !owned) actionLabel = COPY.actions.premium;
              else if (equipped) actionLabel = COPY.actions.active;
              else if (!owned) actionLabel = c.cost === 0 ? COPY.actions.free : COPY.actions.gems(c.cost);

              return (
                <div key={c.id} className={`forge-item${equipped ? ' equipped' : ''}`}>
                  <div className="forge-swatch" style={{ background: cssHex(tint) }} />
                  <div>
                    <div className="forge-item-title">{c.label}</div>
                    <div className="forge-item-desc">{c.effect ?? c.desc}</div>
                  </div>
                  <button
                    type="button"
                    className={`neon-btn neon-btn-${equipped ? 'primary' : owned ? 'secondary' : 'economy'} forge-item-action`}
                    onClick={() => onSelect(c, section.kind)}
                  >
                    {actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        ))}

        {isIapEnabled() && (
          <>
            <h2 className="forge-section-title">{COPY.supportTitle}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NeonButton variant="secondary" onClick={() => buyProduct('coins_small')}>
                {COPY.gemPack}
                <br />
                <span style={{ fontSize: '0.7rem' }}>{Monetization.formatPrice('coins_small') || '$0.99'}</span>
              </NeonButton>
              <NeonButton variant="economy" onClick={() => buyProduct('premium')}>
                {COPY.premium}
                <br />
                <span style={{ fontSize: '0.7rem' }}>{Monetization.formatPrice('premium') || '$4.99'}</span>
              </NeonButton>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<PremiumLoader compact />}>
      <ShopContent />
    </Suspense>
  );
}
