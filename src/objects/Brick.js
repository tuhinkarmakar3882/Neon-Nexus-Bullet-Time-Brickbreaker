import Phaser from 'phaser';
import { GAME, BRICK } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { PANEL_SLICE } from '../utils/Textures.js';
import { lerpColor, clamp } from '../utils/Helpers.js';
import { difficultyFor } from '../systems/DifficultyScaler.js';
import { popScale } from '../utils/MicroFx.js';

const BOSS_COLORS = [0xffc8a0, 0xff9058, 0xff5030];
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
    this.revealed = type !== 'invisible';

    let hp = BRICK.HP[type] ?? 1;
    if (type === 'silver') hp = Math.min(5, 2 + Math.floor(level / 4));
    if (type === 'reinforced') hp = clamp(2 + Math.floor(level / 8), 2, 4);
    const diff = difficultyFor(level);
    hp = Math.max(1, Math.round(hp * diff.brickHpMult));
    this.maxHp = hp;
    this.hp = hp;

    if (type === 'hostage') {
      this.indestructible = true;
      this.hostageCleared = false;
    }
    if (type === 'moss') this.maxHp = this.hp = Math.max(2, hp);

    const panelKey = INDESTRUCTIBLE_PANEL[type] ?? 'panel';
    const useTint = !INDESTRUCTIBLE_PANEL[type];
    this.panel = scene.add.nineslice(this.cx, this.cy, panelKey, undefined, w, h, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setDepth(10).setTint(useTint ? color : 0xffffff).setAlpha(0.98);
    if (type === 'gold' || type === 'steel') {
      this.panel.setBlendMode(Phaser.BlendModes.NORMAL);
    }
    if (!this.revealed) this.panel.setAlpha(0);
    this.fx = scene.add.graphics().setDepth(11);
    this.badge = (type === 'gold' || type === 'steel' || type === 'hostage')
      ? scene.add.text(this.cx, this.cy, type === 'gold' ? '✦' : type === 'steel' ? '⛨' : '⚠', {
        fontFamily: 'Orbitron, monospace',
        fontSize: `${Math.round(Math.min(w, h) * 0.38)}px`,
        fontStyle: '900',
        color: type === 'steel' ? '#d8e4f0' : type === 'gold' ? '#fff8d0' : '#ff9988',
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
      g.lineStyle(2.5, 0xfff0a0, 0.95);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 6);
      g.lineStyle(1, 0xffffff, 0.45);
      g.strokeRoundedRect(6, 6, w - 12, h - 12, 4);
      g.fillStyle(0xffe066, 0.35);
      g.fillTriangle(w / 2, h * 0.18, w * 0.72, h * 0.5, w / 2, h * 0.82);
      g.fillTriangle(w / 2, h * 0.18, w * 0.28, h * 0.5, w / 2, h * 0.82);
    } else if (this.type === 'steel') {
      g.lineStyle(2, 0xc8d8e8, 0.9);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 4);
      g.fillStyle(0x404850, 0.85);
      [[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8]].forEach(([rx, ry]) => g.fillCircle(rx, ry, 3));
      g.lineStyle(1.5, 0x8898a8, 0.7);
      g.lineBetween(8, h / 2, w - 8, h / 2);
      g.lineBetween(w / 2, 8, w / 2, h - 8);
    } else if (this.type === 'hostage') {
      g.lineStyle(2, 0xff6644, 0.95);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 5);
      g.fillStyle(0xff4422, 0.3);
      g.fillRoundedRect(w * 0.2, h * 0.15, w * 0.6, h * 0.7, 4);
      g.lineStyle(1.5, 0xffaa88, 0.8);
      for (let bx = w * 0.28; bx < w * 0.72; bx += w * 0.12) {
        g.lineBetween(bx, h * 0.15, bx, h * 0.85);
      }
    } else if (this.type === 'silver' || this.type === 'boss' || this.type === 'reinforced') {
      g.fillStyle(0xfff8ef, 0.85);
      for (let i = 0; i < this.hp; i++) g.fillCircle(10 + i * 10, h - 7, 2.5);
      g.lineStyle(1, 0xffffff, 0.35);
      g.strokeRoundedRect(4, 4, w - 8, h - 8, 4);
    } else if (this.type === 'explosive') {
      g.fillStyle(0x3a1808, 0.75);
      g.fillCircle(w / 2, h / 2, h * 0.24);
      g.fillStyle(0xffd23d, 1);
      g.fillCircle(w / 2, h / 2, h * 0.1);
      g.lineStyle(2, 0xfff0c0, 0.85);
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        g.lineBetween(w / 2, h / 2, w / 2 + Math.cos(ang) * h * 0.32, h / 2 + Math.sin(ang) * h * 0.32);
      }
    } else if (this.type === 'nest') {
      g.fillStyle(0x2a2038, 0.75);
      g.fillEllipse(w / 2, h - 8, w * 0.38, h * 0.28);
      g.lineStyle(2, 0x8b7fd4, 0.7);
      g.strokeEllipse(w / 2, h - 8, w * 0.38, h * 0.28);
    } else if (this.type === 'hostage') {
      // badge + cage drawn above
    } else if (this.type === 'mirror') {
      g.lineStyle(2, 0xaaaaff, 0.85);
      g.strokeTriangle(w * 0.2, h * 0.2, w * 0.8, h * 0.5, w * 0.2, h * 0.8);
    } else if (this.type === 'moss') {
      g.fillStyle(0x3a6640, 0.55);
      g.fillRoundedRect(4, h * 0.45, w - 8, h * 0.4, 4);
    } else if (this.type === 'beehive') {
      g.fillStyle(0xffcc44, 0.85);
      g.fillCircle(w / 2, h / 2, h * 0.22);
    } else if (this.type === 'seedpod') {
      g.fillStyle(0x66aa44, 0.7);
      g.fillEllipse(w / 2, h / 2, w * 0.35, h * 0.45);
    } else if (this.type === 'linked') {
      g.lineStyle(2, 0xaa88ff, 0.9);
      g.strokeCircle(w / 2, h / 2, h * 0.28);
      g.lineBetween(w * 0.25, h / 2, w * 0.75, h / 2);
    } else if (this.type === 'portal') {
      g.lineStyle(2.5, 0x72f2eb, 0.9);
      g.strokeCircle(w / 2, h / 2, h * 0.36);
      g.fillStyle(0x72f2eb, 0.2);
      g.fillCircle(w / 2, h / 2, h * 0.26);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(w / 2, h / 2, h * 0.08);
    } else if (this.type === 'invisible' && !this.revealed) {
      g.lineStyle(1, 0xffffff, 0.12);
      g.strokeRoundedRect(3, 3, w - 6, h - 6, 6);
      g.fillStyle(0xffffff, 0.04);
      g.fillRoundedRect(3, 3, w - 6, h - 6, 6);
    }

    if (this.isBonus) {
      g.lineStyle(2, 0xe8b86d, 0.95);
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
    if (!this.moving || !this.alive || this.frozen) return;
    this.t += dtSec * this.moveSpeed;
    this.x = this.baseX + Math.sin(this.t + this.movePhase) * this.moveAmp;
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
    this.panel.setTint(flashTint);
    this.scene.time.delayedCall(60, () => {
      if (!this.panel.active) return;
      this.panel.setTint(INDESTRUCTIBLE_PANEL[this.type] ? 0xffffff : this.color);
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
    this.panel.setPosition(this.cx, this.cy);
    this.badge?.setPosition(this.cx, this.cy);
    this.fx.x = this.x; this.fx.y = this.y;
    if (this.crackImg) this.crackImg.setPosition(this.cx, this.cy);
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.panel);
    this.crackImg?.destroy();
    this.badge?.destroy();
    this.panel.destroy();
    this.fx.destroy();
  }
}
