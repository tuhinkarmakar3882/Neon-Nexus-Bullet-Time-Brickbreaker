import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { generateTextures } from '../utils/Textures.js';
import { generateIconTextures, generateUiIcons } from '../utils/IconTextures.js';
import { ensureFontsLoaded } from '../utils/Typography.js';
import { setBootSplash } from '../shell/BootSplash.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  async create() {
    setBootSplash({ progress: 38, label: 'Forging bricks & Jardinains…' });
    generateTextures(this);
    generateIconTextures(this);
    generateUiIcons(this);
    setBootSplash({ progress: 48, label: 'Loading arena fonts…' });
    await ensureFontsLoaded();
    setBootSplash({ progress: 54, label: 'Tuning garden audio…' });
    this.scene.start(SCENES.PRELOAD);
  }
}
