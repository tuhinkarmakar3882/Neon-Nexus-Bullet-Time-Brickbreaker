'use client';

import { useEffect, useState } from 'react';
import { SHELL_COPY } from '@/lib/copy/shell';
import { forceDismissBootSplash } from '@/src/shell/BootSplash.js';

const c = SHELL_COPY.play;
const stuckCopy = c.bootStuck;

/** Full-screen loader while Phaser boots (progress via BootSplash.js). */
export function PlayBootSplash() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(4);
  const [status, setStatus] = useState<string>(c.phases.bundle);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onDismiss = () => setVisible(false);
    const onReset = () => {
      setVisible(true);
      setStuck(false);
      setProgress(4);
      setStatus(c.phases.bundle);
    };
    const onProgress = (e: Event) => {
      const d = (e as CustomEvent<{ progress?: number; label?: string }>).detail;
      if (typeof d?.progress === 'number') setProgress(Math.round(d.progress));
      if (d?.label) setStatus(d.label);
    };
    const onStuck = () => setStuck(true);

    window.addEventListener('neon:boot-splash-dismiss', onDismiss);
    window.addEventListener('neon:boot-splash-reset', onReset);
    window.addEventListener('neon:boot-splash-progress', onProgress);
    window.addEventListener('neon:boot-splash-stuck', onStuck);
    return () => {
      window.removeEventListener('neon:boot-splash-dismiss', onDismiss);
      window.removeEventListener('neon:boot-splash-reset', onReset);
      window.removeEventListener('neon:boot-splash-progress', onProgress);
      window.removeEventListener('neon:boot-splash-stuck', onStuck);
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
      aria-valuenow={progress}
      aria-label={`Loading Neon Nexus: ${status}`}
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
          <div className="play-boot__bar" data-boot-bar style={{ width: `${progress}%` }} />
        </div>

        <p className="play-boot__status" data-boot-status>
          {status}
        </p>
        <p className="play-boot__pct" data-boot-pct>
          {progress}%
        </p>

        {stuck ? (
          <div className="play-boot__stuck" role="region" aria-label="Boot taking longer than expected">
            <p className="play-boot__stuck-msg">{c.phases.stuckRetry}</p>
            <div className="play-boot__stuck-actions">
              <button
                type="button"
                className="play-boot-error__btn play-boot-error__btn--primary"
                onClick={() => forceDismissBootSplash()}
              >
                {stuckCopy.retry}
              </button>
              <button
                type="button"
                className="play-boot-error__btn play-boot-error__btn--secondary"
                onClick={() => window.location.reload()}
              >
                {stuckCopy.refresh}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
