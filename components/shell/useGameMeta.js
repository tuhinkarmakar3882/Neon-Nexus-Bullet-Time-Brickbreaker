'use client';

import { useCallback, useEffect, useState } from 'react';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { RunPersistence } from '@/src/systems/RunPersistence.js';

export function useGameMeta() {
  const [gems, setGems] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [run, setRun] = useState(null);

  const refresh = useCallback(() => {
    setGems(MetaProgress.getGems());
    setHighScore(SaveManager.getHighScore());
    setRun(RunPersistence.loadRun());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e) => {
      if (!e.key || e.key.includes('neon') || e.key.includes('nn_')) refresh();
    };
    window.addEventListener('storage', onStorage);
    const id = setInterval(refresh, 2000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(id);
    };
  }, [refresh]);

  return { gems, highScore, run, refresh };
}
