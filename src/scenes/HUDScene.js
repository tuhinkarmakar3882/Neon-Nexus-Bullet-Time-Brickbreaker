import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.HUD, active: false });
  }

  create() {
    const W = GAME.WIDTH;
    const bus = this.game.events;

    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.4);
    bar.fillRoundedRect(12, 12, W - 24, 78, 14);
    bar.lineStyle(1, 0x00ffc3, 0.25);
    bar.strokeRoundedRect(12, 12, W - 24, 78, 14);

    const ls = (size, color) => ({ fontFamily: 'Orbitron, monospace', fontSize: size, color, fontStyle: 'bold' });

    this.scoreText = this.add.text(34, 30, 'SCORE 0', ls('30px', '#00ffc3'));
    this.comboText = this.add.text(34, 62, '', ls('20px', '#ffd23d'));
    this.levelText = this.add.text(W / 2, 28, 'LV 1', ls('28px', '#cfe9ff')).setOrigin(0.5, 0);
    this.bricksText = this.add.text(W / 2, 58, 'BRICKS 0', ls('18px', '#9fb4cc')).setOrigin(0.5, 0);
    this.livesText = this.add.text(W - 96, 30, '\u2665 3', ls('30px', '#ff5a8a')).setOrigin(1, 0);

    this.pauseBtn = this.add.container(W - 46, 52);
    const pb = this.add.graphics();
    pb.fillStyle(0x00ffc3, 1); pb.fillRoundedRect(-26, -18, 52, 36, 9);
    pb.fillStyle(0x05060a, 1); pb.fillRect(-9, -9, 6, 18); pb.fillRect(3, -9, 6, 18);
    this.pauseBtn.add(pb);
    this.pauseBtn.setSize(64, 48);
    this.pauseBtn.setInteractive(new Phaser.Geom.Rectangle(-32, -24, 64, 48), Phaser.Geom.Rectangle.Contains);
    this.pauseBtn.on('pointerup', () => bus.emit('req:pause'));

    this.chips = this.add.container(0, 104);

    this.flashText = this.add.text(W / 2, GAME.HEIGHT * 0.4, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '60px', fontStyle: '900', color: '#00ffc3', align: 'center',
      wordWrap: { width: W * 0.9 },
    }).setOrigin(0.5).setAlpha(0);

    this.hintText = this.add.text(W / 2, GAME.HEIGHT - GAME.PADDLE_Y_OFFSET - 70, 'TAP / CLICK / SPACE TO LAUNCH', {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: '#cfe9ff',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.hintText, alpha: 0.35, yoyo: true, repeat: -1, duration: 650, paused: true });

    this.onStats = (s) => {
      this.scoreText.setText('SCORE ' + s.score);
      this.levelText.setText('LV ' + s.level);
      this.bricksText.setText('BRICKS ' + s.bricksLeft);
      this.livesText.setText('\u2665 ' + s.lives);
      this.comboText.setText(s.combo > 1 ? `COMBO x${s.combo}` : '');
    };
    this.onPowers = (list) => this.drawChips(list);
    this.onFlash = (f) => this.showFlash(f);
    this.onLife = () => this.tweens.add({ targets: this.livesText, scale: 1.5, yoyo: true, duration: 220 });
    this.onHint = (show) => this.hintText.setAlpha(show ? 0.9 : 0);

    bus.on('hud:stats', this.onStats);
    bus.on('hud:powers', this.onPowers);
    bus.on('hud:flash', this.onFlash);
    bus.on('hud:life', this.onLife);
    bus.on('hud:hint', this.onHint);

    this.events.once('shutdown', () => {
      bus.off('hud:stats', this.onStats);
      bus.off('hud:powers', this.onPowers);
      bus.off('hud:flash', this.onFlash);
      bus.off('hud:life', this.onLife);
      bus.off('hud:hint', this.onHint);
    });
  }

  drawChips(list) {
    this.chips.removeAll(true);
    const chipW = 138, chipH = 38, gap = 10;
    const perRow = Math.max(1, Math.floor((GAME.WIDTH - 24) / (chipW + gap)));
    list.forEach((p, i) => {
      const row = Math.floor(i / perRow), col = i % perRow;
      const x = 18 + col * (chipW + gap), y = row * (chipH + gap);
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(0, 0, chipW, chipH, 8);
      g.lineStyle(2, p.color, 1); g.strokeRoundedRect(0, 0, chipW, chipH, 8);
      g.fillStyle(p.color, 0.9); g.fillRoundedRect(2, chipH - 6, (chipW - 4) * p.ratio, 4, 2);
      const t = this.add.text(chipW / 2, chipH / 2 - 3, p.key, {
        fontFamily: 'Orbitron, monospace', fontSize: '16px', fontStyle: 'bold',
        color: '#' + p.color.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);
      c.add([g, t]);
      this.chips.add(c);
    });
  }

  showFlash(f) {
    if (!f || !f.text) { this.flashText.setAlpha(0); return; }
    this.tweens.killTweensOf(this.flashText);
    this.flashText.setText(f.text).setColor(f.color).setAlpha(1).setScale(0.8);
    this.flashText.setShadow(0, 0, f.color, 22, true, true);
    this.tweens.add({ targets: this.flashText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.flashText, alpha: 0, delay: f.ms, duration: 300 });
  }
}
