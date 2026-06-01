import { GAME } from '../config/Constants.js';
import { uiPx } from '../utils/Typography.js';

/** Horizontal inset for HUD chrome (not collision WALL_X). */
function hudPadX() {
  return uiPx(10, { min: 8, max: 14 }) + GAME.SAFE_LEFT;
}

/**
 * Header layout — four equal columns + pause control on the right.
 * Lives | Score | Currency | Level | (pause)
 */
export function getGameplayUiLayout() {
  const W = GAME.WIDTH;
  const H = GAME.HEIGHT;
  const headerTop = GAME.SAFE_TOP;
  const headerH = GAME.UI_HEADER_H;
  const headerBottom = headerTop + headerH;
  const headerCy = headerTop + headerH / 2;
  const headerGap = GAME.UI_HEADER_GAP ?? 0;
  const edgeW = GAME.UI_EDGE_W;
  const playTop = GAME.WALL_TOP;
  const playBottom = GAME.ARENA_FLOOR;
  const playH = Math.max(64, playBottom - playTop);
  const playCy = playTop + playH / 2;
  const playLeft = GAME.WALL_X;
  const playRight = W - GAME.WALL_X;
  const playW = Math.max(64, playRight - playLeft);

  const padX = hudPadX();
  const padR = uiPx(8, { min: 6, max: 12 }) + GAME.SAFE_RIGHT;
  const pauseSize = uiPx(36, { min: 32, max: 40 });
  const pauseCx = W - padR - pauseSize / 2;

  const rowLeft = padX;
  const rowRight = W - padR - pauseSize - uiPx(4, { min: 2, max: 6 });
  const rowW = Math.max(120, rowRight - rowLeft);
  const colW = rowW / 4;
  const colCx = (i) => rowLeft + colW * (i + 0.5);

  const livesCx = colCx(0);
  const scoreCx = colCx(1);
  const currencyCx = colCx(2);
  const levelCx = colCx(3);

  const leftEdgeCx = playLeft + edgeW / 2;
  const rightEdgeCx = playRight - edgeW / 2;

  return {
    W,
    H,
    headerTop,
    headerBottom,
    headerCy,
    headerH,
    headerGap,
    edgeW,
    playTop,
    playBottom,
    playH,
    playCy,
    playLeft,
    playRight,
    playW,
    padX,
    padR,
    pauseSize,
    rowLeft,
    rowW,
    colW,
    scoreSlotW: colW * 0.9,
    currencySlotW: colW * 0.92,
    levelSlotW: colW * 0.88,
    livesCx,
    scoreCx,
    currencyCx,
    levelCx,
    pauseCx,
    leftEdgeCx,
    rightEdgeCx,
    /** @deprecated */
    gemsCx: currencyCx,
    innerW: rowW,
    slotW: colW,
    colW,
    leftColCx: livesCx,
    centerColCx: scoreCx,
    rightColCx: levelCx,
    arenaCx: playLeft + playW / 2,
  };
}
