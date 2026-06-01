import { SCENES } from '../config/Constants.js';
import { popOverlayHistory, pushOverlayHistory } from './Navigation.js';

const OVERLAY_SCENES = [
  SCENES.PAUSE,
  SCENES.GAMEOVER,
  SCENES.SETTINGS,
  SCENES.LEVEL_COMPLETE,
  SCENES.CODEX,
  SCENES.SHOP,
  SCENES.AD_BREAK,
  SCENES.PURCHASE,
];

class InputRouterService {
  constructor() {
    this.game = null;
    this._overlayActive = false;
  }

  attach(game) {
    this.game = game;
  }

  isOverlayActive() {
    if (!this.game) return false;
    return OVERLAY_SCENES.some((k) => this.game.scene.isActive(k));
  }

  onOverlayOpen(overlayKey) {
    if (!this.game) return;
    this._overlayActive = true;
    pushOverlayHistory();
    const sm = this.game.scene;
    // Clear any stuck flash/toast when an overlay takes focus.
    this.game.events.emit('hud:flash', { text: '', ms: 0 });
    this.game.events.emit('hud:toast', { text: '', ms: 0 });
    // Keep HUD running so flash/toast timers, stats, and immersive peek stay in sync.
    if (overlayKey !== SCENES.PAUSE && sm.isActive(SCENES.GAME) && !sm.isPaused(SCENES.GAME)) {
      sm.pause(SCENES.GAME);
    }
    const overlay = sm.getScene(overlayKey);
    if (overlay?.input) overlay.input.setTopOnly(true);
  }

  /**
   * @param {string|null|boolean} closingKey - overlay being closed, or legacy boolean resumeGame
   * @param {boolean} [resumeGame=true]
   */
  onOverlayClose(closingKey = null, resumeGame = true) {
    if (!this.game) return;
    if (typeof closingKey === 'boolean') {
      resumeGame = closingKey;
      closingKey = null;
    }
    const sm = this.game.scene;
    const stillOverlayed = OVERLAY_SCENES.some((k) => k !== closingKey && sm.isActive(k));
    this._overlayActive = stillOverlayed;
    if (stillOverlayed) return;
    popOverlayHistory();

    const gameActive = sm.isActive(SCENES.GAME);
    if (gameActive && sm.isPaused(SCENES.HUD)) sm.resume(SCENES.HUD);
    if (resumeGame && gameActive && sm.isPaused(SCENES.GAME)) sm.resume(SCENES.GAME);
  }

  shouldBlockGameplay() {
    if (!this.game) return false;
    const sm = this.game.scene;
    return sm.isPaused(SCENES.GAME) || this.isOverlayActive();
  }
}

export const InputRouter = new InputRouterService();
