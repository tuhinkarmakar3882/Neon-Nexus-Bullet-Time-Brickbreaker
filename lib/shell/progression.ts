import { COSMETIC_SECTIONS } from '@/src/config/Cosmetics.js';
import { GNOME_TIERS } from '@/src/config/GnomeTiers.js';
import { POWER_KEYS } from '@/src/config/PowerUps.js';
import { MetaProgress } from '@/src/systems/MetaProgress.js';

export function countCosmetics() {
  let total = 0;
  let owned = 0;
  for (const section of COSMETIC_SECTIONS) {
    for (const item of section.items) {
      total += 1;
      if (MetaProgress.ownsCosmetic(section.kind, item.id)) owned += 1;
    }
  }
  return { owned, total };
}

export function codexDiscovery() {
  const c = MetaProgress.getCodex();
  const powersFound = c.powers?.length ?? 0;
  const gnomesFound = c.gnomes?.length ?? 0;
  const powerTotal = POWER_KEYS.length;
  const gnomeTotal = Object.keys(GNOME_TIERS).length;
  const found = powersFound + gnomesFound;
  const total = powerTotal + gnomeTotal;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;
  return { found, total, pct, powersFound, powerTotal, gnomesFound, gnomeTotal };
}

export function journalProgress() {
  const entries = MetaProgress.getJournalAchievements();
  const done = entries.filter((e) => e.done).length;
  return { done, total: entries.length };
}

/** Next cosmetic gem price above current balance (or null). */
export function nextCosmeticGoal(gems: number) {
  let next: number | null = null;
  for (const section of COSMETIC_SECTIONS) {
    for (const item of section.items) {
      if (item.cost <= 0) continue;
      if (MetaProgress.ownsCosmetic(section.kind, item.id)) continue;
      if (item.premium && !MetaProgress.isPremium()) continue;
      if (gems < item.cost && (next === null || item.cost < next)) next = item.cost;
    }
  }
  return next;
}
