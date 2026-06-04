'use client';

import { useCallback, useEffect, useState } from 'react';
import type Phaser from 'phaser';
import {
  FTUE_POWER_TIP,
  hasSeenPowerCoach,
  markPowerCoachSeen,
} from '@/lib/shell/ftue';

type ToastPayload = { text?: string; ms?: number };

function isPowerToast(text: string) {
  const t = text.trim();
  if (!t || t.length < 8) return false;
  if (/press back again/i.test(t)) return false;
  if (/exit the app/i.test(t)) return false;
  return true;
}

/** One-time coach when the first power-up toast fires in play. */
export function PowerCoachBanner() {
  const [open, setOpen] = useState(false);
  const [powerText, setPowerText] = useState('');

  const dismiss = useCallback(() => {
    setOpen(false);
    markPowerCoachSeen();
  }, []);

  useEffect(() => {
    if (hasSeenPowerCoach()) return;

    const onToast = (payload: ToastPayload) => {
      const text = payload?.text?.trim() ?? '';
      if (!isPowerToast(text)) return;
      setPowerText(text);
      setOpen(true);
    };

    const attach = (game?: Phaser.Game) => {
      const g = game ?? window.__NEON;
      if (!g?.events) return false;
      g.events.on('hud:toast', onToast);
      return true;
    };

    let detach: (() => void) | undefined;
    const wire = (game?: Phaser.Game) => {
      if (!attach(game)) return;
      detach = () => {
        (game ?? window.__NEON)?.events?.off('hud:toast', onToast);
      };
    };

    const onReady = (e: Event) => {
      const game = (e as CustomEvent<{ game?: Phaser.Game }>).detail?.game;
      detach?.();
      wire(game);
    };

    window.addEventListener('neon:game-ready', onReady);
    wire();

    return () => {
      window.removeEventListener('neon:game-ready', onReady);
      detach?.();
    };
  }, []);

  if (!open) return null;

  return (
    <div className="power-coach" role="status" aria-live="polite">
      <p className="power-coach__label">Power acquired</p>
      <p className="power-coach__power">{powerText}</p>
      <p className="power-coach__tip">{FTUE_POWER_TIP}</p>
      <button type="button" className="power-coach__dismiss" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
