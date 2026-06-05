import type { PlayerSaveDocument, PlayerEntitlements } from './types';

function unionStrings(a: string[] = [], b: string[] = []): string[] {
  return [...new Set([...a, ...b])];
}

function maxNum(a: number, b: number): number {
  return Math.max(a ?? 0, b ?? 0);
}

function mergeStars(
  local: Record<string, number> = {},
  remote: Record<string, number> = {},
): Record<string, number> {
  const out = { ...remote };
  for (const [k, v] of Object.entries(local)) {
    out[k] = maxNum(v, remote[k] ?? 0);
  }
  return out;
}

function mergeCodex(
  local: { powers?: string[]; gnomes?: string[]; bricks?: string[] } = {},
  remote: { powers?: string[]; gnomes?: string[]; bricks?: string[] } = {},
) {
  return {
    powers: unionStrings(local.powers, remote.powers),
    gnomes: unionStrings(local.gnomes, remote.gnomes),
    bricks: unionStrings(local.bricks, remote.bricks),
  };
}

function mergeCosmetics(
  local: { owned?: Record<string, string[]>; equipped?: Record<string, string> } = {},
  remote: { owned?: Record<string, string[]>; equipped?: Record<string, string> } = {},
) {
  const kinds = new Set([
    ...Object.keys(local.owned ?? {}),
    ...Object.keys(remote.owned ?? {}),
  ]);
  const owned: Record<string, string[]> = {};
  for (const kind of kinds) {
    owned[kind] = unionStrings(local.owned?.[kind], remote.owned?.[kind]);
  }
  return {
    owned,
    equipped: { ...remote.equipped, ...local.equipped },
  };
}

function mergeStats(
  local: Record<string, number> = {},
  remote: Record<string, number> = {},
): Record<string, number> {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, number> = {};
  for (const k of keys) {
    out[k] = maxNum(local[k] ?? 0, remote[k] ?? 0);
  }
  return out;
}

function mergeDailyScores(
  local: { score?: number; date?: string }[] = [],
  remote: { score?: number; date?: string }[] = [],
) {
  const byDate = new Map<string, number>();
  for (const e of [...remote, ...local]) {
    if (!e?.date) continue;
    byDate.set(e.date, maxNum(e.score ?? 0, byDate.get(e.date) ?? 0));
  }
  return [...byDate.entries()]
    .map(([date, score]) => ({ date, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/** Deterministic merge for meta blobs — used on 409 conflict and first sign-in. */
export function mergeMeta(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): Record<string, unknown> {
  const l = local ?? {};
  const r = remote ?? {};
  return {
    ...r,
    ...l,
    schemaVersion: Math.max(Number(l.schemaVersion ?? 0), Number(r.schemaVersion ?? 0)),
    treasury: maxNum(Number(l.treasury), Number(r.treasury)),
    gems: maxNum(Number(l.gems), Number(r.gems)),
    stars: mergeStars(l.stars as Record<string, number>, r.stars as Record<string, number>),
    dailyBest: maxNum(Number(l.dailyBest), Number(r.dailyBest)),
    dailyDate: (Number(l.dailyBest) >= Number(r.dailyBest) ? l.dailyDate : r.dailyDate) ?? '',
    dailyScores: mergeDailyScores(
      l.dailyScores as { score?: number; date?: string }[],
      r.dailyScores as { score?: number; date?: string }[],
    ),
    loadout: unionStrings(l.loadout as string[], r.loadout as string[]).slice(0, 3),
    codex: mergeCodex(l.codex as object, r.codex as object),
    stats: mergeStats(l.stats as Record<string, number>, r.stats as Record<string, number>),
    cosmetics: mergeCosmetics(l.cosmetics as object, r.cosmetics as object),
    premium: Boolean(l.premium || r.premium),
    lastRunPath: (Array.isArray(l.lastRunPath) && l.lastRunPath.length >= (r.lastRunPath as unknown[])?.length
      ? l.lastRunPath
      : r.lastRunPath) ?? [],
  };
}

export function mergeSettings(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  localUpdatedAt: number,
  remoteUpdatedAt: number,
): Record<string, unknown> {
  if (remoteUpdatedAt > localUpdatedAt) return { ...local, ...remote };
  return { ...remote, ...local };
}

export function mergeEntitlements(
  local: PlayerEntitlements,
  remote: PlayerEntitlements,
): PlayerEntitlements {
  return {
    removeAds: local.removeAds || remote.removeAds,
    premium: local.premium || remote.premium,
    stripeRedeemed: unionStrings(local.stripeRedeemed, remote.stripeRedeemed),
  };
}

export function mergeSaveDocuments(
  local: PlayerSaveDocument,
  remote: PlayerSaveDocument,
): PlayerSaveDocument {
  const localTs = new Date(local.updatedAt).getTime() || 0;
  const remoteTs = new Date(remote.updatedAt).getTime() || 0;
  const mergedMeta = mergeMeta(local.meta, remote.meta);
  const mergedSettings = mergeSettings(local.settings, remote.settings, localTs, remoteTs);
  const mergedEntitlements = mergeEntitlements(local.entitlements, remote.entitlements);

  let run: Record<string, unknown> | null = (local.run as Record<string, unknown>) ?? null;
  const localRun = local.run as { savedAt?: number } | null;
  const remoteRun = remote.run as { savedAt?: number } | null;
  if (remoteRun?.savedAt && localRun?.savedAt) {
    run = remoteRun.savedAt > localRun.savedAt ? remote.run as Record<string, unknown> : local.run as Record<string, unknown>;
  } else if (remote.run && !local.run) {
    run = remote.run as Record<string, unknown>;
  }

  return {
    schemaVersion: Math.max(local.schemaVersion, remote.schemaVersion),
    revision: Math.max(local.revision, remote.revision),
    meta: mergedMeta,
    settings: mergedSettings,
    highScore: maxNum(local.highScore, remote.highScore),
    returnStreak: maxNum(local.returnStreak, remote.returnStreak),
    returnStreakDate:
      local.returnStreak >= remote.returnStreak
        ? local.returnStreakDate
        : remote.returnStreakDate,
    run,
    entitlements: mergedEntitlements,
    updatedAt: new Date().toISOString(),
  };
}
