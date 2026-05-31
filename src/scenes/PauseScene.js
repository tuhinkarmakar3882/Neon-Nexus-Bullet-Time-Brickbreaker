import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { anchorButtonStack, makeResponsiveOverlayPanel, overlayFrame } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PAUSE);
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.PAUSE);
    this.input.setTopOnly(true);
    const panel = makeResponsiveOverlayPanel(this, { dimAlpha: 0.82 });
    const frame = overlayFrame(panel);
    const stackMinTop = frame.titleY + uiPx(48, { min: 40, max: 52 });
    const { stackTop } = anchorButtonStack(this, panel, [
      { label: 'RESUME', onClick: () => this.resume(), fontSize: '18px', color: PAL.accent },
      {
        label: 'CODEX', primary: false, fontSize: '16px',
        onClick: () => {
          this.scene.launch(SCENES.CODEX, { from: SCENES.PAUSE });
          this.scene.sleep();
        },
      },
      {
        label: 'SETTINGS', primary: false, fontSize: '16px',
        onClick: () => {
          this.scene.launch(SCENES.SETTINGS, { from: SCENES.PAUSE });
          this.scene.sleep();
        },
      },
      {
        label: 'QUIT TO MENU', primary: false, color: PAL.danger, fontSize: '16px',
        onClick: () => {
          InputRouter.onOverlayClose(false);
          this.scene.stop(SCENES.HUD);
          this.scene.stop(SCENES.GAME);
          this.scene.stop();
          this.scene.start(SCENES.MENU);
        },
      },
    ], { minTop: stackMinTop });

    const title = this.add.text(frame.cx, frame.titleY, 'PAUSED', {
      ...orbitronStyle(48, cssHex(PAL.accent), { fontStyle: '900', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent), 22, true, true);
    fitTextWidth(title, frame.wrap, uiPx(28, { min: 24, max: 36 }));

    this.add.text(frame.cx, Math.min(frame.titleY + uiPx(56, { min: 48, max: 60 }), stackTop - uiPx(36, { min: 28, max: 40 })), 'Take a breath — the garden waits.', {
      ...orbitronStyle(14, PAL.textMuted, { align: 'center', wordWrap: { width: frame.wrap } }),
    }).setOrigin(0.5, 0).setDepth(1001);

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
