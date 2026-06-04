'use client';

import { useCallback, useEffect, useState } from 'react';
import type Phaser from 'phaser';
import { GAME } from '@/src/config/Constants.js';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import {
  INITIAL_GAMEPLAY_HUD,
  type GameplayHudState,
} from '@/lib/shell/gameplayHudTypes';

type HudStats = {
  score?: number;
  lives?: number;
  level?: number;
  bricksLeft?: number;
  combo?: number;
  goalText?: string;
};

function formatMutators(ids: string[]) {
  return ids
    .map((id) => id.replace(/([A-Z])/g, ' $1').trim())
    .join(' · ')
    .toUpperCase();
}

function attachHudListeners(
  game: Phaser.Game,
  patch: (fn: (prev: GameplayHudState) => GameplayHudState) => void,
) {
  const bus = game.events;

    const onStats = (s: HudStats) => {
    patch((prev) => ({
      ...prev,
      score: typeof s.score === 'number' ? s.score : prev.score,
      lives: typeof s.lives === 'number' ? s.lives : prev.lives,
      level: typeof s.level === 'number' ? s.level : prev.level,
      bricksLeft: typeof s.bricksLeft === 'number' ? s.bricksLeft : prev.bricksLeft,
      combo: typeof s.combo === 'number' ? s.combo : 0,
      goalText: s.goalText ?? '',
      gambitReady: (typeof s.combo === 'number' ? s.combo : prev.combo) >= GAME.COMBO_GAMBIT_MIN,
    }));
  };

  const onTreasury = () => {
    patch((prev) => ({
      ...prev,
      gems: MetaProgress.getGems(),
    }));
  };

  const onGnome = (s: { value?: number; max?: number; ratio?: number; ready?: boolean }) => {
    const max = s.max || 100;
    const ratio = s.ratio ?? (s.value ?? 0) / max;
    patch((prev) => ({
      ...prev,
      gnomeRatio: Math.min(1, Math.max(0, ratio)),
      gnomeReady: !!s.ready || ratio >= 1,
    }));
  };

  const onNexus = (s: { value?: number; max?: number }) => {
    const max = s.max || 100;
    const ratio = (s.value ?? 0) / max;
    patch((prev) => ({
      ...prev,
      nexusRatio: Math.min(1, Math.max(0, ratio)),
      nexusReady: ratio >= 1,
    }));
  };

  const onBulletTime = (bt: { active?: boolean; nexus?: boolean }) => {
    const active = !!bt?.active;
    patch((prev) => ({
      ...prev,
      slowActive: active,
      slowLabel: bt?.nexus ? 'NEXUS' : 'SLOW',
    }));
  };

  const onMutators = (ids: string[]) => {
    patch((prev) => ({
      ...prev,
      mutators: ids?.length ? formatMutators(ids) : '',
    }));
  };

  const onImmersive = (p: { on?: boolean }) => {
    patch((prev) => ({ ...prev, immersive: p?.on !== false }));
  };

  const onScramble = (on: boolean) => {
    patch((prev) => ({ ...prev, scramble: !!on }));
  };

  const onLife = (p?: { lives?: number }) => {
    const gs = window.__NEON?.scene?.getScene('Game') as { lives?: number } | undefined;
    const lives = typeof p?.lives === 'number' ? p.lives : gs?.lives;
    patch((prev) => ({
      ...prev,
      lifePulse: prev.lifePulse + 1,
      ...(typeof lives === 'number' ? { lives } : {}),
    }));
  };

  const onAchieve = (p?: { meter?: string }) => {
    if (p?.meter === 'nexus') {
      patch((prev) => ({ ...prev, nexusMeterPulse: prev.nexusMeterPulse + 1 }));
    } else if (p?.meter === 'gnome') {
      patch((prev) => ({ ...prev, gnomeMeterPulse: prev.gnomeMeterPulse + 1 }));
    }
  };

  const onGambit = () => {
    patch((prev) => ({ ...prev, gambitReady: false }));
  };

  bus.on('hud:stats', onStats);
  bus.on('hud:treasury', onTreasury);
  bus.on('hud:gnomeStreak', onGnome);
  bus.on('hud:btMeter', onNexus);
  bus.on('hud:bulletTime', onBulletTime);
  bus.on('hud:mutators', onMutators);
  bus.on('hud:immersive', onImmersive);
  bus.on('hud:scramble', onScramble);
  bus.on('hud:life', onLife);
  bus.on('hud:achieve', onAchieve);
  bus.on('hud:gambit', onGambit);

  onTreasury();

  return () => {
    bus.off('hud:stats', onStats);
    bus.off('hud:treasury', onTreasury);
    bus.off('hud:gnomeStreak', onGnome);
    bus.off('hud:btMeter', onNexus);
    bus.off('hud:bulletTime', onBulletTime);
    bus.off('hud:mutators', onMutators);
    bus.off('hud:immersive', onImmersive);
    bus.off('hud:scramble', onScramble);
    bus.off('hud:life', onLife);
    bus.off('hud:achieve', onAchieve);
    bus.off('hud:gambit', onGambit);
  };
}

export function useGameplayHudState() {
  const [state, setState] = useState<GameplayHudState>(INITIAL_GAMEPLAY_HUD);

  const patch = useCallback(
    (fn: (prev: GameplayHudState) => GameplayHudState) => setState(fn),
    [],
  );

  useEffect(() => {
    let detach: (() => void) | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;

    const tryAttach = (game?: Phaser.Game) => {
      const g = game ?? window.__NEON;
      if (!g?.events) return false;
      detach?.();
      detach = attachHudListeners(g, patch);
      return true;
    };

    const onReady = (e: Event) => {
      const game = (e as CustomEvent<{ game?: Phaser.Game }>).detail?.game;
      setState(INITIAL_GAMEPLAY_HUD);
      tryAttach(game);
    };

    window.addEventListener('neon:game-ready', onReady);
    if (!tryAttach()) {
      poll = setInterval(() => {
        if (tryAttach()) clearInterval(poll);
      }, 80);
    }

    return () => {
      window.removeEventListener('neon:game-ready', onReady);
      if (poll) clearInterval(poll);
      detach?.();
    };
  }, [patch]);

  return state;
}

export function emitGameplayRequest(event: 'req:pause' | 'req:gnome' | 'req:nexus' | 'req:gambit') {
  window.__NEON?.events.emit(event);
}
