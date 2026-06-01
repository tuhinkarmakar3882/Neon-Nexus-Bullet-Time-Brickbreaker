export type GameOverOverlayData = {
  score: number;
  highScore: number;
  message: string;
  isNewBest: boolean;
  adsReady: boolean;
  level: number;
  lives: number;
};

/** Stats passed from React overlay into Phaser share (DOM HUD path). */
export type GameOverShareStats = Pick<
  GameOverOverlayData,
  'score' | 'highScore' | 'isNewBest' | 'level' | 'lives'
>;
