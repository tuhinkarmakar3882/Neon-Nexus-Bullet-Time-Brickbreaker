import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { neonButton } from '../utils/UI.js';
import { Monetization } from '../systems/Monetization.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAMEOVER);
  }

  init(data) {
    this.data2 = data || {};
  }

  create() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    const d = this.data2;
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.85);

    this.add.text(W / 2, H * 0.22, 'GAME OVER', {
      fontFamily: 'Orbitron, monospace', fontSize: '84px', fontStyle: '900', color: '#ff3b5c',
    }).setOrigin(0.5).setShadow(0, 0, '#ff3b5c', 24, true, true);

    this.add.text(W / 2, H * 0.32, d.message || '', {
      fontFamily: 'Orbitron, monospace', fontSize: '26px', color: '#cfe9ff', align: 'center',
      wordWrap: { width: W * 0.8 },
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.42, `SCORE  ${d.score ?? 0}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '40px', fontStyle: 'bold', color: '#00ffc3',
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.48, `BEST  ${d.highScore ?? 0}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '28px', color: '#9fb4cc',
    }).setOrigin(0.5);

    const game = this.scene.get(SCENES.GAME);

    if ((d.continues ?? 0) > 0) {
      neonButton(this, W / 2, H * 0.6, `CONTINUE (${d.continues})`, () => {
        this.scene.stop();
        game.doContinue();
      }, { width: 420, height: 86, fontSize: '32px' });
    } else {
      // Offer a rewarded continue when out of free continues.
      neonButton(this, W / 2, H * 0.6, 'WATCH AD \u2192 CONTINUE', async () => {
        const granted = await Monetization.offerRewardedContinue();
        if (granted) {
          game.continues = 1;
          this.scene.stop();
          game.doContinue();
        }
      }, { width: 480, height: 86, fontSize: '28px', color: 0xffd23d });
    }

    neonButton(this, W / 2, H * 0.7, 'RESTART', () => {
      this.scene.stop();
      game.doRestart();
    }, { width: 360, height: 76, primary: false, fontSize: '30px' });

    neonButton(this, W / 2, H * 0.79, 'MENU', () => {
      this.scene.stop(SCENES.HUD);
      this.scene.stop(SCENES.GAME);
      this.scene.stop();
      this.scene.start(SCENES.MENU);
    }, { width: 360, height: 70, primary: false, color: 0x9fb4cc, fontSize: '26px' });
  }
}
