import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { generateTextures } from '../utils/Textures.js';
import { generateIconTextures, generateUiIcons } from '../utils/IconTextures.js';
import { ensureFontsLoaded } from '../utils/Typography.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  async create() {
    generateTextures(this);
    generateIconTextures(this);
    generateUiIcons(this);
    await ensureFontsLoaded();
    this.scene.start(SCENES.PRELOAD);
  }
}
