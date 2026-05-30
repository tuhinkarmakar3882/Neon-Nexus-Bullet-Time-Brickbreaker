import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';

export class HUDScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.HUD, active: false }); }

  create() {
    const W = GAME.WIDTH;
    const bus = this.game.events;
    const barH = Math.min(150, GAME.WALL_TOP - 16);

    const bar = this.add.graphics();
    bar.fillStyle(0x080b16, 0.55); bar.fillRoundedRect(10, 10, W - 20, barH, 16);
    bar.lineStyle(1, PAL.accent, 0.22); bar.strokeRoundedRect(10, 10, W - 20, barH, 16);

    const ls = (size, color) => ({ fontFamily: 'Orbitron, monospace', fontSize: size, color, fontStyle: 'bold' });

    this.scoreText = this.add.text(34, 26, '0', ls('40px', PAL.text));
    this.add.text(34, 18, 'SCORE', ls('15px', PAL.textMuted));
    this.comboText = this.add.text(34, 70, '', ls('22px', '#ffd23d'));

    this.levelText = this.add.text(W / 2, 30, 'LV 1', ls('30px', PAL.text)).setOrigin(0.5, 0);
    this.bricksText = this.add.text(W / 2, 66, 'BRICKS 0', ls('17px', PAL.textMuted)).setOrigin(0.5, 0);

    this.add.text(W - 150, 18, 'SHIPS', ls('15px', PAL.textMuted)).setOrigin(0, 0);
    this.livesC = this.add.container(0, 0);

    this.pauseBtn = this.add.container(W - 44, 30);
    const pb = this.add.graphics();
    pb.fillStyle(PAL.accent, 1); pb.fillRoundedRect(-24, -16, 48, 32, 8);
    pb.fillStyle(0x05060c, 1); pb.fillRect(-8, -8, 5, 16); pb.fillRect(3, -8, 5, 16);
    this.pauseBtn.add(pb);
    this.pauseBtn.setSize(60, 44).setInteractive(new Phaser.Geom.Rectangle(-30, -22, 60, 44), Phaser.Geom.Rectangle.Contains);
    this.pauseBtn.on('pointerup', () => bus.emit('req:pause'));

    this.chips = this.add.container(0, barH - 36);

    this.flashText = this.add.text(W / 2, GAME.HEIGHT * 0.4, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '64px', fontStyle: '900', color: PAL.text, align: 'center', wordWrap: { width: W * 0.9 },
    }).setOrigin(0.5).setAlpha(0);

    this.hintText = this.add.text(W / 2, GAME.HEIGHT - GAME.PADDLE_Y_OFFSET - 80, 'TAP / CLICK / SPACE TO LAUNCH', ls('24px', PAL.text)).setOrigin(0.5).setAlpha(0);

    this.onStats = (s) => {
      this.scoreText.setText(String(s.score));
      this.levelText.setText('LV ' + s.level);
      this.bricksText.setText('BRICKS ' + s.bricksLeft);
      this.comboText.setText(s.combo > 1 ? `COMBO x${s.combo}` : '');
      this.drawLives(s.lives);
    };
    this.onPowers = (list) => this.drawChips(list);
    this.onFlash = (f) => this.showFlash(f);
    this.onLife = () => this.tweens.add({ targets: this.livesC, scaleX: 1.25, scaleY: 1.25, yoyo: true, duration: 200 });
    this.onHint = (show) => this.hintText.setAlpha(show ? 0.85 : 0);

    bus.on('hud:stats', this.onStats);
    bus.on('hud:powers', this.onPowers);
    bus.on('hud:flash', this.onFlash);
    bus.on('hud:life', this.onLife);
    bus.on('hud:hint', this.onHint);
    this.events.once('shutdown', () => {
      bus.off('hud:stats', this.onStats); bus.off('hud:powers', this.onPowers);
      bus.off('hud:flash', this.onFlash); bus.off('hud:life', this.onLife); bus.off('hud:hint', this.onHint);
    });
  }

  drawLives(n) {
    this.livesC.removeAll(true);
    const W = GAME.WIDTH;
    const max = Math.min(n, 8);
    for (let i = 0; i < max; i++) {
      const img = this.add.image(W - 44 - i * 34, 56, 'vaus').setDisplaySize(28, 12).setTint(0x2fe6c7);
      this.livesC.add(img);
    }
    if (n > 8) this.livesC.add(this.add.text(W - 44 - 8 * 34, 48, '+' + (n - 8), { fontFamily: 'Orbitron', fontSize: '16px', color: '#8b9bb4' }).setOrigin(1, 0));
  }

  drawChips(list) {
    this.chips.removeAll(true);
    const chipW = 150, chipH = 30, gap = 8;
    const perRow = Math.max(1, Math.floor((GAME.WIDTH - 28) / (chipW + gap)));
    list.forEach((p, i) => {
      const row = Math.floor(i / perRow), col = i % perRow;
      const x = 18 + col * (chipW + gap), y = -row * (chipH + gap);
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0x05060c, 0.6); g.fillRoundedRect(0, 0, chipW, chipH, 7);
      g.lineStyle(2, p.color, 1); g.strokeRoundedRect(0, 0, chipW, chipH, 7);
      g.fillStyle(p.color, 1); g.fillCircle(16, chipH / 2, 9);
      g.fillStyle(p.color, 0.85); g.fillRoundedRect(2, chipH - 5, (chipW - 4) * p.ratio, 3, 2);
      const letter = this.add.text(16, chipH / 2 - 1, p.letter, { fontFamily: 'Orbitron', fontSize: '14px', fontStyle: '900', color: '#05060c' }).setOrigin(0.5);
      const name = this.add.text(32, chipH / 2 - 1, p.key.toUpperCase(), { fontFamily: 'Orbitron', fontSize: '14px', fontStyle: 'bold', color: '#' + p.color.toString(16).padStart(6, '0') }).setOrigin(0, 0.5);
      c.add([g, letter, name]);
      this.chips.add(c);
    });
  }

  showFlash(f) {
    if (!f || !f.text) { this.flashText.setAlpha(0); return; }
    this.tweens.killTweensOf(this.flashText);
    this.flashText.setText(f.text).setColor(f.color).setAlpha(1).setScale(0.8).setShadow(0, 0, f.color, 22, true, true);
    this.tweens.add({ targets: this.flashText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.flashText, alpha: 0, delay: f.ms, duration: 300 });
  }
}
