import Phaser from 'phaser';
import { SCENES, DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '../config/Constants.js';
import { audio } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { RunPersistence } from '../systems/RunPersistence.js';
import { consumePlayIntent } from '../shell/playIntent.js';
import { setBootSplash } from '../shell/BootSplash.js';

/** Boot pass — prefetch music catalog, then start gameplay (shell is React). */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  create() {
    setBootSplash({ progress: 62, label: 'Planting the arena…' });
    audio.init();
    const s = SaveManager.loadSettings();
    audio.setSoundEnabled(s.sound);
    audio.setMusicEnabled(s.music);
    audio.setSfxVolume(s.sfxVolume ?? DEFAULT_SFX_VOLUME);
    audio.setMusicVolume(s.musicVolume ?? DEFAULT_MUSIC_VOLUME);
    audio.preloadMusicCatalog();

    const intent = typeof window !== 'undefined' ? window.__neonPlayIntent : null;
    const mode = intent?.mode ?? 'new';
    const extra = intent?.extra ?? {};
    if (typeof window !== 'undefined') window.__neonPlayIntent = null;
    consumePlayIntent();

    setBootSplash({ progress: 72, label: 'Arming your siege…' });
    if (mode === 'resume') {
      const snap = RunPersistence.loadRun();
      if (snap) {
        this.scene.start(SCENES.GAME, { resume: snap, ...extra });
        return;
      }
    }
    this.scene.start(SCENES.GAME, { newGame: true, ...extra });
  }
}
