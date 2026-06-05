#!/usr/bin/env node
/** Unit checks for mergeMeta conflict rules. */
import { mergeMeta, mergeSaveDocuments } from '../lib/persistence/mergeMeta.ts';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log('ok', msg);
  } else {
    failed += 1;
    console.error('FAIL', msg);
  }
}

const local = {
  gems: 40,
  treasury: 10,
  stars: { '1': 2, '2': 1 },
  codex: { powers: ['a'], gnomes: [], bricks: [] },
  stats: { levelsCleared: 3 },
};

const remote = {
  gems: 25,
  treasury: 15,
  stars: { '1': 3, '2': 0, '3': 2 },
  codex: { powers: ['b'], gnomes: ['g1'], bricks: [] },
  stats: { levelsCleared: 2, knockouts: 5 },
};

const merged = mergeMeta(local, remote);
assert(merged.gems === 40, 'gems = max');
assert(merged.treasury === 15, 'treasury = max');
assert(merged.stars['1'] === 3, 'stars per-level max');
assert(merged.stars['3'] === 2, 'stars union keys');
assert(merged.codex.powers.includes('a') && merged.codex.powers.includes('b'), 'codex union');
assert(merged.stats.levelsCleared === 3, 'stats max');
assert(merged.stats.knockouts === 5, 'stats remote keys kept');

const docLocal = {
  schemaVersion: 2,
  revision: 1,
  meta: local,
  settings: { sound: true },
  highScore: 1000,
  returnStreak: 2,
  returnStreakDate: '2026-06-01',
  run: { savedAt: 100, level: 2 },
  entitlements: { removeAds: false, premium: false, stripeRedeemed: [] },
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const docRemote = {
  schemaVersion: 2,
  revision: 2,
  meta: remote,
  settings: { music: false },
  highScore: 800,
  returnStreak: 4,
  returnStreakDate: '2026-06-05',
  run: { savedAt: 200, level: 3 },
  entitlements: { removeAds: true, premium: false, stripeRedeemed: ['x'] },
  updatedAt: '2026-06-05T00:00:00.000Z',
};

const mergedDoc = mergeSaveDocuments(docLocal, docRemote);
assert(mergedDoc.highScore === 1000, 'highScore max in doc merge');
assert(mergedDoc.returnStreak === 4, 'returnStreak max');
assert(mergedDoc.run.savedAt === 200, 'newer run wins');
assert(mergedDoc.entitlements.removeAds === true, 'entitlements OR merge');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
