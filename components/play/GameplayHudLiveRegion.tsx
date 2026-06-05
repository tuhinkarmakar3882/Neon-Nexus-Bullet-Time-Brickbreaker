'use client';

import { useEffect, useState } from 'react';
import type Phaser from 'phaser';

type Announcement = { id: number; text: string };

/** Screen-reader announcements for center flash and long toasts. */
export function GameplayHudLiveRegion() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let seq = 0;
    let detach: (() => void) | undefined;

    const announce = (text: string) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      seq += 1;
      setAnnouncement({ id: seq, text: trimmed });
    };

    const attach = (game?: Phaser.Game) => {
      const g = game ?? window.__NEON;
      if (!g?.events) return false;
      detach?.();

      const onFlash = (f: { text?: string; ms?: number }) => {
        if (!f?.text || (f.ms ?? 0) <= 0) return;
        announce(f.text);
      };

      const onToast = (t: { text?: string; ms?: number }) => {
        if (!t?.text || (t.ms ?? 0) < 1400) return;
        announce(t.text);
      };

      g.events.on('hud:flash', onFlash);
      g.events.on('hud:toast', onToast);
      detach = () => {
        g.events.off('hud:flash', onFlash);
        g.events.off('hud:toast', onToast);
      };
      return true;
    };

    const onReady = (e: Event) => {
      const game = (e as CustomEvent<{ game?: Phaser.Game }>).detail?.game;
      attach(game);
    };

    window.addEventListener('neon:game-ready', onReady);
    let poll: ReturnType<typeof setInterval> | undefined;
    if (!attach()) {
      poll = setInterval(() => {
        if (attach()) clearInterval(poll);
      }, 120);
    }

    return () => {
      window.removeEventListener('neon:game-ready', onReady);
      if (poll) clearInterval(poll);
      detach?.();
    };
  }, []);

  if (!announcement) return null;

  return (
    <div
      key={announcement.id}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {announcement.text}
    </div>
  );
}
