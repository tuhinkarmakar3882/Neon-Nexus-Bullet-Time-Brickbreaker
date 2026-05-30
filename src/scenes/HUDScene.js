import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.HUD, active: false });
  }

  create() {
    const W = GAME.WIDTH;
    const bus = this.game.events;

    // Top bar background
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.45);
    bar.fillRoundedRect(12, 12, W - 24, 92, 16);

    const labelStyle = (size, color) => ({
      fontFamily: 'Orbitron, monospace', fontSize: size, color, fontStyle: 'bold',
    });

    this.scoreText = this.add.text(36, 34, 'SCORE 0', labelStyle('30px', '#00ffc3'));
    this.levelText = this.add.text(W / 2, 34, 'LV 1', labelStyle('30px', '#cfe9ff')).setOrigin(0.5, 0);
    this.bricksText = this.add.text(W / 2, 68, 'BRICKS 0', labelStyle('20px', '#9fb4cc')).setOrigin(0.5, 0);
    this.livesText = this.add.text(W - 92, 34, '\u2665 3', labelStyle('30px', '#ff5a8a')).setOrigin(1, 0);

    // Pause button (top-right of the bar)
    this.pauseBtn = this.add.container(W - 44, 58);
    const pb = this.add.graphics();
    pb.fillStyle(0x00ffc3, 1); pb.fillRoundedRect(-24, -16, 48, 32, 8);
    pb.fillStyle(0x05060a, 1); pb.fillRect(-8, -8, 5, 16); pb.fillRect(3, -8, 5, 16);
    this.pauseBtn.add(pb);
    this.pauseBtn.setSize(60, 44);
    this.pauseBtn.setInteractive(new Phaser.Geom.Rectangle(-30, -22, 60, 44), Phaser.Geom.Rectangle.Contains);
    this.pauseBtn.on('pointerup', () => bus.emit('req:pause'));

    // Active power chips
    this.chips = this.add.container(0, 118);

    // Flash text
    this.flashText = this.add.text(W / 2, GAME.HEIGHT * 0.42, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '64px', fontStyle: '900', color: '#00ffc3', align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // listeners
    this.onStats = (s) => {
      this.scoreText.setText('SCORE ' + s.score);
      this.levelText.setText('LV ' + s.level);
      this.bricksText.setText('BRICKS ' + s.bricksLeft);
      this.livesText.setText('\u2665 ' + s.lives);
    };
    this.onPowers = (list) => this.drawChips(list);
    this.onFlash = (f) => this.showFlash(f);
    this.onLife = () => {
      this.tweens.add({ targets: this.livesText, scale: 1.5, yoyo: true, duration: 220 });
    };

    bus.on('hud:stats', this.onStats);
    bus.on('hud:powers', this.onPowers);
    bus.on('hud:flash', this.onFlash);
    bus.on('hud:life', this.onLife);

    this.events.once('shutdown', () => {
      bus.off('hud:stats', this.onStats);
      bus.off('hud:powers', this.onPowers);
      bus.off('hud:flash', this.onFlash);
      bus.off('hud:life', this.onLife);
    });
  }

  drawChips(list) {
    this.chips.removeAll(true);
    const chipW = 132, chipH = 40, gap = 10;
    const perRow = Math.max(1, Math.floor((GAME.WIDTH - 24) / (chipW + gap)));
    list.forEach((p, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = 24 + col * (chipW + gap);
      const y = row * (chipH + gap);
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(0, 0, chipW, chipH, 8);
      g.lineStyle(2, p.color, 1); g.strokeRoundedRect(0, 0, chipW, chipH, 8);
      g.fillStyle(p.color, 0.85); g.fillRoundedRect(2, chipH - 7, (chipW - 4) * p.ratio, 5, 2);
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
