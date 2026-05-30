import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { HOW_TO_PLAY } from '../config/HowToPlay.js';
import { PAL, cssHex } from '../config/Palette.js';
import {
  POWERS, POWER_KEYS, CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_ORDER,
  categoryColor, powerDisplayName,
} from '../config/PowerUps.js';
import { iconTextureKey } from '../utils/IconTextures.js';
import { makeButton, makeOverlayPanel } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { clamp } from '../utils/Helpers.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { GNOME_TIERS } from '../config/GnomeTiers.js';

const DEPTH = 1001;

export class CodexScene extends Phaser.Scene {
  constructor() {
    super(SCENES.CODEX);
  }

  init(data) {
    this.from = data?.from ?? SCENES.PAUSE;
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.CODEX);
    this.input.setTopOnly(true);
    this.tab = 'guide';
    this.scrollY = 0;
    this.maxScroll = 0;

    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const panel = makeOverlayPanel(this, { dimAlpha: 0.86, cardW: Math.min(W * 0.92, 820), cardH: H * 0.9 });
    this.panel = panel;

    this.drawTwilightCard(panel);

    const titleY = panel.cy - panel.cardH / 2 + 44;
    this.add.text(panel.cx, titleY, HOW_TO_PLAY.title, {
      fontFamily: 'Syne, Orbitron, monospace',
      fontSize: clamp(Math.round(W * 0.034), 28, 38) + 'px',
      fontStyle: '800',
      color: cssHex(PAL.accent),
    }).setOrigin(0.5).setDepth(DEPTH).setShadow(0, 0, cssHex(PAL.accent), 12, true, true);

