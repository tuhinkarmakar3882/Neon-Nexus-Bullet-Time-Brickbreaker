/** Active timed power chip from `hud:powers`. */
export type HudPowerChip = {
  key: string;
  ratio: number;
  color: number;
  letter: string;
  polarity: string;
  icon?: string;
  label: string;
};

/** Snapshot driven by Phaser `hud:*` events (React overlay on /play). */
export type GameplayHudState = {
  score: number;
  lives: number;
  level: number;
  bricksLeft: number;
  combo: number;
  gems: number;
  goalText: string;
  mutators: string;
  slowActive: boolean;
  slowLabel: string;
  gnomeRatio: number;
  gnomeReady: boolean;
  nexusRatio: number;
  nexusReady: boolean;
  gambitReady: boolean;
  immersive: boolean;
  scramble: boolean;
  lifePulse: number;
  nexusMeterPulse: number;
  gnomeMeterPulse: number;
  activePowers: HudPowerChip[];
};

export const INITIAL_GAMEPLAY_HUD: GameplayHudState = {
  score: 0,
  lives: 3,
  level: 1,
  bricksLeft: 0,
  combo: 0,
  gems: 0,
  goalText: '',
  mutators: '',
  slowActive: false,
  slowLabel: 'SLOW',
  gnomeRatio: 0,
  gnomeReady: false,
  nexusRatio: 0,
  nexusReady: false,
  gambitReady: false,
  immersive: true,
  scramble: false,
  lifePulse: 0,
  nexusMeterPulse: 0,
  gnomeMeterPulse: 0,
  activePowers: [],
};
