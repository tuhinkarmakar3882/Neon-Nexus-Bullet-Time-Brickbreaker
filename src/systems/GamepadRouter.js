/** Gamepad v1 — left stick / D-pad steers paddle on /play. */
import { SCENES } from '../config/Constants.js';
import { InputRouter } from './InputRouter.js';

const DEADZONE = 0.22;
const AXIS_DEAD = 0.18;

let gameRef = null;
let rafId = 0;
let lastAxis = 0;

function readAxis(gp) {
  const lx = gp.axes?.[0] ?? 0;
  const ly = gp.axes?.[1] ?? 0;
  if (Math.abs(lx) > AXIS_DEAD) return lx;
  if (gp.buttons?.[14]?.pressed) return -1;
  if (gp.buttons?.[15]?.pressed) return 1;
  if (gp.buttons?.[12]?.pressed && Math.abs(ly) < 0.5) return -1;
  if (gp.buttons?.[13]?.pressed && Math.abs(ly) < 0.5) return 1;
  return 0;
}

function poll() {
  rafId = 0;
  const game = gameRef;
  if (!game?.scene) return;

  const gs = game.scene.getScene(SCENES.GAME);
  if (
    !gs?.scene?.isActive?.()
    || gs.over
    || gs.transitioning
    || gs.draftOpen
    || InputRouter.shouldBlockGameplay()
    || game.scene.isPaused(SCENES.GAME)
  ) {
    schedule();
    return;
  }

  const pads = navigator.getGamepads?.();
  if (pads?.length) {
    let axis = 0;
    for (const gp of pads) {
      if (!gp?.connected) continue;
      const a = readAxis(gp);
      if (Math.abs(a) > Math.abs(axis)) axis = a;
    }
    if (Math.abs(axis) < DEADZONE) axis = 0;
    if (axis !== 0) {
      const inv = gs.controlsInverted ? -1 : 1;
      gs.paddle?.moveByKeyboard?.(axis * inv, 1 / 60, gs.timeScale ?? 1);
      lastAxis = axis;
    } else if (lastAxis !== 0) {
      lastAxis = 0;
    }

    const pad = pads.find((p) => p?.connected);
    if (pad?.buttons?.[0]?.pressed && gs.balls?.some((b) => b.stuck)) {
      gs.onKeyboardLaunch?.();
    }
    if (pad?.buttons?.[9]?.pressed || pad?.buttons?.[8]?.pressed) {
      gs.requestPause?.();
    }
  }

  schedule();
}

function schedule() {
  if (!gameRef) return;
  rafId = requestAnimationFrame(poll);
}

export function attachGamepadRouter(game) {
  detachGamepadRouter();
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  gameRef = game;
  schedule();
}

export function detachGamepadRouter() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  gameRef = null;
  lastAxis = 0;
}
