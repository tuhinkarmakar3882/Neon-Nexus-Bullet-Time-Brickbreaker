import { resolveSettings } from '../config/VfxQuality.js';
import { SaveManager } from './SaveManager.js';

export function hapticPulse(ms = 12) {
  if (!resolveSettings(SaveManager.loadSettings()).haptics) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
