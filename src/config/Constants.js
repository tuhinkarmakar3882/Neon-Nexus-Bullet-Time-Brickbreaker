// Global, tunable game constants with a RESPONSIVE design canvas.
// computeLayout() sizes everything to the device aspect ratio at boot so the
// game fills the screen (landscape desktop / portrait mobile).

const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const GAME = {
  WIDTH: 1280,
  HEIGHT: 800,

  STARTING_LIVES: 3,
  CONTINUES: 2,

  WALL_X: 30,
  WALL_TOP: 180,

  BALL_MIN_SPEED: 560,
  BALL_MAX_SPEED: 1220,
  BALL_RADIUS: 12,
  BALL_MIN_VERTICAL_RATIO: 0.34,
  MAX_BOUNCE_ANGLE: Math.PI / 3,

  PADDLE_BASE_WIDTH: 220,
  PADDLE_HEIGHT: 28,
  PADDLE_SPEED: 1500,
  PADDLE_Y_OFFSET: 78,

  BULLET_TIME_SCALE: 0.32,
  BULLET_TIME_MS: 900,

  LASER_BULLET_SPEED: 980,
  LASER_FIRE_MS: 230,
  POT_SPEED: 360,

  MAX_BALLS: 24,
  MAX_BULLETS: 160,
  MAX_POWERS: 24,

  SCORE_BRICK: 50,
  SCORE_SILVER: 90,
  SCORE_EXPLODE_CHAIN: 30,
  SCORE_JARDINAIN: 250,
  SCORE_STUN_PENALTY: 60,
  SCORE_LEVEL_CLEAR: 1000,

  EXPLODE_RADIUS: 150,
  BOSS_EVERY: 5,
};

export const BRICK = {
  WIDTH: 96,
  HEIGHT: 38,
  GAP: 10,
  HP: { normal: 1, silver: 2, gold: Infinity, explosive: 1, nest: 1 },
};

export const JARDINAIN = {
  THROW_MIN_MS: 2600,
  THROW_MAX_MS: 5200,
  WALK_SPEED: 60,
  SIZE: 26,
  MAX_ALIVE: 6,
};

export function computeLayout(winW, winH) {
  const aspect = (winW || 1280) / (winH || 800);
  const H = 1280;
  const W = Math.round(clampN(H * aspect, 560, 2200));

  GAME.WIDTH = W;
  GAME.HEIGHT = H;

  GAME.WALL_X = Math.round(clampN(W * 0.022, 14, 44));
  GAME.WALL_TOP = Math.round(H * 0.14);

  GAME.PADDLE_BASE_WIDTH = Math.round(W * 0.16);
  GAME.PADDLE_HEIGHT = Math.round(clampN(H * 0.022, 20, 30));
  GAME.PADDLE_Y_OFFSET = Math.round(H * 0.05);
  GAME.PADDLE_SPEED = Math.round(W * 1.2);

  GAME.BALL_RADIUS = Math.round(clampN(H * 0.0098, 9, 16));
  GAME.BALL_MIN_SPEED = Math.round(H * 0.44);
  GAME.BALL_MAX_SPEED = Math.round(H * 0.95);

  GAME.LASER_BULLET_SPEED = Math.round(H * 0.76);
  GAME.POT_SPEED = Math.round(H * 0.28);
  GAME.EXPLODE_RADIUS = Math.round(H * 0.12);

  BRICK.WIDTH = Math.round(H * 0.07);
  BRICK.HEIGHT = Math.round(H * 0.03);
  BRICK.GAP = Math.round(H * 0.008);

  return { W, H };
}

export const STORAGE = {
  SOUND: 'nn_sound',
  MUSIC: 'nn_music',
  BULLET_TIME: 'nn_bulletTime',
  FLASH_TEXT: 'nn_flashText',
  PARTICLES: 'nn_particles',
  HIGH_SCORE: 'nn_highScore',
};

export const SCENES = {
  BOOT: 'Boot',
  PRELOAD: 'Preload',
  MENU: 'Menu',
  GAME: 'Game',
  HUD: 'HUD',
  PAUSE: 'Pause',
  SETTINGS: 'Settings',
  GAMEOVER: 'GameOver',
  LEVEL_COMPLETE: 'LevelComplete',
};
