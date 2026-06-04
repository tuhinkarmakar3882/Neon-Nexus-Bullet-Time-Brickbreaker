export type LevelCompleteOverlayData = {
  level: number;
  message: string;
  bonus: number;
  score: number;
  stars: number;
  lives: number;
  goal?: string;
  gemsEarned?: number;
  gems?: number;
  showDoubleBonus: boolean;
};

export type LevelCompleteDoubleResult = {
  ok: boolean;
  message: string;
  bonus?: number;
  score?: number;
};
