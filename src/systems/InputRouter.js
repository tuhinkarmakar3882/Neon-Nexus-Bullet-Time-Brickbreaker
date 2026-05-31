import { SCENES } from '../config/Constants.js';

const OVERLAY_SCENES = [SCENES.PAUSE, SCENES.GAMEOVER, SCENES.SETTINGS, SCENES.LEVEL_COMPLETE, SCENES.CODEX, SCENES.SHOP, SCENES.AD_BREAK];

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
    const sm = this.game.scene;
    if (sm.isActive(SCENES.HUD) && !sm.isPaused(SCENES.HUD)) sm.pause(SCENES.HUD);
    if (overlayKey !== SCENES.PAUSE && sm.isActive(SCENES.GAME) && !sm.isPaused(SCENES.GAME)) {
      sm.pause(SCENES.GAME);
    }
    const overlay = sm.getScene(overlayKey);
    if (overlay?.input) overlay.input.setTopOnly(true);
  }

  onOverlayClose(resumeGame = true) {
    if (!this.game) return;
    const sm = this.game.scene;
    const stillOverlayed = OVERLAY_SCENES.some((k) => sm.isActive(k));
    this._overlayActive = stillOverlayed;
    if (stillOverlayed) return;

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
