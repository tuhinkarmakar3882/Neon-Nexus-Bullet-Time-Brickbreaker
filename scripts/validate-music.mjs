#!/usr/bin/env node
/** Verify Pixabay music URLs in MusicCatalog respond with HTTP 200. */
import {
  PIXABAY_URLS,
  allTrackUrls,
  musicCatalogSummary,
  urlForLevel,
} from '../src/config/MusicCatalog.js';

const urls = allTrackUrls();
let failed = 0;

if (urls.length !== PIXABAY_URLS.filter(Boolean).length) {
  console.error('Duplicate URLs in PIXABAY_URLS — each entry must be unique.');
  process.exit(1);
}

console.log(`Checking ${urls.length} music tracks…`);
for (const track of musicCatalogSummary()) {
  console.log(`  · ${track.title}${track.menu ? ' (menu)' : ''}`);
}

const seed = 42;
const cycleSet = new Set();
for (let lv = 1; lv <= urls.length; lv++) cycleSet.add(urlForLevel(lv, seed));
if (cycleSet.size !== urls.length) {
  console.error(`Shuffle cycle should use all ${urls.length} URLs once; got ${cycleSet.size} unique.`);
  process.exit(1);
}

for (const url of urls) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.status !== 200) {
      console.error(`FAIL ${res.status} ${url}`);
      failed += 1;
    }
  } catch (err) {
    console.error(`ERR  ${url}`, err.message);
    failed += 1;
  }
}

if (failed) {
  console.error(`${failed}/${urls.length} tracks failed`);
  process.exit(1);
}

console.log(`OK: ${urls.length} tracks reachable, shuffle cycle verified`);
