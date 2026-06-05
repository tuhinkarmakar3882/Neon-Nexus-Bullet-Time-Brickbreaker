'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getNudgeState, setNudgeState } from '@/lib/persistence/Persistence';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { RunPersistence } from '@/src/systems/RunPersistence.js';
import { SHELL_COPY } from '@/lib/copy/shell';
import { NeonButton } from '@/components/shell/AppShell';

const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

type CloudSyncNudgeProps = {
  hydrated: boolean;
  levelsCleared: number;
  gems: number;
  returnStreak: number;
};

function hasMeaningfulProgress(levelsCleared: number, gems: number): boolean {
  if (levelsCleared > 0 || gems > 0) return true;
  return !!RunPersistence.loadRun();
}

function shouldShowNudge(
  hydrated: boolean,
  levelsCleared: number,
  gems: number,
  returnStreak: number,
): boolean {
  if (!hydrated) return false;
  const nudge = getNudgeState();
  if (nudge.shownThisSession) return false;
  if (nudge.dismissedAt && Date.now() - nudge.dismissedAt < DISMISS_MS) return false;
  if (!hasMeaningfulProgress(levelsCleared, gems)) return false;

  if (returnStreak >= 3) return true;
  if (levelsCleared >= 2 && Math.random() < 0.2) return true;
  return false;
}

export function CloudSyncNudge({ hydrated, levelsCleared, gems, returnStreak }: CloudSyncNudgeProps) {
  const { user, configured, signIn } = useAuth();
  const [visible, setVisible] = useState(false);
  const copy = SHELL_COPY.account.nudge;

  useEffect(() => {
    if (user || !configured) {
      setVisible(false);
      return;
    }
    if (shouldShowNudge(hydrated, levelsCleared, gems, returnStreak)) {
      setVisible(true);
      const n = getNudgeState();
      setNudgeState({ showCount: n.showCount + 1, shownThisSession: true });
    }
  }, [user, configured, hydrated, levelsCleared, gems, returnStreak]);

  const dismiss = useCallback(() => {
    setNudgeState({ dismissedAt: Date.now() });
    setVisible(false);
  }, []);

  const enable = useCallback(async () => {
    await signIn();
    setVisible(false);
  }, [signIn]);

  if (!visible) return null;

  return (
    <aside className="cloud-sync-nudge" role="dialog" aria-labelledby="cloud-sync-nudge-title">
      <div className="cloud-sync-nudge__inner">
        <h2 id="cloud-sync-nudge-title" className="cloud-sync-nudge__title">{copy.title}</h2>
        <p className="cloud-sync-nudge__body">{copy.body}</p>
        <div className="cloud-sync-nudge__actions">
          <NeonButton type="button" variant="primary" onClick={() => void enable()}>
            {copy.enable}
          </NeonButton>
          <NeonButton type="button" variant="muted" onClick={dismiss}>
            {copy.dismiss}
          </NeonButton>
        </div>
      </div>
    </aside>
  );
}
