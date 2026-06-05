'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Gem, Sparkles, Star, Trophy } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';
import {
  consumeHubRewards,
  pullNewJournalAchievements,
  pushHubReward,
  type HubRewardItem,
} from '@/lib/shell/hubRewardQueue';
import { MetaProgress } from '@/src/systems/MetaProgress.js';

const ICONS = {
  achievement: Trophy,
  codex: BookOpen,
  postRun: Sparkles,
  gems: Gem,
  stars: Star,
} as const;

function toastForItem(item: HubRewardItem): { title: string; body: string; icon: typeof Trophy } {
  if (item.kind === 'achievement') {
    return { title: 'Journal milestone', body: item.label, icon: ICONS.achievement };
  }
  if (item.kind === 'codex') {
    return {
      title: 'Codex discovery',
      body: `New ${item.category.slice(0, -1)} logged: ${item.id}`,
      icon: ICONS.codex,
    };
  }
  const streak =
    item.returnStreak && item.returnStreak > 1 ? ` · ${item.returnStreak}-day return streak` : '';
  if (item.reason === 'gameover') {
    return {
      title: 'Run summary',
      body: `Level ${item.level} · ${item.score.toLocaleString()} pts${item.isNewBest ? ' · new best!' : ''}${streak}`,
      icon: ICONS.postRun,
    };
  }
  return {
    title: 'Garden visit',
    body: `Level ${item.level} · ${item.score.toLocaleString()} pts saved${streak}`,
    icon: ICONS.postRun,
  };
}

type Toast = {
  id: string;
  title: string;
  body: string;
  icon: typeof Trophy;
};

export function HubRewardToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const freshAchievements = pullNewJournalAchievements(MetaProgress.getJournalAchievements());
    freshAchievements.forEach((a) => pushHubReward(a));
    const queued = consumeHubRewards();
    if (!queued.length) return;

    const next: Toast[] = queued.map((item, i) => {
      const copy = toastForItem(item);
      return {
        id: `${item.kind}-${i}-${Date.now()}`,
        ...copy,
      };
    });
    setToasts(next);

    const timers = next.map((t, i) =>
      window.setTimeout(() => dismiss(t.id), 5200 + i * 400),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [dismiss]);

  if (!toasts.length) return null;

  return (
    <div className="hub-reward-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="hub-reward-toast">
          <LucideIcon icon={t.icon} size={18} className="hub-reward-toast__icon" />
          <div className="hub-reward-toast__body">
            <p className="hub-reward-toast__title">{t.title}</p>
            <p className="hub-reward-toast__text">{t.body}</p>
          </div>
          <button
            type="button"
            className="hub-reward-toast__dismiss"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
