import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { generateTextures } from '../utils/Textures.js';
import { generateIconTextures } from '../utils/IconTextures.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create() {
    generateTextures(this);
    generateIconTextures(this);
    this.scene.start(SCENES.PRELOAD);
  }
}
