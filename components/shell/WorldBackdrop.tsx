import type { CSSProperties } from 'react';

type WorldBackdropProps = {
  variant?: 'hub' | 'codex' | 'forge' | 'utility' | 'plain';
};

/** Ambient garden layer — world first, UI second. */
export function WorldBackdrop({ variant = 'plain' }: WorldBackdropProps) {
  return (
    <div className={`world-backdrop world-backdrop--${variant}`} aria-hidden>
      <div className="world-backdrop__nebula" />
      <div className="world-backdrop__grid" />
      <div className="world-backdrop__orb world-backdrop__orb--teal" />
      <div className="world-backdrop__orb world-backdrop__orb--magenta" />
      <div className="world-backdrop__orb world-backdrop__orb--violet" />
      {variant === 'hub' ? (
        <>
          <div className="world-backdrop__crystal" />
          <div className="world-backdrop__scanlines world-backdrop__scanlines--hub" />
          <div className="world-backdrop__spores">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="world-backdrop__spore" style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
        </>
      ) : null}
      {variant === 'codex' ? <div className="world-backdrop__scanlines" /> : null}
      {variant === 'forge' ? <div className="world-backdrop__embers" /> : null}
    </div>
  );
}
