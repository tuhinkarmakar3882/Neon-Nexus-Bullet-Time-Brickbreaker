import Phaser from 'phaser';
import { GAME, BRICK } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { brickPanelInsets } from '../utils/Textures.js';
import { lerpColor, clamp } from '../utils/Helpers.js';
import { difficultyFor } from '../systems/DifficultyScaler.js';
import { popScale } from '../utils/MicroFx.js';
import { displayStyle } from '../utils/Typography.js';

const BOSS_COLORS = [0xffb080, 0xff7040, 0xff4020];
const STEEL_TYPES = new Set(['gold', 'steel']);
const INDESTRUCTIBLE_PANEL = {
  gold: 'panel-gold',
  steel: 'panel-steel',
  hostage: 'panel-hostage',
};

export class Brick {
  constructor(scene, x, y, w, h, type, color, level, opts = {}) {
    this.scene = scene;
    this.baseX = x;
    this.x = x; this.y = y; this.w = w; this.h = h;
    if (type === 'steel') type = 'steel';
    this.type = type;
    this.color = color;
    this.level = level;
    this.alive = true;
    this.indestructible = STEEL_TYPES.has(type);
    this.frozen = false;
    this.frostMarked = false;
    this.burning = false;
    this.isBonus = false;
    this.moving = (opts.moving ?? false) || type === 'shifting';
    this.portalLink = null;
    this.portalId = opts.portalId ?? null;
    this.linkedPartner = null;
    this.hostageCleared = false;
    this.vineUntil = 0;
    this.movePhase = opts.movePhase ?? 0;
    this.moveSpeed = opts.moveSpeed ?? 1;
    this.moveAmp = opts.moveAmp ?? 0;
    this.t = 0;
    this._lastCx = x + w / 2;
    this._vxSmoothed = 0;
    this.sizePulse = type === 'shifting'
      || Math.abs(h - BRICK.HEIGHT) > BRICK.HEIGHT * 0.06;
    this.revealed = type !== 'invisible';

    let hp = BRICK.HP[type] ?? 1;
    if (type === 'silver') hp = Math.min(5, 2 + Math.floor(level / 4));
    if (type === 'reinforced') hp = clamp(2 + Math.floor(level / 8), 2, 4);
    const diff = difficultyFor(level);
    const paceMult = opts.hpPaceMult ?? diff.brickHpPaceMult ?? 1;
    hp = Math.max(1, Math.round(hp * diff.brickHpMult * paceMult));
    this.maxHp = hp;
    this.hp = hp;

    if (type === 'hostage') {
      this.indestructible = true;
      this.hostageCleared = false;
    }
    if (type === 'moss') this.maxHp = this.hp = Math.max(2, hp);

    const panelKey = INDESTRUCTIBLE_PANEL[type] ?? 'panel';
    const useTint = !INDESTRUCTIBLE_PANEL[type];
    const slice = brickPanelInsets(w, h);
    const bleed = 0;
    this.panel = scene.add.nineslice(
      this.cx, this.cy, panelKey, undefined, w, h,
      slice.left, slice.right, slice.top, slice.bottom,
    )
      .setDepth(10)
      .setAlpha(0.98);
    if (useTint && typeof this.panel.setTintFill === 'function') {
      this.panel.setTintFill(color);
    } else {
      this.panel.setTint(useTint ? color : 0xffffff);
    }
    if (type === 'gold' || type === 'steel') {
      this.panel.setBlendMode(Phaser.BlendModes.NORMAL);
    }
    if (!this.revealed) this.panel.setAlpha(0);
    this.fx = scene.add.graphics().setDepth(11);
    this.badge = (type === 'gold' || type === 'steel' || type === 'hostage')
      ? scene.add.text(this.cx, this.cy, type === 'gold' ? '✦' : type === 'steel' ? '⛨' : '⚠', {
        ...displayStyle(Math.min(w, h) * 0.38, type === 'steel' ? '#d8e4f0' : type === 'gold' ? '#fff8d0' : '#ff9988', { fontStyle: '700' }),
      }).setOrigin(0.5).setDepth(12).setAlpha(this.revealed ? 0.92 : 0)
      : null;
    this.crackImg = null;
    this.drawFx();
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  reveal() {
    if (this.revealed) return;
    this.revealed = true;
    this.panel.setAlpha(1);
    this.badge?.setAlpha(0.92);
    popScale(this.scene, this.panel, { peak: 1.1, dur: 130, from: 0.65 });
    this.scene.tweens.add({ targets: this.panel, alpha: { from: 0.15, to: 1 }, duration: 180 });
    this.drawFx();
  }

  crackStage() {
    if (this.indestructible || this.maxHp <= 1) return 0;
    const dmg = this.maxHp - this.hp;
    return Math.min(3, Math.ceil((dmg / this.maxHp) * 3));
  }

  drawFx() {
    const g = this.fx;
    g.clear();
    g.x = this.x; g.y = this.y;
    const w = this.w, h = this.h;

    if (this.crackImg) { this.crackImg.destroy(); this.crackImg = null; }
    const stage = this.crackStage();
    if (stage > 0 && this.scene.textures.exists(`crack-${stage}`)) {
      this.crackImg = this.scene.add.image(this.cx, this.cy, `crack-${stage}`)
        .setDepth(12).setDisplaySize(w, h).setAlpha(this.revealed ? 0.85 : 0);
    }

    if (this.type === 'reinforced' && this.maxHp > 1) {
      const ratio = this.hp / this.maxHp;
      this.panel.setTint(lerpColor(this.color, 0x888899, 1 - ratio));
    }

    if (this.type === 'boss') {
      const idx = Math.min(BOSS_COLORS.length - 1, this.maxHp - this.hp);
      this.panel.setTint(BOSS_COLORS[idx] ?? this.color);
    }

    if (this.type === 'gold') {
      g.lineStyle(1.5, 0xffffff, 0.55);
      g.strokeRoundedRect(4, 4, w - 8, h - 8, 5);
    } else if (this.type === 'steel') {
      g.lineStyle(1, 0xa8d8ff, 0.45);
      g.strokeRoundedRect(4, 4, w - 8, h - 8, 4);
    } else if (this.type === 'hostage') {
      g.lineStyle(1.5, 0xff5a6e, 0.65);
      g.strokeRoundedRect(4, 4, w - 8, h - 8, 5);
    } else if (this.type === 'silver' || this.type === 'boss' || this.type === 'reinforced') {
      g.fillStyle(0xffffff, 0.9);
      for (let i = 0; i < this.hp; i++) g.fillCircle(10 + i * 10, h - 7, 2.5);
    } else if (this.type === 'explosive') {
      g.fillStyle(0xff7040, 0.85);
      g.fillCircle(w / 2, h / 2, h * 0.12);
      g.lineStyle(2, 0xfff0c0, 0.75);
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        g.lineBetween(w / 2, h / 2, w / 2 + Math.cos(ang) * h * 0.28, h / 2 + Math.sin(ang) * h * 0.28);
      }
    } else if (this.type === 'nest') {
      g.lineStyle(2, 0xa78bfa, 0.75);
      g.strokeEllipse(w / 2, h - 8, w * 0.34, h * 0.24);
    } else if (this.type === 'mirror') {
      g.lineStyle(2, 0xc8c8ff, 0.85);
      g.strokeTriangle(w * 0.22, h * 0.22, w * 0.78, h * 0.5, w * 0.22, h * 0.78);
    } else if (this.type === 'moss') {
      g.fillStyle(0x56d364, 0.35);
      g.fillRoundedRect(4, h * 0.48, w - 8, h * 0.38, 4);
    } else if (this.type === 'beehive') {
      g.fillStyle(0xffb347, 0.9);
      g.fillCircle(w / 2, h / 2, h * 0.18);
    } else if (this.type === 'seedpod') {
      g.fillStyle(0x56d364, 0.65);
      g.fillEllipse(w / 2, h / 2, w * 0.32, h * 0.4);
    } else if (this.type === 'linked') {
      g.lineStyle(2, 0xa78bfa, 0.85);
      g.strokeCircle(w / 2, h / 2, h * 0.26);
    } else if (this.type === 'portal') {
      g.lineStyle(2, 0x2fe6c7, 0.9);
      g.strokeCircle(w / 2, h / 2, h * 0.34);
      g.fillStyle(0x2fe6c7, 0.22);
      g.fillCircle(w / 2, h / 2, h * 0.22);
    }

    if (this.isBonus) {
      g.lineStyle(2, PAL.accent3, 0.95);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 6);
    }

