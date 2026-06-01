import { SCENES } from '../config/Constants.js';

/** Resolve the active Game scene from any overlay scene. */
export function getGameScene(fromScene) {
  if (!fromScene) return null;
  const mgr = fromScene.game?.scene ?? fromScene.sys?.game?.scene;
  if (!mgr?.getScene) return null;
  return mgr.getScene(SCENES.GAME) ?? null;
}
