// Global, tunable game constants.
//
// Layout values are RESPONSIVE: `computeLayout(winW, winH)` is called once at
// boot to size the design canvas to the device's aspect ratio (landscape on
// desktop, portrait on phones) so the game fills the screen instead of rendering
// as a letterboxed strip. Everything else is derived proportionally.

const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const GAME = {
  WIDTH: 1280,
  HEIGHT: 800,
  BG_TOP: 0x05060a,
  BG_BOTTOM: 0x0c1230,

  STARTING_LIVES: 3,
  CONTINUES: 3,

  BALL_MIN_SPEED: 540,
  BALL_MAX_SPEED: 1180,
  BALL_RADIUS: 12,
  BALL_MIN_VERTICAL_RATIO: 0.30,
  MAX_BOUNCE_ANGLE: Math.PI / 3,

  PADDLE_BASE_WIDTH: 220,
  PADDLE_HEIGHT: 24,
  PADDLE_SPEED: 1400,
  PADDLE_Y_OFFSET: 70,

  BULLET_TIME_SCALE: 0.3,
  BULLET_TIME_MS: 1000,

  CANNON_RATE_MS: 2600,
  CANNON_BULLET_SPEED: 420,
  LASER_BULLET_SPEED: 950,
  LASER_FIRE_MS: 200,

  MAX_BALLS: 30,
  MAX_BULLETS: 200,
  MAX_POWERS: 40,

  SCORE_BRICK: 10,
  SCORE_BLACKHOLE: 5,
  SCORE_ECHO: 10,
  SCORE_STUN_PENALTY: 10,

  EXPLODE_RADIUS: 170,
};

export const BRICK = {
  WIDTH: 92,
  HEIGHT: 34,
  GAP: 10,
  TOP_MARGIN: 150,
  WEIGHTS: {
    explode: 0.06,
    moving: 0.06,
    cannon: 0.05,
    boss: 0.04,
  },
  COLORS: {
    static: 0x7c4dff,
    moving: 0xff9a3d,
    explode: 0xffe23d,
    cannon: 0xff4dd2,
    boss: [0xff5a5a, 0xffa83d, 0xffe9c8],
  },
};

// Recompute the design resolution + all derived sizes from the real viewport.
export function computeLayout(winW, winH) {
  const aspect = (winW || 1280) / (winH || 800);
  const H = 1280;
  const W = Math.round(clampN(H * aspect, 560, 2200));

  GAME.WIDTH = W;
  GAME.HEIGHT = H;

  GAME.PADDLE_BASE_WIDTH = Math.round(W * 0.17);
  GAME.PADDLE_HEIGHT = Math.round(clampN(H * 0.02, 18, 28));
  GAME.PADDLE_Y_OFFSET = Math.round(H * 0.055);
  GAME.PADDLE_SPEED = Math.round(W * 1.15);

  GAME.BALL_RADIUS = Math.round(clampN(H * 0.0095, 9, 15));
  GAME.BALL_MIN_SPEED = Math.round(H * 0.42);
  GAME.BALL_MAX_SPEED = Math.round(H * 0.92);

  GAME.CANNON_BULLET_SPEED = Math.round(H * 0.34);
  GAME.LASER_BULLET_SPEED = Math.round(H * 0.74);
  GAME.EXPLODE_RADIUS = Math.round(H * 0.135);

  BRICK.WIDTH = Math.round(H * 0.066);
  BRICK.HEIGHT = Math.round(H * 0.028);
  BRICK.GAP = Math.round(H * 0.0075);
  BRICK.TOP_MARGIN = Math.round(H * 0.12);

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