    if (this.frostMarked || this.frozen) {
      g.fillStyle(0x9ee7ff, this.frostMarked ? 0.32 : 0.22);
      g.fillRoundedRect(2, 2, w - 4, h - 4, 6);
      g.lineStyle(this.frostMarked ? 2 : 1, 0x7dd3fc, this.frostMarked ? 0.95 : 0.7);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 6);
      if (this.frostMarked) {
        g.lineStyle(1, 0xffffff, 0.35);
        g.lineBetween(6, 6, w - 6, h - 6);
        g.lineBetween(w - 6, 6, 6, h - 6);
      }
    }
    if (this.burning) {
      g.fillStyle(0xff6622, 0.35);
      g.fillRoundedRect(2, 2, w - 4, h - 4, 6);
      g.lineStyle(2, 0xffaa44, 0.85);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 6);
    }

  }

  update(dtSec) {
    this.t += dtSec * (this.sizePulse ? this.moveSpeed * 0.85 : this.moveSpeed);
    if (this.moving && this.alive && !this.frozen) {
      const prevCx = this.cx;
      this.x = this.baseX + Math.sin(this.t + this.movePhase) * this.moveAmp;
      const vx = (this.cx - prevCx) / Math.max(dtSec, 0.001);
      this._vxSmoothed += (vx - this._vxSmoothed) * Math.min(1, dtSec * 14);
      this._lastCx = this.cx;
    }
  }

  hit(damage = 1) {
    if (!this.revealed) this.reveal();
    if (this.indestructible && this.type === 'hostage' && !this.hostageCleared) { this.clang(); return false; }
    if (this.indestructible) { this.clang(); return false; }
    if (this.vineUntil > this.scene.time?.now) { this.clang(); return false; }
    if (this.frozen && !this.frostMarked) damage = Math.max(damage, this.hp);
    this.hp -= damage;
    this.flash();
    if (this.hp > 0 && (this.type === 'silver' || this.type === 'boss' || this.type === 'reinforced')) {
      this.drawFx();
    }
    if (this.hp <= 0) { this.alive = false; return true; }
    return false;
  }

  flash() {
    this.scene.tweens.killTweensOf(this.panel);
    const flashTint = (this.type === 'gold' || this.type === 'steel' || this.type === 'hostage')
      ? 0xffffff
      : lerpColor(this.color, 0xffffff, 0.7);
    if (typeof this.panel.setTintFill === 'function' && !INDESTRUCTIBLE_PANEL[this.type]) {
      this.panel.setTintFill(flashTint);
    } else {
      this.panel.setTint(flashTint);
    }
    this.scene.time.delayedCall(60, () => {
      if (!this.panel.active) return;
      if (typeof this.panel.setTintFill === 'function' && !INDESTRUCTIBLE_PANEL[this.type]) {
        this.panel.setTintFill(this.color);
      } else {
        this.panel.setTint(INDESTRUCTIBLE_PANEL[this.type] ? 0xffffff : this.color);
      }
    });
    this.scene.tweens.add({ targets: this.panel, scaleX: 1.1, scaleY: 1.14, duration: 70, yoyo: true });
    if (this.crackImg) this.scene.tweens.add({ targets: this.crackImg, alpha: { from: 0.4, to: 0.95 }, duration: 90, yoyo: true });
  }

  clang() {
    this.scene.tweens.add({ targets: this.panel, scaleX: 0.94, scaleY: 0.94, duration: 60, yoyo: true });
    if (this.badge) {
      this.scene.tweens.add({ targets: this.badge, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true });
    }
  }

  clearHostage() {
    if (this.type !== 'hostage') return;
    this.hostageCleared = true;
    this.indestructible = false;
    this.drawFx();
  }

  sync() {
    let pulse = 1;
    if (this.sizePulse && this.alive) {
      pulse = 1 + 0.04 * Math.sin(this.t * 2.1 + this.movePhase);
    }
    this.panel.setPosition(this.cx, this.cy);
    if (pulse !== 1) {
      this.panel.setSize(this.w * pulse, this.h * pulse);
    } else if (this.panel.width !== this.w || this.panel.height !== this.h) {
      this.panel.setSize(this.w, this.h);
    }
    if (this.moving && this.alive && !this.frozen) {
      const tilt = clamp(this._vxSmoothed * 0.08, -3, 3);
      this.panel.setAngle(tilt);
    } else {
      this.panel.setAngle(0);
    }
    this.badge?.setPosition(this.cx, this.cy);
    if (this.badge && pulse !== 1) this.badge.setScale(pulse);
    this.fx.x = this.x; this.fx.y = this.y;
    if (this.crackImg) {
      this.crackImg.setPosition(this.cx, this.cy);
      if (pulse !== 1) this.crackImg.setDisplaySize(this.w * pulse, this.h * pulse);
    }
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.panel);
    this.crackImg?.destroy();
    this.badge?.destroy();
    this.panel.destroy();
    this.fx.destroy();
  }
}
