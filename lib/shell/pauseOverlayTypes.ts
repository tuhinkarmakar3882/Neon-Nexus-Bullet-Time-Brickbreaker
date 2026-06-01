/** Payload from GameScene → PauseScene → React overlay. */
export type PauseOverlayData = {
  level: number;
  score: number;
  lives: number;
  combo?: number;
};
