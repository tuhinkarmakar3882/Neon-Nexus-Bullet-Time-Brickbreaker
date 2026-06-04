import Phaser from 'phaser';
import { SCENES, DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '../config/Constants.js';
import { audio } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { RunPersistence } from '../systems/RunPersistence.js';
import { consumePlayIntent, peekForceNew, peekPlayIntent } from '../shell/playIntent.js';
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
    audio.applySettings({
      sound: s.sound,
      music: s.music,
      sfxVolume: s.sfxVolume ?? DEFAULT_SFX_VOLUME,
      musicVolume: s.musicVolume ?? DEFAULT_MUSIC_VOLUME,
    });
    audio.setMusicEnabled(s.music);
    audio.preloadMusicCatalog();

    const fromWindow = typeof window !== 'undefined' ? window.__neonPlayIntent : null;
    const peeked = peekPlayIntent();
    const intent = fromWindow ?? peeked;
    const mode = intent?.mode ?? 'new';
    const extra = intent?.extra ?? {};
    const forceNew = extra.forceNew === true || peekForceNew();
    if (typeof window !== 'undefined') window.__neonPlayIntent = null;
    consumePlayIntent();

    setBootSplash({ progress: 72, label: 'Arming your siege…' });
    if (forceNew) RunPersistence.clearRun();
    const snap = RunPersistence.loadRun();
    const shouldResume = !!snap && (mode === 'resume' || (mode === 'new' && !forceNew));
    if (shouldResume) {
      this.scene.start(SCENES.GAME, { resume: snap, ...extra });
      return;
    }
    this.scene.start(SCENES.GAME, { newGame: true, forceNew: true, ...extra });
  }
}
