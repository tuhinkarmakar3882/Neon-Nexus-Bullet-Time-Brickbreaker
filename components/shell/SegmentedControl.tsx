'use client';

import { useId } from 'react';

type SegmentedControlProps = {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  formatLabel?: (value: string) => string;
  ariaLabel: string;
  /** Stable id prefix for tab/panel wiring (e.g. "codex"). */
  idPrefix?: string;
};

export function segmentedTabIds(prefix: string, option: string) {
  return {
    tab: `${prefix}-tab-${option}`,
    panel: `${prefix}-panel-${option}`,
  };
}

export function SegmentedControl({
  options,
  value,
  onChange,
  formatLabel = (v) => v.toUpperCase(),
  ariaLabel,
  idPrefix,
}: SegmentedControlProps) {
  const autoId = useId();
  const base = idPrefix ?? autoId;

  return (
    <div className="segmented-control" role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => {
        const tabId = `${base}-tab-${opt}`;
        const panelId = `${base}-panel-${opt}`;
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            id={tabId}
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            className={`segmented-control__btn${selected ? ' is-active' : ''}`}
            onClick={() => onChange(opt)}
          >
            {formatLabel(opt)}
          </button>
        );
      })}
    </div>
  );
}
