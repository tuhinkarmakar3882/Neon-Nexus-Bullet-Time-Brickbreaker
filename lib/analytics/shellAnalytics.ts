/** Lightweight shell/play analytics — console in dev, pluggable for production. */

type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

function emit(event: string, payload: AnalyticsPayload = {}) {
  if (typeof window === 'undefined') return;
  const detail = { event, ts: Date.now(), ...payload };
  window.dispatchEvent(new CustomEvent('neon:analytics', { detail }));
  if (process.env.NODE_ENV === 'development') {
    console.debug('[neon:analytics]', event, payload);
  }
}

export function trackScreenView(path: string) {
  emit('screen_view', { path });
}

export function trackGameOverAction(
  action: 'continue' | 'inventory_continue' | 'share' | 'restart' | 'menu',
) {
  emit('game_over_action', { action });
}

export function trackShareFunnel(step: 'start' | 'preview' | 'complete' | 'cancel', surface: string) {
  emit('share_funnel', { step, surface });
}
