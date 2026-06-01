#!/usr/bin/env node
/** Validate SaveMigration upgrades legacy fixtures. */
import assert from 'node:assert/strict';
import { upgradeRunSnapshot, runMigrations, CURRENT_SAVE_SCHEMA } from '../src/systems/SaveMigration.js';

const store = {};

global.localStorage = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; },
};

function seedV1Run() {
  store.nn_run_v1 = JSON.stringify({
    version: 1,
    savedAt: Date.now(),
    campaignSeed: 12345,
    level: 3,
    score: 9000,
    lives: 2,
    continues: 1,
    combo: 4,
    activePowers: [],
    ballElement: null,
    levelSeed: 99,
  });
}

function seedLegacyVfx() {
  store.nn_sound = 'true';
  store.nn_music = 'true';
  store.nn_particles = 'true';
  store.nn_reducedFx = 'false';
  delete store.nn_vfxQuality;
}

seedLegacyVfx();
seedV1Run();
store.nn_meta_v1 = JSON.stringify({ gems: 10, treasury: 0 });

const result = runMigrations();
assert.equal(result.to, CURRENT_SAVE_SCHEMA);
assert.equal(Number(store.nn_save_schema), CURRENT_SAVE_SCHEMA);

const meta = JSON.parse(store.nn_meta_v1);
assert.ok(meta.schemaVersion >= 2);

const run = JSON.parse(store.nn_run_v1);
assert.equal(run.version, 2);

const upgraded = upgradeRunSnapshot({ version: 1, level: 1, savedAt: Date.now(), score: 0, lives: 3, continues: 0, combo: 0, activePowers: [] });
assert.equal(upgraded.version, 2);
assert.ok(upgraded.powerDropSeq === 0);

assert.equal(upgradeRunSnapshot({ version: 99 }), null);

console.log('validate-save-migration: OK');
