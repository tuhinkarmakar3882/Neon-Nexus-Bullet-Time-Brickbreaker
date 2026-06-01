'use client';

import { useCallback, useEffect, useState } from 'react';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { RunPersistence } from '@/src/systems/RunPersistence.js';

export type RunSnapshot = {
  level: number;
  score: number;
  lives: number;
};

export function useGameMeta() {
  const [gems, setGems] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [run, setRun] = useState<RunSnapshot | null>(null);

  const refresh = useCallback(() => {
    setGems(MetaProgress.getGems());
    setHighScore(SaveManager.getHighScore());
    const snap = RunPersistence.loadRun();
    setRun(
      snap
        ? { level: snap.level, score: snap.score, lives: snap.lives }
        : null,
    );
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('neon') || e.key.includes('nn_')) refresh();
    };
    window.addEventListener('storage', onStorage);
    const id = window.setInterval(refresh, 2000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(id);
    };
  }, [refresh]);

  return { gems, highScore, run, refresh };
}
