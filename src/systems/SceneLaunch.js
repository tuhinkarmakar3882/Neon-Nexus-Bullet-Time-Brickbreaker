/**
 * Launch a scene in parallel with the current stack.
 *
 * @see https://phaser.io/v401 — Phaser 4.1.0 SceneManager uses run(), not launch().
 * Inside a Scene, use this.scene.launch() (ScenePlugin) as usual.
 */
export function launchParallelScene(game, key, data = {}, fromKey = null) {
  const sm = game?.scene;
  if (!sm) return false;
  if (typeof sm.run === 'function') {
    sm.run(key, data);
    return true;
  }
  const host = fromKey ? sm.getScene(fromKey) : null;
  if (host?.scene?.launch) {
    host.scene.launch(key, data);
    return true;
  }
  const menu = sm.getScene('Menu');
  if (menu?.scene?.launch) {
    menu.scene.launch(key, data);
    return true;
  }
  return false;
}
