'use client';

import { useCallback, useEffect, useState } from 'react';
import { initPersistence } from '@/lib/persistence/Persistence';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { RunPersistence } from '@/src/systems/RunPersistence.js';

export type RunSnapshot = {
  level: number;
  score: number;
  lives: number;
};

export function useGameMeta() {
  const [hydrated, setHydrated] = useState(false);
  const [gems, setGems] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [dailyBest, setDailyBest] = useState(0);
  const [returnStreak, setReturnStreak] = useState(0);
  const [levelsCleared, setLevelsCleared] = useState(0);
  const [run, setRun] = useState<RunSnapshot | null>(null);

  const refresh = useCallback(() => {
    setGems(MetaProgress.getGems());
    setHighScore(SaveManager.getHighScore());
    setTotalStars(MetaProgress.countTotalStars());
    setDailyBest(MetaProgress.getDailyBest());
    setReturnStreak(MetaProgress.getReturnStreak());
    setLevelsCleared(MetaProgress.getStats().levelsCleared ?? 0);
    const snap = RunPersistence.loadRun();
    setRun(
      snap
        ? { level: snap.level, score: snap.score, lives: snap.lives }
        : null,
    );
  }, []);

  useEffect(() => {
    void initPersistence().then(() => {
      refresh();
      setHydrated(true);
    });
    const onSync = () => refresh();
    window.addEventListener('neon:save-synced', onSync);
    window.addEventListener('neon:storage', onSync);
    return () => {
      window.removeEventListener('neon:save-synced', onSync);
      window.removeEventListener('neon:storage', onSync);
    };
  }, [refresh]);

  return { gems, highScore, totalStars, dailyBest, returnStreak, levelsCleared, run, refresh, hydrated };
}
