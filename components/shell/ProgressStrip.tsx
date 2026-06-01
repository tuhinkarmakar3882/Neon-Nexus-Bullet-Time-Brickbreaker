'use client';

import { codexDiscovery, countCosmetics, journalProgress, nextCosmeticGoal } from '@/lib/shell/progression';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { HOME_ICONS } from '@/lib/shell/homeIcons';

type ProgressStripProps = {
  gems: number;
  highScore: number;
  compact?: boolean;
};

export function ProgressStrip({ gems, highScore, compact }: ProgressStripProps) {
  const cosmetics = countCosmetics();
  const codex = codexDiscovery();
  const journal = journalProgress();
  const nextGem = nextCosmeticGoal(gems);

  const stats = [
    { label: 'Gems', value: gems.toLocaleString(), icon: HOME_ICONS.gems, tone: 'economy' as const },
    { label: 'Best', value: highScore.toLocaleString(), icon: HOME_ICONS.best, tone: 'default' as const },
    {
      label: 'Vault',
      value: `${cosmetics.owned}/${cosmetics.total}`,
      icon: HOME_ICONS.vault,
      tone: 'lore' as const,
    },
    { label: 'Archive', value: `${codex.pct}%`, icon: HOME_ICONS.archive, tone: 'lore' as const },
  ];

  return (
    <div className={`progress-strip${compact ? ' progress-strip--compact' : ''}`}>
      {stats.map((s) => (
        <div key={s.label} className="progress-strip__stat">
          <span className={`progress-strip__label progress-strip__label--${s.tone}`}>
            <LucideIcon icon={s.icon} size={14} className="progress-strip__icon" />
            {s.label}
          </span>
          <span className={`progress-strip__value progress-strip__value--${s.tone}`}>
            {s.value}
          </span>
        </div>
      ))}
      {!compact && (
        <p className="progress-strip__hint">
          {nextGem != null
            ? `Next unlock · ${nextGem} gems`
            : journal.done < journal.total
              ? `Journal · ${journal.done}/${journal.total} milestones`
              : 'Vault complete — forge something legendary'}
        </p>
      )}
    </div>
  );
}
