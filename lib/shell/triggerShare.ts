import { shareProgressScreenshot, buildProgressSharePayload } from '@/src/systems/ShareProgress.js';
import { RunPersistence } from '@/src/systems/RunPersistence.js';
import { SHELL_COPY } from '@/lib/copy/shell';

export type ProgressShareMeta = {
  gems: number;
  highScore: number;
};

export type ShareOutcome = Awaited<ReturnType<typeof shareProgressScreenshot>>;

/** Open native share / download for the progress card — no intermediate UI. */
export async function triggerProgressShare(meta: ProgressShareMeta): Promise<ShareOutcome> {
  const run = RunPersistence.loadRun();
  return shareProgressScreenshot(null, buildProgressSharePayload({
    gems: meta.gems,
    highScore: meta.highScore,
    run: run
      ? { level: run.level, score: run.score, lives: run.lives }
      : null,
  }));
}

export function shareOutcomeHint(res: ShareOutcome): string {
  const c = SHELL_COPY.share.status;
  if (!res.ok) {
    if (res.reason === 'cancelled') return c.cancelled;
    return c.failed;
  }
  if (res.method === 'download+clipboard' || res.method === 'share-text+download+clipboard') {
    return c.savedClipboard;
  }
  if (res.method === 'download' || res.method === 'share-text+download') return c.saved;
  return c.shared;
}
