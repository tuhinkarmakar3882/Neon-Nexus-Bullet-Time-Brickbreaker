# Music — Pixabay loops

Background music uses **Pixabay** ambient/chill loops (commercial use per Pixabay License). SFX remain Web Audio procedural in [`AudioManager.js`](../src/systems/AudioManager.js).

## Track catalog

[`src/config/MusicCatalog.js`](../src/config/MusicCatalog.js) — 9 unique Pixabay URLs, 22 tagged entries; `trackForLevel(level, seed, { biome, isBoss })` rotates by level and biome.

Default mix: **SFX 100%**, **music 10%** (faint background bed). Toggles and volume sliders are in Settings.

Credits shown in Settings: *Background music from Pixabay contributors.*

## Optional offline hosting

Download loops and place in `public/audio/` — update `MusicCatalog.js` URLs to `./audio/menu.mp3` etc. for PWA precache.
