import {
  shareProgressScreenshot,
  buildProgressSharePayload,
  renderShareCardDataUrl,
} from '@/src/systems/ShareProgress.js';
import { RunPersistence } from '@/src/systems/RunPersistence.js';
import { SHELL_COPY } from '@/lib/copy/shell';

export type ProgressShareMeta = {
  gems: number;
  highScore: number;
};

export type ShareOutcome = Awaited<ReturnType<typeof shareProgressScreenshot>>;

function progressPayload(meta: ProgressShareMeta) {
  const run = RunPersistence.loadRun();
  return buildProgressSharePayload({
    gems: meta.gems,
    highScore: meta.highScore,
    run: run ? { level: run.level, score: run.score, lives: run.lives } : null,
  });
}

/** PNG data URL for share preview UI. */
export async function renderProgressSharePreview(meta: ProgressShareMeta): Promise<string | null> {
  return renderShareCardDataUrl(progressPayload(meta));
}

/** Open native share / download for the progress card. */
export async function triggerProgressShare(meta: ProgressShareMeta): Promise<ShareOutcome> {
  return shareProgressScreenshot(null, progressPayload(meta));
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
