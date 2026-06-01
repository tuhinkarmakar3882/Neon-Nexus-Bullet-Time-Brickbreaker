import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeButton, makeResponsiveOverlayPanel } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { clearGameplayHistory } from '../systems/Navigation.js';
import { Monetization } from '../systems/Monetization.js';
import { hidePauseAdSlot, showPauseAdSlot } from '../systems/PauseAdSlot.js';
import { dispatchPauseOverlayClose, dispatchPauseOverlayOpen } from '../shell/pauseOverlayDom.js';
import { ROUTES, exitToHome, saveRunAndLeavePlay } from '../shell/routes.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';

/** Pause overlay — mockup: title → ad banner → resume → settings | quit. */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PAUSE);
  }

  init(data) {
    this.d = data || {};
    this._adRect = null;
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.PAUSE);
    this.input.setTopOnly(true);

    const d = this.d;

    if (GAME.USE_DOM_HUD) {
      this._domPause = true;
      dispatchPauseOverlayOpen({
        level: d.level ?? 1,
        score: d.score ?? 0,
        lives: d.lives ?? 0,
        combo: d.combo ?? 0,
      });
      this.events.once('shutdown', () => {
        dispatchPauseOverlayClose();
        hidePauseAdSlot();
      });
      return;
    }

    const panel = makeResponsiveOverlayPanel(this, {
      dimAlpha: 0.88,
      heightRatio: GAME.IS_PORTRAIT ? 0.58 : 0.52,
      maxCardW: 380,
    });

    const pad = uiPx(18, { min: 14, max: 22 });
    const cardTop = panel.cy - panel.cardH / 2;
    const cardBot = panel.cy + panel.cardH / 2;
    const cardLeft = panel.cx - panel.cardW / 2;
    const cx = panel.cx;
    const contentW = panel.cardW - pad * 2;
    const gap = uiPx(12, { min: 10, max: 14 });

    const plate = this.add.graphics().setDepth(1000);
    plate.fillStyle(0x0c1018, 0.97);
    plate.fillRoundedRect(cardLeft, cardTop, panel.cardW, panel.cardH, 14);
    plate.lineStyle(2, PAL.accent, 0.55);
    plate.strokeRoundedRect(cardLeft, cardTop, panel.cardW, panel.cardH, 14);

    let y = cardTop + pad;

    const title = this.add.text(cx, y, 'GAME PAUSED', {
      ...orbitronStyle(30, PAL.text, { fontStyle: '800', align: 'center', letterSpacing: '0.06em' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    fitTextWidth(title, contentW, uiPx(22, { min: 18, max: 26 }));
    y += title.height + uiPx(8, { min: 6, max: 10 });

    const statsLine = this.add.text(
      cx,
      y,
      `Level ${d.level ?? 1}  ·  ${(d.score ?? 0).toLocaleString()}  ·  ${d.lives ?? 0} lives`,
      {
        ...orbitronStyle(13, cssHex(PAL.accent), { fontStyle: '600', align: 'center' }),
      },
    ).setOrigin(0.5, 0).setDepth(1001);
    fitTextWidth(statsLine, contentW, uiPx(11, { min: 10, max: 12 }));
    y += statsLine.height + gap;

    const btnPrimaryH = uiPx(50, { min: 46, max: 54 });
    const btnRowH = uiPx(44, { min: 40, max: 48 });
    const bottomBlock = btnPrimaryH + gap + btnRowH + pad;

    const adH = Math.max(uiPx(100, { min: 88, max: 120 }), cardBot - pad - bottomBlock - y);
    const adW = contentW;
    this._drawAdZone(cx, y, adW, adH);
    y += adH + gap;

    const resumeY = y + btnPrimaryH / 2;
    makeButton(this, cx, resumeY, 'RESUME', () => this.resume(), {
      width: contentW,
      height: btnPrimaryH,
      fontSize: '18px',
      color: PAL.accent,
      depth: 1003,
    });
    y += btnPrimaryH + gap;

    const rowY = y + btnRowH / 2;
    const rowGap = uiPx(10, { min: 8, max: 12 });
    const halfW = (contentW - rowGap) / 2;

    makeButton(this, cx - halfW / 2 - rowGap / 2, rowY, 'SETTINGS', () => {
      this._teardown();
      InputRouter.onOverlayClose(SCENES.PAUSE, false, false);
      saveRunAndLeavePlay(ROUTES.settings, { from: 'play' });
    }, {
      width: halfW,
      height: btnRowH,
      fontSize: '14px',
      primary: false,
      depth: 1003,
    });

    makeButton(this, cx + halfW / 2 + rowGap / 2, rowY, 'QUIT TO MENU', () => this.exitToHub(), {
      width: halfW,
      height: btnRowH,
      fontSize: '14px',
      primary: false,
      color: PAL.danger,
      depth: 1003,
    });

    this._onResize = () => {
      if (this._adRect) showPauseAdSlot(this.game, this._adRect);
    };
    this.scale.on('resize', this._onResize, this);
    this.events.once('shutdown', () => this._teardown());

    this.input.keyboard.on('keydown-P', () => this.resume());
    this.input.keyboard.on('keydown-ESC', () => this.resume());
  }

  _teardown() {
    if (this._domPause) dispatchPauseOverlayClose();
    hidePauseAdSlot();
    this.scale.off('resize', this._onResize, this);
    this._adRect = null;
  }

  _drawAdZone(cx, top, w, h) {
    const left = cx - w / 2;
    const cy = top + h / 2;
    const labelReserve = uiPx(22, { min: 18, max: 26 });

    const g = this.add.graphics().setDepth(1001);
    g.fillStyle(0x080c14, 0.95);
    g.fillRoundedRect(left, top, w, h, 8);
    g.lineStyle(2, 0xe8eefc, 0.35);
    g.strokeRoundedRect(left, top, w, h, 8);

    const showDomAd = !Monetization.removeAds && Monetization.getProviderName() !== 'noop';

    if (showDomAd) {
      this._adRect = {
        cx,
        cy: top + labelReserve + (h - labelReserve) / 2,
        width: w - uiPx(12, { min: 8, max: 16 }),
        height: h - labelReserve - uiPx(6, { min: 4, max: 8 }),
      };
      showPauseAdSlot(this.game, this._adRect);
      this.add.text(cx, top + uiPx(10, { min: 8, max: 12 }), 'Advertisement', {
        ...orbitronStyle(9, PAL.textMuted, { fontStyle: '700', align: 'center', letterSpacing: '0.18em' }),
      }).setOrigin(0.5, 0).setDepth(1002).setAlpha(0.85);
    } else {
      this.add.text(cx, cy, 'Advertisement', {
        ...orbitronStyle(14, PAL.textMuted, { fontStyle: '600', align: 'center', letterSpacing: '0.12em' }),
      }).setOrigin(0.5).setDepth(1002).setAlpha(0.65);
    }
  }

  exitToHub() {
    this._teardown();
    InputRouter.onOverlayClose(SCENES.PAUSE, false, false);
    this.scene.stop(SCENES.UI);
    this.scene.stop(SCENES.GAME);
    this.scene.stop();
    clearGameplayHistory();
    exitToHome();
  }

  resume(syncHistory = true) {
    this._teardown();
    InputRouter.onOverlayClose(SCENES.PAUSE, true, syncHistory);
    const sm = this.scene;
    if (sm.isPaused(SCENES.GAME)) sm.resume(SCENES.GAME);
    if (sm.isPaused(SCENES.UI)) sm.resume(SCENES.UI);
    this.scene.stop();
  }

  handleBack() {
    this.resume(false);
    return true;
  }
}
