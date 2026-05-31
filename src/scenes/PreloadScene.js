import Phaser from 'phaser';
import { SCENES, DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '../config/Constants.js';
import { audio } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';

/** Boot pass — prefetch music catalog, then menu. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  create() {
    audio.init();
    const s = SaveManager.loadSettings();
    audio.setSoundEnabled(s.sound);
    audio.setMusicEnabled(s.music);
    audio.setSfxVolume(s.sfxVolume ?? DEFAULT_SFX_VOLUME);
    audio.setMusicVolume(s.musicVolume ?? DEFAULT_MUSIC_VOLUME);
    audio.preloadMusicCatalog();
    this.scene.start(SCENES.MENU);
  }
}
