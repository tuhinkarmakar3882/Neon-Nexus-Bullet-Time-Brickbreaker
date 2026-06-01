'use client';

import { useEffect, useState } from 'react';
import { SHELL_COPY } from '@/lib/copy/shell';

const c = SHELL_COPY.play;

/** Full-screen loader while Phaser boots (progress via BootSplash.js). */
export function PlayBootSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onDismiss = () => setVisible(false);
    const onReset = () => setVisible(true);
    window.addEventListener('neon:boot-splash-dismiss', onDismiss);
    window.addEventListener('neon:boot-splash-reset', onReset);
    return () => {
      window.removeEventListener('neon:boot-splash-dismiss', onDismiss);
      window.removeEventListener('neon:boot-splash-reset', onReset);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="boot-splash"
      className="play-boot premium-loader"
      role="progressbar"
      aria-live="polite"
      aria-busy="true"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={4}
      aria-label="Loading Neon Nexus"
    >
      <div className="play-boot__bg" aria-hidden />
      <div className="play-boot__grid" aria-hidden />
      <div className="play-boot__glow play-boot__glow--teal" aria-hidden />
      <div className="play-boot__glow play-boot__glow--magenta" aria-hidden />

      <div className="play-boot__inner">
        <p className="play-boot__brand">{c.bootTitle}</p>
        <p className="play-boot__tag">{c.bootTagline}</p>
        <p className="play-boot__sub">{c.bootSubtitle}</p>

        <div className="play-boot__track">
          <div className="play-boot__bar" data-boot-bar style={{ width: '4%' }} />
        </div>

        <p className="play-boot__status" data-boot-status>
          {c.phases.bundle}
        </p>
        <p className="play-boot__pct" data-boot-pct>
          4%
        </p>
      </div>
    </div>
  );
}
