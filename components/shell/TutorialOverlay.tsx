'use client';

import { useState } from 'react';
import { NeonButton } from '@/components/shell/AppShell';

export type TutorialStep = { title: string; body: string };

type TutorialOverlayProps = {
  steps: readonly TutorialStep[];
  onComplete: () => void;
  ariaLabel?: string;
  completeLabel?: string;
  skipLabel?: string;
};

export function TutorialOverlay({
  steps,
  onComplete,
  ariaLabel = 'Game tutorial',
  completeLabel = 'Enter the garden',
  skipLabel = 'Skip',
}: TutorialOverlayProps) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index >= steps.length - 1;

  const advance = () => {
    if (last) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <div className="ftue-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="ftue-overlay__card">
        <p className="ftue-overlay__step">
          {index + 1} / {steps.length}
        </p>
        <h2 className="ftue-overlay__title">{step.title}</h2>
        <p className="ftue-overlay__body">{step.body}</p>
        <div className="ftue-overlay__actions">
          <NeonButton variant="primary" onClick={advance}>
            {last ? completeLabel : 'Next'}
          </NeonButton>
          {!last ? (
            <NeonButton variant="muted" onClick={onComplete}>
              {skipLabel}
            </NeonButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
