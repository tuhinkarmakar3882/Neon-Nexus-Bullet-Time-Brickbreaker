/** Paddle hitbox helpers — paddle.y is center; use top/bottom getters, not y + h. */

export function paddleBottom(paddle) {
  return paddle.y + paddle.h / 2;
}

export function circleOverlapsPaddle(paddle, x, y, r, pad = 0) {
  return x + r > paddle.left - pad
    && x - r < paddle.right + pad
    && y + r > paddle.top - pad
    && y - r < paddleBottom(paddle) + pad;
}

/** Axis-aligned box with top-left origin (x, y). */
export function aabbOverlapsPaddle(paddle, x, y, w, h, pad = 0) {
  return x + w > paddle.left - pad
    && x < paddle.right + pad
    && y + h > paddle.top - pad
    && y < paddleBottom(paddle) + pad;
}
