/** Session-scoped hub reward queue — populated on play exit, consumed on home mount. */

const QUEUE_KEY = 'nn_hub_reward_queue';
const JOURNAL_TOASTED_KEY = 'nn_journal_toasted';

export type HubCodexUnlock = {
  kind: 'codex';
  category: 'powers' | 'gnomes' | 'bricks';
  id: string;
};

export type HubPostRunSummary = {
  kind: 'postRun';
  reason: 'clear' | 'gameover' | 'quit';
  level: number;
  score: number;
  stars?: number;
  gemsEarned?: number;
  isNewBest?: boolean;
  returnStreak?: number;
};

export type HubAchievementToast = {
  kind: 'achievement';
  id: string;
  label: string;
};

export type HubRewardItem = HubCodexUnlock | HubPostRunSummary | HubAchievementToast;

function readRaw(): HubRewardItem[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items: HubRewardItem[]): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* private mode */
  }
}

export function pushHubReward(item: HubRewardItem): void {
  writeRaw([...readRaw(), item]);
}

export function peekHubRewards(): HubRewardItem[] {
  return readRaw();
}

export function consumeHubRewards(): HubRewardItem[] {
  const items = readRaw();
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(QUEUE_KEY);
    } catch {
      /* ignore */
    }
  }
  return items;
}

export function queueCodexUnlock(category: HubCodexUnlock['category'], id: string): void {
  if (!id) return;
  pushHubReward({ kind: 'codex', category, id });
}

export function queuePostRunSummary(
  summary: Omit<HubPostRunSummary, 'kind'>,
): void {
  pushHubReward({ kind: 'postRun', ...summary });
}

function readJournalToasted(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(JOURNAL_TOASTED_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeJournalToasted(ids: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(JOURNAL_TOASTED_KEY, JSON.stringify(ids));
  } catch {
    /* private mode */
  }
}

/** Seed toasted ids on first hub visit; return newly completed achievements since last visit. */
export function pullNewJournalAchievements(
  entries: ReadonlyArray<{ id: string; label: string; done: boolean }>,
): HubAchievementToast[] {
  const done = entries.filter((e) => e.done);
  const toasted = readJournalToasted();
  if (toasted.length === 0 && done.length === 0) {
    writeJournalToasted([]);
    return [];
  }
  if (toasted.length === 0 && done.length > 0) {
    writeJournalToasted(done.map((e) => e.id));
    return [];
  }
  const fresh = done.filter((e) => !toasted.includes(e.id));
  if (fresh.length) {
    writeJournalToasted([...toasted, ...fresh.map((e) => e.id)]);
  }
  return fresh.map((e) => ({ kind: 'achievement', id: e.id, label: e.label }));
}
