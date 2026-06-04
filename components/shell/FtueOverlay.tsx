'use client';

import { TutorialOverlay, type TutorialStep } from '@/components/shell/TutorialOverlay';

type FtueOverlayProps = {
  steps: readonly TutorialStep[];
  onComplete: () => void;
  ariaLabel?: string;
};

export function FtueOverlay({ steps, onComplete, ariaLabel = 'Welcome tour' }: FtueOverlayProps) {
  return (
    <TutorialOverlay
      steps={steps}
      onComplete={onComplete}
      ariaLabel={ariaLabel}
      completeLabel="Enter the garden"
    />
  );
}
