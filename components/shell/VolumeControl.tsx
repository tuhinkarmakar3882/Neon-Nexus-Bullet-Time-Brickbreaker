'use client';

import { Minus, Plus } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';

type VolumeControlProps = {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
};

export function VolumeControl({
  value,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
}: VolumeControlProps) {
  return (
    <div className="volume-control">
      <button type="button" className="volume-control__btn" onClick={onDecrease} aria-label={decreaseLabel}>
        <LucideIcon icon={Minus} size={16} />
      </button>
      <span className="volume-control__value">{value}%</span>
      <button type="button" className="volume-control__btn" onClick={onIncrease} aria-label={increaseLabel}>
        <LucideIcon icon={Plus} size={16} />
      </button>
    </div>
  );
}
