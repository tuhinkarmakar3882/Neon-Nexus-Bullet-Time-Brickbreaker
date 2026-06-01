import { resolveSettings } from '../config/VfxQuality.js';
import { SaveManager } from './SaveManager.js';

function hapticsOn() {
  return !!resolveSettings(SaveManager.loadSettings()).haptics;
}

export function hapticPulse(ms = 12) {
  if (!hapticsOn()) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

/** Pattern e.g. [8, 40, 8] for double-tap. */
export function hapticPattern(pattern) {
  if (!hapticsOn() || !pattern?.length) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
