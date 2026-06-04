'use client';

type UiSwitchProps = {
  id?: string;
  on: boolean;
  onToggle: () => void;
  ariaLabel?: string;
};

export function UiSwitch({ id, on, onToggle, ariaLabel }: UiSwitchProps) {
  return (
    <button
      type="button"
      id={id}
      className={`ui-switch${on ? ' is-on' : ''}`}
      onClick={onToggle}
      aria-pressed={on}
      aria-label={ariaLabel}
    >
      <span className="ui-switch__dot" aria-hidden />
      {on ? 'On' : 'Off'}
    </button>
  );
}
