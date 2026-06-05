'use client';

import { Suspense, useCallback, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide';
import { AppShell } from '@/components/shell/AppShell';
import { GemSpendConfirm } from '@/components/shell/GemSpendConfirm';
import { useGameMeta } from '@/components/shell/useGameMeta';
import { COSMETIC_SECTIONS, cosmeticLabel } from '@/src/config/Cosmetics.js';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { emitCosmeticsChanged } from '@/src/systems/CosmeticsBridge.js';
import { Monetization } from '@/src/systems/Monetization.js';
import { isIapEnabled } from '@/src/config/AdsConfig.js';
import { audio } from '@/src/systems/AudioManager.js';
import { cssHex } from '@/src/config/Palette.js';
import { SHELL_COPY } from '@/lib/copy/shell';
import { PremiumLoader } from '@/components/shell/PremiumLoader';
import { SegmentedControl } from '@/components/shell/SegmentedControl';
import { countCosmetics } from '@/lib/shell/progression';
import { Gem } from 'lucide';
import { NeonButton } from '@/components/shell/AppShell';
import { LucideIcon } from '@/components/shell/LucideIcon';

const COPY = SHELL_COPY.shop;

const SHOP_CATEGORIES = ['hull', 'trail', 'theme'] as const;
type ShopCategory = (typeof SHOP_CATEGORIES)[number];

const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  hull: 'Hull',
  trail: 'Trail',
  theme: 'Theme',
};

type PendingPurchase = {
  id: string;
  kind: string;
  label: string;
  cost: number;
};

function ShopContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '';
  const { gems, refresh } = useGameMeta();
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState<PendingPurchase | null>(null);
  const [category, setCategory] = useState<ShopCategory>('hull');
  const [glowId, setGlowId] = useState<string | null>(null);
  const [, tick] = useState(0);
  const forceUpdate = () => tick((n) => n + 1);
  const vault = countCosmetics();

  const celebrateUnlock = useCallback((kind: string, id: string) => {
    const key = `${kind}:${id}`;
    setGlowId(key);
    window.setTimeout(() => setGlowId((cur) => (cur === key ? null : cur)), 2400);
  }, []);

  const completePurchase = useCallback(
    (c: { id: string; cost: number; label: string }, kind: string) => {
      if (MetaProgress.spendGems(c.cost)) {
        MetaProgress.unlockCosmetic(kind, c.id);
        if (MetaProgress.equipCosmetic(kind, c.id)) {
          emitCosmeticsChanged(null);
          audio.blip(880);
          setStatus(COPY.status.unlocked);
          celebrateUnlock(kind, c.id);
        }
        forceUpdate();
        refresh();
      } else {
        setStatus(COPY.status.insufficientGems);
        audio.blip(220);
      }
    },
    [refresh, celebrateUnlock],
  );

  const onSelect = useCallback(
    (c: { id: string; cost: number; premium?: boolean; label: string; effect?: string; desc?: string }, kind: string) => {
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
      if (c.cost > 0) {
        setPending({ id: c.id, kind, label: c.label, cost: c.cost });
        return;
      }
      MetaProgress.unlockCosmetic(kind, c.id);
      if (MetaProgress.equipCosmetic(kind, c.id)) {
        emitCosmeticsChanged(null);
        audio.blip(880);
        setStatus(COPY.status.unlocked);
        celebrateUnlock(kind, c.id);
      }
      forceUpdate();
      refresh();
    },
    [from, refresh, celebrateUnlock],
  );

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
    <AppShell title={COPY.title} subtitle={COPY.subtitle} from={from} tone="forge">
      {pending ? (
        <GemSpendConfirm
          itemLabel={pending.label}
          cost={pending.cost}
          balance={gems}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const p = pending;
            setPending(null);
            completePurchase({ id: p.id, cost: p.cost, label: p.label }, p.kind);
          }}
        />
      ) : null}
      <div className="forge-header">
        <div className="forge-balance">
          <LucideIcon icon={Gem} size={20} />
          <span>{gems.toLocaleString()}</span>
        </div>
        <p className="forge-equipped">
          {COPY.equipped(
            cosmeticLabel('hull', eq.hull),
            cosmeticLabel('trail', eq.trail),
            cosmeticLabel('theme', eq.theme),
          )}
          {' · '}
          Vault {vault.owned}/{vault.total}
        </p>
      </div>

      {status ? <p className="shell-hint shell-hint--status">{status}</p> : null}

      <SegmentedControl
        idPrefix="shop-category"
        options={[...SHOP_CATEGORIES]}
        value={category}
        onChange={(v) => setCategory(v as ShopCategory)}
        formatLabel={(v) => SHOP_CATEGORY_LABELS[v as ShopCategory]}
        ariaLabel="Shop categories"
      />

      <div className="shell-scroll-panel forge-showcase">
        {COSMETIC_SECTIONS.filter((section) => section.kind === category).map((section) => (
          <div key={section.kind}>
            <h2 className="forge-section-title">{section.title}</h2>
            <p className="forge-section-blurb">{section.blurb}</p>
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
                <div
                  key={c.id}
                  className={`forge-item forge-item--${section.kind}${equipped ? ' equipped' : ''}${glowId === `${section.kind}:${c.id}` ? ' forge-item--unlock-glow' : ''}`}
                >
                  {equipped ? (
                    <span className="forge-item__badge">
                      <LucideIcon icon={Check} size={12} />
                      {COPY.actions.equipped}
                    </span>
                  ) : null}
                  <div
                    className={`forge-swatch forge-swatch--${section.kind}`}
                    style={{ '--swatch-color': cssHex(tint) } as CSSProperties}
                  />
                  <div className="forge-item__body">
                    <div className="forge-item-title">{c.label}</div>
                    <div className="forge-item-desc">{c.effect ?? c.desc}</div>
                  </div>
                  <button
                    type="button"
                    className={`neon-btn neon-btn-${equipped ? 'primary' : owned ? 'secondary' : 'economy'} forge-item-action`}
                    onClick={() => onSelect(c, section.kind)}
                    aria-pressed={equipped}
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
            <div className="forge-iap-row">
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
