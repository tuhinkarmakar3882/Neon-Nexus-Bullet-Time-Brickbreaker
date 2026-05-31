import { GAME } from '../config/Constants.js';
import {
  POWERS, categoryColor, powerFillColor, powerBadgeTextColor, powerPillLabel,
} from '../config/PowerUps.js';
import { PAL } from '../config/Palette.js';
import { iconTextureKey } from '../utils/IconTextures.js';
import { rand } from '../utils/Helpers.js';
import { fitTextWidth } from '../utils/Typography.js';

/** Falling seed capsule — Arkanoid-style letter on a color-coded pill. */
export class PowerUp {
  constructor(scene, x, y, key, opts = {}) {
    this.scene = scene;
    this.key = key;
    this.variant = opts.variant ?? 'normal';
    const def = POWERS[key];
    this.color = powerFillColor(key);
    this.catColor = categoryColor(def?.category);
    this.polarity = def?.polarity ?? 'pos';
    this.label = powerPillLabel(key);
    this.w = Math.max(82, GAME.WIDTH * 0.078);
    this.h = this.w * 0.38;
    this.x = x;
    this.y = y;
    this.dead = false;
    this.collecting = false;
    this.spawnTime = scene.time.now;
    this.fallSpeed = GAME.POWERUP_FALL_SPEED;
    this.tumble = rand(0, Math.PI * 2);
    this.tumbleRate = rand(2.2, 3.4) * (Math.random() < 0.5 ? -1 : 1);

    this.container = scene.add.container(this.cx, this.cy).setDepth(16);

    this.glow = scene.add.image(0, 0, 'soft')
      .setTint(this.color).setAlpha(0.38).setBlendMode('ADD')
      .setDisplaySize(this.w * 1.55, this.h * 2.8);
    this.container.add(this.glow);

    this.pill = scene.add.image(0, 0, 'pill')
      .setDisplaySize(this.w, this.h).setTint(this.color);
    this.container.add(this.pill);

    this.stripeGfx = scene.add.graphics();
    this.container.add(this.stripeGfx);
    this.drawCategoryStripe();

    if (this.polarity === 'neg') {
      this.stripesGfx = scene.add.graphics();
      this.drawNegStripes();
      this.container.add(this.stripesGfx);
    } else {
      this.stripesGfx = null;
    }

    const letterColor = powerBadgeTextColor(this.polarity);
    const fontSize = Math.max(9, Math.round(this.h * 0.28));
    this.letter = scene.add.text(0, 1, this.label, {
      fontFamily: 'Orbitron, monospace',
      fontSize: fontSize + 'px',
      fontStyle: '900',
      color: letterColor,
    }).setOrigin(0.5);
    fitTextWidth(this.letter, this.w * 0.72, 8);
    if (letterColor === '#ffffff') {
      this.letter.setStroke('#120818', 2);
    }
    this.container.add(this.letter);

    const iconKey = iconTextureKey(key);
    const showIcon = this.label.length <= 8;
    if (showIcon && scene.textures.exists(iconKey)) {
      this.icon = scene.add.image(-this.w * 0.28, 0, iconKey)
        .setDisplaySize(this.h * 0.34, this.h * 0.34)
        .setTint(0xffffff).setAlpha(0.85);
      this.container.add(this.icon);
    } else {
      this.icon = null;
    }

    if (this.variant === 'blessed') {
      this.pill.setTint(0xffd23d);
      this.glow.setTint(0xffe566).setAlpha(0.52);
      scene.tweens.add({
        targets: this.glow,
        alpha: { from: 0.4, to: 0.65 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    } else if (this.variant === 'mystery') {
      this.pill.setTint(0x3a3a55);
      this.glow.setTint(0x8888cc).setAlpha(0.35);
      this.letter.setText('?');
      this.letter.setColor('#c8c8ff');
      if (this.icon) this.icon.setAlpha(0.15);
    }

    if (this.polarity === 'neg') {
      scene.tweens.add({
        targets: this.glow,
        tint: { from: PAL.powerNeg, to: this.color },
        alpha: { from: 0.35, to: 0.58 },
        duration: 550,
        yoyo: true,
        repeat: -1,
      });
      scene.tweens.add({
        targets: this.container,
        angle: { from: -5, to: 5 },
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (this.polarity === 'wild') {
      scene.tweens.add({
        targets: this.pill,
        tint: { from: PAL.powerWild, to: this.color },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }

    this.container.setScale(0.18).setAlpha(0);
    scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.22, to: 0.48 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });
  }

  drawCategoryStripe() {
    const g = this.stripeGfx;
    if (!g) return;
    g.clear();
    const hw = this.w / 2;
    const hh = this.h / 2;
    g.fillStyle(this.catColor, 0.92);
    g.fillRoundedRect(-hw + 2, -hh + 3, 7, this.h - 6, 3);
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(-hw + 3, -hh + 4, 2, this.h - 8, 1);
  }

  drawNegStripes() {
    const g = this.stripesGfx;
    if (!g) return;
    g.clear();
    const hw = this.w / 2;
    const hh = this.h / 2;
    g.lineStyle(2, PAL.powerNeg, 0.5);
    for (let i = -2; i < 4; i++) {
      g.lineBetween(-hw + i * 14, -hh, -hw + i * 14 + this.w * 0.32, hh);
    }
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dtSec, timeScale, paddle, gravityMult = 1) {
    if (this.collecting) return;
    this.y += this.fallSpeed * dtSec * timeScale * gravityMult;
    if (this.polarity === 'neg') {
      this.x += Math.sin(this.tumble * 2.4) * 0.45;
    }
    this.tumble += dtSec * this.tumbleRate * timeScale;
    if (paddle.magnet) {
      const tx = paddle.x - this.w / 2;
      const ty = paddle.top - this.h * 0.4;
      const pull = Math.min(1, 6.5 * dtSec) * timeScale;
      this.x += (tx - this.x) * pull;
      this.y += (ty - this.y) * pull;
    }
  }

  overlapsPaddle(p) {
    const pad = 8;
    return this.x < p.right + pad && this.x + this.w > p.left - pad &&
      this.y + this.h > p.top - pad && this.y < p.y + p.h / 2 + pad;
  }

  /** Suck into paddle before applying the power. */
  beginCollect(paddle, onComplete) {
    if (this.collecting) return;
    this.collecting = true;
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.glow);
    this.scene.tweens.killTweensOf(this.pill);
    const tx = paddle.x;
    const ty = paddle.top - 4;
    this.scene.tweens.add({
      targets: this.container,
      x: tx,
      y: ty,
      scaleX: 1.28,
      scaleY: 1.28,
      alpha: 0,
      duration: 170,
      ease: 'Cubic.easeIn',
      onComplete: () => onComplete?.(),
    });
  }

  sync() {
    if (this.collecting) return;
    const wobble = this.polarity === 'neg' ? Math.sin(this.tumble * 3) * 4 : 0;
    this.container.setPosition(this.cx, this.cy + wobble);
    this.container.setAngle(Math.sin(this.tumble) * 11);
    const pulse = 0.96 + 0.04 * Math.abs(Math.cos(this.tumble * 1.1));
    this.container.setScale(pulse);
    this.glow.setAlpha(0.3 + 0.14 * Math.abs(Math.sin(this.tumble * 1.3)));
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.glow);
    this.scene.tweens.killTweensOf(this.pill);
    this.container?.destroy(true);
  }
}
