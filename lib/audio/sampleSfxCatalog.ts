/**
 * Hybrid sample-SFX catalog stub — procedural WebAudio remains primary in AudioManager.
 * Future: map gameplay events to short sample URLs (CDN or bundled) with fallbacks.
 */

export type SampleSfxSlot = {
  id: string;
  label: string;
  /** Optional URL when a licensed sample pack is wired */
  url?: string;
  /** Procedural fallback key understood by AudioManager blip paths */
  proceduralFallback?: 'blip' | 'hit' | 'power';
};

/** Placeholder slots — no URLs shipped until asset pack is curated. */
export const SAMPLE_SFX_CATALOG: SampleSfxSlot[] = [
  { id: 'paddle-hit', label: 'Paddle hit', proceduralFallback: 'hit' },
  { id: 'brick-chip', label: 'Brick chip', proceduralFallback: 'blip' },
  { id: 'power-pickup', label: 'Power pickup', proceduralFallback: 'power' },
  { id: 'gnome-knockout', label: 'Gnome knockout', proceduralFallback: 'blip' },
];

export function sampleSfxById(id: string): SampleSfxSlot | undefined {
  return SAMPLE_SFX_CATALOG.find((s) => s.id === id);
}

/** True when hybrid mode can prefer samples over pure procedural (stub: always false). */
export function isSampleSfxEnabled(): boolean {
  return false;
}
