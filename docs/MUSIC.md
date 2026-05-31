# Music — Pixabay loops + style variants

Background music uses **Pixabay** ambient/chill loops (commercial use per Pixabay License). SFX remain Web Audio procedural in [`AudioManager.js`](../src/systems/AudioManager.js).

## Track catalog

[`src/config/MusicCatalog.js`](../src/config/MusicCatalog.js) — tagged Pixabay URLs; `trackForLevel(level, seed, { biome, isBoss, musicVariant })` picks from the active style pool each level.

## Music styles (Settings → Music Style)

| Style | Feel |
|-------|------|
| **Auto** | Full catalog — rotates by level, biome, boss |
| **Neon** | Synth-forward electronic |
| **Chill** | Laid-back ambient |
| **Pulse** | Higher-energy action / boss |
| **Zen** | Minimal calm pads |
| **Retro** | 80s-style synth |

Menu, shop, codex, and settings use the style’s menu pool. Volume sliders for SFX and music are in Settings.

Credits shown in Settings: *Background music from Pixabay contributors.*

## Optional offline hosting

Download loops and place in `public/audio/` — update `MusicCatalog.js` URLs to `./audio/menu.mp3` etc. for PWA precache.
