# Music — Pixabay loops

Background music uses **Pixabay** ambient/chill loops (commercial use per Pixabay License). SFX remain Web Audio procedural in [`AudioManager.js`](../src/systems/AudioManager.js).

## Track catalog

[`src/config/MusicCatalog.js`](../src/config/MusicCatalog.js) — **10 unique loops**, each with a title, energy rating, and biome tags.

| Track | Biomes | Role |
|-------|--------|------|
| Twilight Atrium | garden | Menu · calm opener |
| Neon Grove | garden, nexus | Mid-energy garden |
| Circuit Pulse | nexus | Electronic pulse |
| Frost Lattice | frost, garden | Cool ambient |
| Ember Forge | ember, nexus | High energy · boss-capable |
| Siege Overture | ember, nexus | Boss / fortress |
| Zen Drift | garden, frost | Menu · low energy |
| Starlit Nexus | nexus, garden | Menu · nexus mood |
| Lo-Fi Hollow | garden, frost | Relaxed bed |
| Stream Reflection | frost, garden | Ambient water bed |

### Selection

Each level picks the next track from a **seeded shuffle** of every URL in `PIXABAY_URLS`:

1. All tracks play once per cycle (no repeats within a cycle).
2. When the list is exhausted, a new shuffled cycle starts (avoiding back-to-back repeats across cycles).
3. Order is tied to `campaignSeed` so Continue/resume keeps the same track for a given level.

Add new loops by appending to `PIXABAY_URLS` and optionally `PIXABAY_TRACK_META` for display titles.

`menuTrackForVariant()` uses menu-tagged entries from metadata, or falls back to the full URL list.

Default mix: **SFX 100%**, **music 25%** default volume in settings. Toggles and sliders live in Settings.

Credits: *Background music from Pixabay contributors (ambient & chill loops).*

## Verify

```bash
node scripts/validate-music.mjs
```

## Optional offline hosting

Download loops and place in `public/audio/` — update `MusicCatalog.js` URLs to `./audio/twilight-atrium.mp3` etc. for PWA precache.
