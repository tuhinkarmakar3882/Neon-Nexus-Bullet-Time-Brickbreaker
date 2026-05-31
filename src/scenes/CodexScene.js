import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { HOW_TO_PLAY } from '../config/HowToPlay.js';
import { PAL, cssHex } from '../config/Palette.js';
import {
  POWERS, POWER_KEYS, CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_ORDER,
  categoryColor, powerDisplayName,
} from '../config/PowerUps.js';
import { iconTextureKey } from '../utils/IconTextures.js';
import { clamp } from '../utils/Helpers.js';
import { makeButton, makeResponsiveOverlayPanel, overlayFrame, attachOverlayScroll, clampOverlayScroll } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { GNOME_TIERS } from '../config/GnomeTiers.js';
import { fitTextWidth, orbitronStyle, bodyStyle, displayStyle, uiPx } from '../utils/Typography.js';

const DEPTH = 1001;

const sectionHdr = (color) => displayStyle(15, cssHex(color), { fontStyle: '700', letterSpacing: '0.06em' });

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

    const panel = makeResponsiveOverlayPanel(this, {
      dimAlpha: 0.86,
      maxCardW: 820,
    });
    this.panel = panel;
    const frame = overlayFrame(panel, {
      footerReserve: uiPx(56, { min: 48, max: 64 }),
      headerReserve: uiPx(118, { min: 100, max: 124 }),
    });

    this.drawTwilightCard(panel);

    const cardTop = frame.cardTop;
    const cardPad = frame.pad;
    let headerY = frame.titleY;

    const title = this.add.text(panel.cx, headerY, HOW_TO_PLAY.title, {
      ...orbitronStyle(28, cssHex(PAL.accent), { fontStyle: '800', align: 'center', wordWrap: { width: panel.cardW - cardPad * 2 } }),
    }).setOrigin(0.5, 0).setDepth(DEPTH).setShadow(0, 0, cssHex(PAL.accent), 12, true, true);
    fitTextWidth(title, panel.cardW - cardPad * 2, uiPx(16, { min: 14, max: 20 }));
    headerY += title.height + uiPx(6, { min: 4, max: 8 });

    const subtitle = this.add.text(panel.cx, headerY, HOW_TO_PLAY.subtitle, {
      ...orbitronStyle(11, cssHex(PAL.accent2), {
        align: 'center',
        wordWrap: { width: panel.cardW - cardPad * 2 },
        letterSpacing: '0.1em',
      }),
    }).setOrigin(0.5, 0).setDepth(DEPTH);
    fitTextWidth(subtitle, panel.cardW - cardPad * 2, 9);
    headerY += subtitle.height + uiPx(10, { min: 8, max: 12 });

    const tabY = headerY;
    const contentTop = this.layoutTabs(panel, tabY);
    const contentBottom = frame.footerY - uiPx(30, { min: 26, max: 34 });
    this.contentTop = contentTop;
    this.contentH = Math.max(80, contentBottom - contentTop);
    this.contentWidth = panel.cardW - cardPad * 2;
    this.contentLeft = frame.cx - this.contentWidth / 2;

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

    this._scroll = attachOverlayScroll(this, {
      left: this.contentLeft,
      top: this.contentTop,
      width: this.contentWidth,
      height: this.contentH,
      getScroll: () => this.scrollY,
      setScroll: (v) => {
        this.scrollY = v;
        this.activeLayer().y = this.contentTop - this.scrollY;
      },
      getMaxScroll: () => this.maxScroll,
    });

    makeButton(this, frame.cx, frame.footerY, 'BACK', () => this.close(), {
      width: Math.min(panel.cardW * 0.62, uiPx(240, { max: 240 })),
      height: uiPx(46, { min: 40, max: 50 }),
      primary: false,
      fontSize: '16px',
      color: PAL.accent,
      depth: DEPTH + 10,
      compact: true,
    });

    this.setTab('guide');
    this.events.once('shutdown', () => this._scroll?.destroy());
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

  layoutTabs(panel, tabY) {
    const defs = [
      { key: 'guide', label: 'GUIDE', prop: 'tabGuideBtn' },
      { key: 'powers', label: 'POWERS', prop: 'tabPowerBtn' },
      { key: 'bestiary', label: 'GNOMES', prop: 'tabBestBtn' },
      { key: 'journal', label: 'JOURNAL', prop: 'tabJournalBtn' },
    ];
    const gap = uiPx(6, { min: 4, max: 8 });
    const pad = uiPx(12, { min: 10, max: 16 });
    const n = defs.length;
    let tabW = Math.floor((panel.cardW - pad * 2 - gap * (n - 1)) / n);
    tabW = clamp(tabW, 52, 168);
    const tabH = uiPx(36, { min: 30, max: 40 });
    const fontSize = tabW < 64 ? '9px' : tabW < 80 ? '10px' : tabW < 100 ? '11px' : '13px';
    const totalW = n * tabW + gap * (n - 1);
    let x = panel.cx - totalW / 2 + tabW / 2;
    const tabCenterY = tabY + tabH / 2;

    defs.forEach((def) => {
      this[def.prop] = this.makeTab(x, tabCenterY, def.label, () => this.setTab(def.key), {
        width: tabW,
        height: tabH,
        fontSize,
      });
      this[def.prop]._tabKey = def.key;
      x += tabW + gap;
    });

    return tabCenterY + tabH / 2 + uiPx(8, { min: 6, max: 10 });
  }

  makeTab(x, y, label, onClick, opts = {}) {
    const btn = makeButton(this, x, y, label, onClick, {
      width: opts.width ?? 168,
      height: opts.height ?? 40,
      fontSize: opts.fontSize ?? '15px',
      primary: false,
      color: PAL.accent3,
      depth: DEPTH + 2,
      compact: true,
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
    const layerY = this.contentTop - this.scrollY;
    this.guideLayer.y = layerY;
    this.powerLayer.y = layerY;
    this.bestiaryLayer.y = layerY;
    this.journalLayer.y = layerY;
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
      const active = btn._tabKey === this.tab;
      btn.setAlpha(active ? 1 : 0.55);
      btn.setScale(active ? 1.02 : 1);
    });
  }

  buildGuideTab() {
    const c = this.guideLayer;
    c.removeAll(true);
    let y = 8;
    const wrap = this.contentWidth - 16;
    const body = { ...bodyStyle(13, PAL.text, { wordWrap: { width: wrap }, lineSpacing: 5 }) };
    const bullet = { ...body, color: PAL.textMuted };

    HOW_TO_PLAY.basics.forEach((line) => {
      c.add(this.add.text(-wrap / 2, y, `◆  ${line}`, bullet).setOrigin(0, 0));
      y += this.textBlockHeight(line, bullet, wrap) + 10;
    });

    y += 8;
    HOW_TO_PLAY.sections.forEach((sec) => {
      const cat = categoryColor(sec.color);
      const hdr = this.add.text(-wrap / 2, y, sec.title.toUpperCase(), sectionHdr(cat)).setOrigin(0, 0);
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
    c.add(this.add.text(-wrap / 2, y, 'GNOME TIERS', sectionHdr(PAL.info)).setOrigin(0, 0));
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
    const rowH = uiPx(56, { min: 48, max: 58 });
    const gap = uiPx(6, { min: 4, max: 8 });

    CATEGORY_ORDER.forEach((catId) => {
      const keys = POWER_KEYS.filter((k) => POWERS[k].category === catId);
      if (!keys.length) return;
      const cat = categoryColor(catId);
      const label = CATEGORY_LABELS[catId] ?? catId;

      c.add(this.add.text(-wrap / 2, y, label.toUpperCase(), sectionHdr(cat)).setOrigin(0, 0));
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
        ...displayStyle(10, '#120818', { fontStyle: '700' }),
      }).setOrigin(0.5));
    }

    const polarity = def.polarity === 'neg' ? cssHex(PAL.danger)
      : def.polarity === 'wild' ? cssHex(PAL.powerWild)
        : cssHex(PAL.accent3);
    const badge = def.polarity === 'neg' ? 'CURSE' : def.polarity === 'wild' ? 'WILD' : def.kind === 'instant' ? 'INSTANT' : 'TIMED';
    container.add(this.add.text(w - 12, 10, badge, {
      ...displayStyle(9, polarity, { fontStyle: '600', letterSpacing: '0.04em' }),
    }).setOrigin(1, 0));

    container.add(this.add.text(54, 12, powerDisplayName(key), {
      ...displayStyle(12, PAL.text, { fontStyle: '700' }),
    }).setOrigin(0, 0));

    container.add(this.add.text(54, 30, def.desc, {
      ...bodyStyle(11, PAL.textMuted, { wordWrap: { width: w - 68 }, lineSpacing: 3 }),
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
        ...displayStyle(16, seen ? cssHex(PAL.accent2) : PAL.textMuted, { fontStyle: '700' }),
      }).setOrigin(0, 0));
      y += 24;
      const desc = seen
        ? `Projectiles: ${(info.projectiles ?? ['pot']).join(', ')}${info.tracking ? ' · tracking shots' : ''}`
        : 'Knock out this tier to unlock the bestiary entry.';
      c.add(this.add.text(-wrap / 2 + 8, y, desc, {
        ...bodyStyle(12, PAL.textMuted, { wordWrap: { width: wrap - 8 }, lineSpacing: 4 }),
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
    const hdr = displayStyle(15, cssHex(PAL.accent), { fontStyle: '700', letterSpacing: '0.06em' });
    const body = bodyStyle(13, PAL.textMuted, { wordWrap: { width: wrap }, lineSpacing: 4 });

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
    this.scrollY = clampOverlayScroll(this.scrollY + dy, this.maxScroll);
    this.activeLayer().y = this.contentTop - this.scrollY;
  }

  close() {
    this._scroll?.destroy();
    InputRouter.onOverlayClose(SCENES.CODEX, this.from === SCENES.GAME || this.from === SCENES.PAUSE);
    this.scene.stop();
    if (this.scene.isSleeping(this.from)) this.scene.wake(this.from);
    else if (this.scene.isPaused(this.from)) this.scene.resume(this.from);
  }
}
