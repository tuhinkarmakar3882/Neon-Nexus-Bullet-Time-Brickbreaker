'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameplayHudState } from '@/lib/shell/useGameplayHudState';
import { FTUE_NEXUS_TIP, hasSeenNexusCoach, markNexusCoachSeen } from '@/lib/shell/ftue';

/** One-time coach when Nexus meter fills for the first time. */
export function NexusCoachBanner() {
  const { nexusReady } = useGameplayHudState();
  const [open, setOpen] = useState(false);
  const wasReady = useRef(false);

  useEffect(() => {
    if (hasSeenNexusCoach()) return;
    if (nexusReady && !wasReady.current) {
      setOpen(true);
    }
    wasReady.current = nexusReady;
  }, [nexusReady]);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    markNexusCoachSeen();
  };

  return (
    <div className="power-coach power-coach--nexus" role="status" aria-live="polite">
      <p className="power-coach__label">Nexus ready</p>
      <p className="power-coach__power">{FTUE_NEXUS_TIP}</p>
      <button type="button" className="power-coach__dismiss" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
