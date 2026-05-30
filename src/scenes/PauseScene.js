import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { layoutButtonStack, makeOverlayPanel } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PAUSE);
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.PAUSE);
    this.input.setTopOnly(true);
    const panel = makeOverlayPanel(this);

    this.add.text(panel.cx, panel.cy - panel.cardH / 2 + 72, 'PAUSED', {
      fontFamily: 'Orbitron, monospace', fontSize: '72px', fontStyle: '900', color: cssHex(PAL.accent),
    }).setOrigin(0.5).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent), 22, true, true);

    layoutButtonStack(this, panel, [
      { label: 'RESUME', onClick: () => this.resume(), height: 88, fontSize: '36px' },
      {
        label: 'CODEX', height: 68, primary: false, fontSize: '26px',
        onClick: () => {
          this.scene.launch(SCENES.CODEX, { from: SCENES.PAUSE });
          this.scene.sleep();
        },
      },
      {
        label: 'SETTINGS', height: 72, primary: false, fontSize: '28px',
        onClick: () => {
          this.scene.launch(SCENES.SETTINGS, { from: SCENES.PAUSE });
          this.scene.sleep();
        },
      },
      {
        label: 'QUIT', height: 72, primary: false, color: PAL.danger, fontSize: '28px',
        onClick: () => {
          InputRouter.onOverlayClose(false);
          this.scene.stop(SCENES.HUD);
          this.scene.stop(SCENES.GAME);
          this.scene.stop();
          this.scene.start(SCENES.MENU);
        },
      },
    ], { width: 360, gap: 14, offsetY: 32 });

    this.input.keyboard.on('keydown-P', () => this.resume());
    this.input.keyboard.on('keydown-ESC', () => this.resume());
    this.events.on('wake', () => {});
  }

  resume() {
    InputRouter.onOverlayClose();
    this.scene.resume(SCENES.GAME);
    this.scene.stop();
  }
}
