import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';

// No external binary assets to load (all art/audio is procedural), but we keep a
// dedicated scene so adding hosted assets later is trivial.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  create() {
    this.scene.start(SCENES.MENU);
  }
}
