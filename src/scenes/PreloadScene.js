import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  preload() {
    this.load.svg('pause-icon', './images/pause-icon.svg', { width: 48, height: 48 });
    this.load.svg('heart-icon', './images/heart-icon.svg', { width: 32, height: 32 });
    this.load.svg('settings-icon', './images/settings-icon.svg', { width: 48, height: 48 });
  }

  create() {
    this.scene.start(SCENES.MENU);
  }
}
