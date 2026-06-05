'use client';

import { codexDiscovery, countCosmetics, journalProgress, nextCosmeticGoal } from '@/lib/shell/progression';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { HOME_ICONS } from '@/lib/shell/homeIcons';

type ProgressStripProps = {
  gems: number;
  highScore: number;
  totalStars?: number;
  dailyBest?: number;
  returnStreak?: number;
  compact?: boolean;
  hydrated?: boolean;
};

type StatTone = 'economy' | 'default' | 'lore';

type StatItem = {
  label: string;
  value: string;
  icon: (typeof HOME_ICONS)[keyof typeof HOME_ICONS];
  tone: StatTone;
};

export function ProgressStrip({
  gems,
  highScore,
  totalStars,
  dailyBest,
  returnStreak,
  compact,
  hydrated = false,
}: ProgressStripProps) {
  const live = hydrated;

  const hubMode = totalStars !== undefined || dailyBest !== undefined || returnStreak !== undefined;
  const cosmetics = live ? countCosmetics() : { owned: 0, total: 0 };
  const codex = live ? codexDiscovery() : { pct: 0 };
  const journal = live ? journalProgress() : { done: 0, total: 0 };
  const nextGem = live ? nextCosmeticGoal(gems) : null;

  const stats: StatItem[] = [
    { label: 'Gems', value: live ? gems.toLocaleString() : '—', icon: HOME_ICONS.gems, tone: 'economy' },
    { label: 'Best', value: live ? highScore.toLocaleString() : '—', icon: HOME_ICONS.best, tone: 'default' },
  ];

  if (hubMode) {
    if (totalStars !== undefined) {
      stats.push({
        label: 'Stars',
        value: live ? totalStars.toLocaleString() : '—',
        icon: HOME_ICONS.stars,
        tone: 'lore',
      });
    }
    if (dailyBest !== undefined) {
      stats.push({
        label: 'Today',
        value: live ? dailyBest.toLocaleString() : '—',
        icon: HOME_ICONS.daily,
        tone: 'default',
      });
    }
    if (returnStreak !== undefined && returnStreak > 1) {
      stats.push({
        label: 'Streak',
        value: live ? `${returnStreak}d` : '—',
        icon: HOME_ICONS.streak,
        tone: 'lore',
      });
    }
  } else {
    stats.push(
      {
        label: 'Vault',
        value: `${cosmetics.owned}/${cosmetics.total}`,
        icon: HOME_ICONS.vault,
        tone: 'lore',
      },
      { label: 'Archive', value: `${codex.pct}%`, icon: HOME_ICONS.archive, tone: 'lore' },
    );
  }

  return (
    <div className={`progress-strip${compact ? ' progress-strip--compact' : ''}`}>
      {stats.map((s) => (
        <div key={s.label} className="progress-strip__stat">
          <span className={`progress-strip__label progress-strip__label--${s.tone}`}>
            <LucideIcon icon={s.icon} size={14} className="progress-strip__icon" />
            {s.label}
          </span>
          <span className={`progress-strip__value progress-strip__value--${s.tone}`} suppressHydrationWarning>
            {s.value}
          </span>
        </div>
      ))}
      {!compact && !hubMode && (
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
