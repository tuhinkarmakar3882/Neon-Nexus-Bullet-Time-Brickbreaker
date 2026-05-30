import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { neonButton } from '../utils/UI.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PAUSE);
  }

  create() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.75);
    this.add.text(W / 2, H * 0.3, 'PAUSED', {
      fontFamily: 'Orbitron, monospace', fontSize: '80px', fontStyle: '900', color: '#00ffc3',
    }).setOrigin(0.5).setShadow(0, 0, '#00ffc3', 22, true, true);

    neonButton(this, W / 2, H * 0.5, 'RESUME', () => this.resume(), { width: 360, height: 88, fontSize: '36px' });
    neonButton(this, W / 2, H * 0.6, 'SETTINGS', () => {
      this.scene.launch(SCENES.SETTINGS, { from: SCENES.PAUSE });
      this.scene.sleep();
    }, { width: 360, height: 72, primary: false, fontSize: '28px' });
    neonButton(this, W / 2, H * 0.7, 'QUIT', () => {
      this.scene.stop(SCENES.HUD);
      this.scene.stop(SCENES.GAME);
      this.scene.stop();
      this.scene.start(SCENES.MENU);
    }, { width: 360, height: 72, primary: false, color: 0xff5a8a, fontSize: '28px' });

    this.input.keyboard.on('keydown-P', () => this.resume());
    this.input.keyboard.on('keydown-ESC', () => this.resume());

    // Wake handler (returning from settings)
    this.events.on('wake', () => {});
  }

  resume() {
    this.scene.resume(SCENES.GAME);
    this.scene.stop();
  }
}
