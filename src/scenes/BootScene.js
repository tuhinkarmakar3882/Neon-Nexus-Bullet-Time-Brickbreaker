import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { generateTextures } from '../utils/Textures.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create() {
    generateTextures(this);
    this.scene.start(SCENES.PRELOAD);
  }
}
