import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';

/** Lightweight pass-through — assets are generated procedurally in BootScene. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  create() {
    this.scene.start(SCENES.MENU);
  }
}
