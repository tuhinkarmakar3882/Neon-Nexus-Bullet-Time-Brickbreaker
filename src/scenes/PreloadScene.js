import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { audio } from '../systems/AudioManager.js';

/** Boot pass — prefetch music catalog, then menu. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  create() {
    audio.init();
    audio.preloadMusicCatalog();
    this.scene.start(SCENES.MENU);
  }
}