    this.add.text(panel.cx, titleY + 32, HOW_TO_PLAY.subtitle, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color: cssHex(PAL.accent2),
      letterSpacing: '0.18em',
    }).setOrigin(0.5).setDepth(DEPTH);

    const tabY = titleY + 62;
    this.tabGuideBtn = this.makeTab(panel.cx - 210, tabY, 'GUIDE', () => this.setTab('guide'));
    this.tabPowerBtn = this.makeTab(panel.cx - 70, tabY, 'POWERS', () => this.setTab('powers'));
    this.tabBestBtn = this.makeTab(panel.cx + 70, tabY, 'GNOMES', () => this.setTab('bestiary'));
    this.tabJournalBtn = this.makeTab(panel.cx + 210, tabY, 'JOURNAL', () => this.setTab('journal'));

    const contentTop = tabY + 38;
    const contentBottom = panel.cy + panel.cardH / 2 - 78;
    this.contentTop = contentTop;
    this.contentH = contentBottom - contentTop;
    this.contentLeft = panel.cx - panel.cardW / 2 + 20;
    this.contentWidth = panel.cardW - 40;

    this.guideLayer = this.add.container(panel.cx, contentTop).setDepth(DEPTH);
    this.powerLayer = this.add.container(panel.cx, contentTop).setDepth(DEPTH).setVisible(false);
    this.bestiaryLayer = this.add.container(panel.cx, contentTop).setDepth(DEPTH).setVisible(false);
    this.journalLayer = this.add.container(panel.cx, contentTop).setDepth(DEPTH).setVisible(false);
    this.buildGuideTab();
    this.buildPowerTab();
    this.buildBestiaryTab();
    this.buildJournalTab();

    const maskGfx = this.make.graphics().setDepth(DEPTH);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(this.contentLeft, contentTop, this.contentWidth, this.contentH);
    const mask = maskGfx.createGeometryMask();
    this.guideLayer.setMask(mask);
    this.powerLayer.setMask(mask);
    this.bestiaryLayer.setMask(mask);
    this.journalLayer.setMask(mask);

    this.scrollHit = this.add.rectangle(
      panel.cx, contentTop + this.contentH / 2,
      this.contentWidth, this.contentH, 0x000000, 0,
    ).setDepth(DEPTH + 5).setInteractive({ draggable: true });
    this.scrollHit.on('wheel', (_p, _dx, _dy, dz) => {
      this.scrollBy(dz * 0.35);
    });
    this.scrollHit.on('drag', (_p, _dx, dragY) => {
      if (this._dragStartY == null) {
        this._dragStartY = dragY;
        this._scrollStart = this.scrollY;
      }
      this.scrollY = clamp(this._scrollStart + (dragY - this._dragStartY), 0, this.maxScroll);
      this.activeLayer().y = this.contentTop - this.scrollY;
    });
    this.scrollHit.on('dragstart', () => {
      this._dragStartY = null;
    });
    this.scrollHit.on('dragend', () => {
      this._dragStartY = null;
    });

    makeButton(this, panel.cx, panel.cy + panel.cardH / 2 - 44, 'BACK', () => this.close(), {
      width: 240, height: 52, primary: false, fontSize: '20px', color: PAL.accent, depth: DEPTH + 10,
    });

    this.setTab('guide');
  }

  drawTwilightCard(panel) {
    const g = this.add.graphics().setDepth(DEPTH - 1);
    const { cx, cy, cardW, cardH } = panel;
    g.fillStyle(0x120818, 0.94);
    g.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 18);
    g.lineStyle(2, PAL.accent, 0.45);
    g.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 18);
    g.lineStyle(1, PAL.accent2, 0.18);
    g.strokeRoundedRect(cx - cardW / 2 + 6, cy - cardH / 2 + 6, cardW - 12, cardH - 12, 14);
  }

  makeTab(x, y, label, onClick) {
    const btn = makeButton(this, x, y, label, onClick, {
      width: 168, height: 40, fontSize: '15px', primary: false, color: PAL.accent3, depth: DEPTH + 2,
    });
    btn._tabLabel = label;
    return btn;
  }

  setTab(tab) {
    this.tab = tab;
    this.guideLayer.setVisible(tab === 'guide');
    this.powerLayer.setVisible(tab === 'powers');
    this.bestiaryLayer.setVisible(tab === 'bestiary');
    this.journalLayer.setVisible(tab === 'journal');
    this.scrollY = 0;
    this.maxScroll = tab === 'guide' ? this.guideScrollMax
      : tab === 'powers' ? this.powerScrollMax
        : tab === 'bestiary' ? this.bestiaryScrollMax
          : this.journalScrollMax;
    this.guideLayer.y = this.contentTop;
    this.powerLayer.y = this.contentTop;
    this.bestiaryLayer.y = this.contentTop;
    this.journalLayer.y = this.contentTop;
    this.refreshTabStyles();
  }

  activeLayer() {
    if (this.tab === 'guide') return this.guideLayer;
    if (this.tab === 'bestiary') return this.bestiaryLayer;
    if (this.tab === 'journal') return this.journalLayer;
    return this.powerLayer;
  }

  refreshTabStyles() {
    [this.tabGuideBtn, this.tabPowerBtn, this.tabBestBtn, this.tabJournalBtn].forEach((btn) => {
      const active = (btn._tabLabel === 'GUIDE' && this.tab === 'guide')
        || (btn._tabLabel === 'POWERS' && this.tab === 'powers')
        || (btn._tabLabel === 'GNOMES' && this.tab === 'bestiary')
        || (btn._tabLabel === 'JOURNAL' && this.tab === 'journal');
      btn.setAlpha(active ? 1 : 0.55);
      btn.setScale(active ? 1.04 : 1);
    });
  }

  buildGuideTab() {
    const c = this.guideLayer;
    c.removeAll(true);
    let y = 8;
    const wrap = this.contentWidth - 16;
    const body = { fontFamily: 'Orbitron, monospace', fontSize: '13px', color: PAL.text, wordWrap: { width: wrap }, lineSpacing: 4 };
    const bullet = { ...body, color: PAL.textMuted };

    HOW_TO_PLAY.basics.forEach((line) => {
      c.add(this.add.text(-wrap / 2, y, `◆  ${line}`, bullet).setOrigin(0, 0));
      y += this.textBlockHeight(line, bullet, wrap) + 10;
    });

    y += 8;
    HOW_TO_PLAY.sections.forEach((sec) => {
      const cat = categoryColor(sec.color);
      const hdr = this.add.text(-wrap / 2, y, sec.title.toUpperCase(), {
        fontFamily: 'Syne, Orbitron, monospace',
        fontSize: '15px',
        fontStyle: '800',
        color: cssHex(cat),
      }).setOrigin(0, 0);
      c.add(hdr);
      y += 24;

      const stripe = this.add.graphics();
      stripe.fillStyle(cat, 0.85);
      stripe.fillRoundedRect(-wrap / 2, y - 2, 4, sec.lines.length * 22 + 8, 2);
      c.add(stripe);

      sec.lines.forEach((line) => {
        c.add(this.add.text(-wrap / 2 + 14, y, line, body).setOrigin(0, 0));
        y += this.textBlockHeight(line, body, wrap - 14) + 6;
      });
      y += 14;
    });

    y += 4;
    c.add(this.add.text(-wrap / 2, y, 'GNOME TIERS', {
      fontFamily: 'Syne, Orbitron, monospace', fontSize: '15px', fontStyle: '800', color: cssHex(PAL.info),
    }).setOrigin(0, 0));
    y += 24;
    HOW_TO_PLAY.gnomeTiers.forEach((line) => {
      c.add(this.add.text(-wrap / 2 + 8, y, `· ${line}`, bullet).setOrigin(0, 0));
      y += this.textBlockHeight(line, bullet, wrap - 8) + 6;
    });

    this.guideScrollMax = Math.max(0, y - this.contentH + 16);
  }

  buildPowerTab() {
    const c = this.powerLayer;
    c.removeAll(true);
    let y = 4;
    const wrap = this.contentWidth - 24;
    const rowH = 58;
    const gap = 6;

    CATEGORY_ORDER.forEach((catId) => {
      const keys = POWER_KEYS.filter((k) => POWERS[k].category === catId);
      if (!keys.length) return;
      const cat = categoryColor(catId);
      const label = CATEGORY_LABELS[catId] ?? catId;

      c.add(this.add.text(-wrap / 2, y, label.toUpperCase(), {
        fontFamily: 'Syne, Orbitron, monospace',
        fontSize: '14px',
        fontStyle: '800',
        color: cssHex(cat),
      }).setOrigin(0, 0));
      y += 22;

      const rule = this.add.graphics();
      rule.fillStyle(cat, 0.35);
      rule.fillRect(-wrap / 2, y, wrap, 1);
      c.add(rule);
      y += 10;

      keys.forEach((key) => {
        c.add(this.makePowerRow(key, -wrap / 2, y, wrap, rowH, cat));
        y += rowH + gap;
      });
      y += 12;
    });

    this.powerScrollMax = Math.max(0, y - this.contentH + 12);
    this.maxScroll = this.guideScrollMax;
  }

  makePowerRow(key, x, y, w, h, catColor) {
    const def = POWERS[key];
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x1a1024, 0.88);
    g.fillRoundedRect(0, 0, w, h, 10);
    g.fillStyle(catColor, 0.92);
    g.fillRoundedRect(0, 4, 5, h - 8, 3);
    g.lineStyle(1, catColor, 0.35);
    g.strokeRoundedRect(0, 0, w, h, 10);
    container.add(g);

    const iconR = 17;
    const iconX = 28;
    const iconY = h / 2;
    const disk = this.add.graphics();
    disk.fillStyle(catColor, 1);
    disk.fillCircle(iconX, iconY, iconR);
    disk.lineStyle(1.5, 0xffffff, 0.25);
    disk.strokeCircle(iconX, iconY, iconR);
    container.add(disk);

    const iconKey = iconTextureKey(key);
    if (this.textures.exists(iconKey)) {
      container.add(this.add.image(iconX, iconY, iconKey).setDisplaySize(20, 20).setTint(0xffffff));
    } else {
      container.add(this.add.text(iconX, iconY - 1, def.short, {
        fontFamily: 'Orbitron, monospace', fontSize: '10px', fontStyle: '900', color: '#120818',
      }).setOrigin(0.5));
    }

    const polarity = def.polarity === 'neg' ? cssHex(PAL.danger)
      : def.polarity === 'wild' ? cssHex(PAL.powerWild)
        : cssHex(PAL.accent3);
    const badge = def.polarity === 'neg' ? 'CURSE' : def.polarity === 'wild' ? 'WILD' : def.kind === 'instant' ? 'INSTANT' : 'TIMED';
    container.add(this.add.text(w - 12, 10, badge, {
      fontFamily: 'Orbitron, monospace', fontSize: '9px', fontStyle: '700', color: polarity,
    }).setOrigin(1, 0));

    container.add(this.add.text(54, 12, powerDisplayName(key), {
      fontFamily: 'Syne, Orbitron, monospace',
      fontSize: '13px',
      fontStyle: '700',
      color: PAL.text,
    }).setOrigin(0, 0));

    container.add(this.add.text(54, 30, def.desc, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: PAL.textMuted,
      wordWrap: { width: w - 68 },
      lineSpacing: 2,
    }).setOrigin(0, 0));

    return container;
  }

  buildBestiaryTab() {
    const c = this.bestiaryLayer;
    c.removeAll(true);
    const unlocked = new Set(MetaProgress.getCodex().gnomes ?? []);
    let y = 4;
    const wrap = this.contentWidth - 24;
    Object.entries(GNOME_TIERS).forEach(([tier, info]) => {
      const seen = unlocked.has(tier);
      c.add(this.add.text(-wrap / 2, y, seen ? info.label.toUpperCase() : '???', {
        fontFamily: 'Syne, Orbitron, monospace', fontSize: '16px', fontStyle: '800',
        color: seen ? cssHex(PAL.accent2) : PAL.textMuted,
      }).setOrigin(0, 0));
      y += 24;
      const desc = seen
        ? `Projectiles: ${(info.projectiles ?? ['pot']).join(', ')}${info.tracking ? ' · tracking shots' : ''}`
        : 'Knock out this tier to unlock the bestiary entry.';
      c.add(this.add.text(-wrap / 2 + 8, y, desc, {
        fontFamily: 'Orbitron, monospace', fontSize: '12px', color: PAL.textMuted, wordWrap: { width: wrap - 8 },
      }).setOrigin(0, 0));
      y += 44;
    });
    this.bestiaryScrollMax = Math.max(0, y - this.contentH + 12);
  }

  buildJournalTab() {
    const c = this.journalLayer;
    c.removeAll(true);
    const stats = MetaProgress.getStats();
    const achievements = MetaProgress.getJournalAchievements();
    let y = 4;
    const wrap = this.contentWidth - 24;
    const hdr = { fontFamily: 'Syne, Orbitron, monospace', fontSize: '15px', fontStyle: '800', color: cssHex(PAL.accent) };
    const body = { fontFamily: 'Orbitron, monospace', fontSize: '12px', color: PAL.textMuted, wordWrap: { width: wrap } };

    c.add(this.add.text(-wrap / 2, y, 'GARDEN JOURNAL', hdr).setOrigin(0, 0));
    y += 28;
    const lines = [
      `Knockouts  ${stats.knockouts ?? 0}`,
      `Levels cleared  ${stats.levelsCleared ?? 0}`,
      `Combos cashed  ${stats.combosCashed ?? 0}`,
      `Total stars  ${MetaProgress.countTotalStars()}`,
      `Treasury  ${MetaProgress.getTreasury()}`,
    ];
    lines.forEach((line) => {
      c.add(this.add.text(-wrap / 2, y, line, body).setOrigin(0, 0));
      y += 22;
    });

    y += 12;
    c.add(this.add.text(-wrap / 2, y, 'ACHIEVEMENTS', hdr).setOrigin(0, 0));
    y += 24;
    achievements.forEach((a) => {
      c.add(this.add.text(-wrap / 2, y, `${a.done ? '★' : '☆'}  ${a.label}`, {
        ...body, color: a.done ? cssHex(PAL.accent3) : PAL.textMuted,
      }).setOrigin(0, 0));
      y += 22;
    });

    this.journalScrollMax = Math.max(0, y - this.contentH + 12);
  }

  textBlockHeight(text, style, width) {
    const t = this.add.text(0, 0, text, style).setVisible(false);
    const h = t.getBounds().height;
    t.destroy();
    return h;
  }

  scrollBy(dy) {
    this.scrollY = clamp(this.scrollY + dy, 0, this.maxScroll);
    this.activeLayer().y = this.contentTop - this.scrollY;
  }

  close() {
    InputRouter.onOverlayClose(this.from === SCENES.GAME || this.from === SCENES.PAUSE);
    this.scene.stop();
    if (this.scene.isSleeping(this.from)) this.scene.wake(this.from);
    else if (this.scene.isPaused(this.from)) this.scene.resume(this.from);
  }
}
