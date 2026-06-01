import Phaser from 'phaser';
import { SCENES, DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '../config/Constants.js';
import { audio } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { RunPersistence } from '../systems/RunPersistence.js';
import { consumePlayIntent, peekPlayIntent } from '../shell/playIntent.js';
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

    const fromWindow = typeof window !== 'undefined' ? window.__neonPlayIntent : null;
    const peeked = peekPlayIntent();
    const intent = fromWindow ?? peeked;
    const mode = intent?.mode ?? 'new';
    const extra = intent?.extra ?? {};
    const forceNew = extra.forceNew === true;
    if (typeof window !== 'undefined') window.__neonPlayIntent = null;
    consumePlayIntent();

    setBootSplash({ progress: 72, label: 'Arming your siege…' });
    const snap = RunPersistence.loadRun();
    const shouldResume = (mode === 'resume' || (!forceNew && snap)) && snap;
    if (shouldResume) {
      this.scene.start(SCENES.GAME, { resume: snap, ...extra });
      return;
    }
    this.scene.start(SCENES.GAME, { newGame: true, ...extra });
  }
}
