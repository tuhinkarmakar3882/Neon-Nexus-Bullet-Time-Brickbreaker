// Global, tunable game constants. All gameplay numbers live here so balancing
// is a single-file concern.

export const GAME = {
  // Logical design resolution. Phaser Scale.FIT letterboxes this to any device,
  // so gameplay maths is resolution-independent (fixes the legacy screen-size
  // speed coupling bug).
  WIDTH: 960,
  HEIGHT: 1280,
  BG_TOP: 0x05060a,
  BG_BOTTOM: 0x0c1230,

  STARTING_LIVES: 3,
  CONTINUES: 3,

  // Ball speed in logical px/sec.
  BALL_MIN_SPEED: 480,
  BALL_MAX_SPEED: 1180,
  BALL_RADIUS: 12,
  // Guarantees the ball never gets trapped in a near-horizontal loop.
  BALL_MIN_VERTICAL_RATIO: 0.22,
  MAX_BOUNCE_ANGLE: Math.PI / 3, // 60deg

  PADDLE_BASE_WIDTH: 190,
  PADDLE_HEIGHT: 26,
  PADDLE_SPEED: 1100, // px/sec for keyboard control
  PADDLE_Y_OFFSET: 80, // distance from bottom

  // Bullet-time
  BULLET_TIME_SCALE: 0.28,
  BULLET_TIME_MS: 1100,

  // Cannon brick fire
  CANNON_RATE_MS: 2600,
  CANNON_BULLET_SPEED: 420,
  LASER_BULLET_SPEED: 900,
  LASER_FIRE_MS: 220,

  // Caps
  MAX_BALLS: 24,
  MAX_BULLETS: 160,
  MAX_POWERS: 40,

  // Scoring
  SCORE_BRICK: 10,
  SCORE_BLACKHOLE: 5,
  SCORE_ECHO: 10,
  SCORE_STUN_PENALTY: 10,

  // Explosion splash radius (logical px)
  EXPLODE_RADIUS: 150,
};

export const BRICK = {
  WIDTH: 84,
  HEIGHT: 34,
  GAP: 8,
  TOP_MARGIN: 150,
  // Spawn probability weights (cumulative thresholds against Math.random()).
  WEIGHTS: {
    explode: 0.06,
    moving: 0.06,
    cannon: 0.05,
    boss: 0.04,
    // remainder => static
  },
  COLORS: {
    static: 0x9a4dff,
    moving: 0xff9a3d,
    explode: 0xffe23d,
    cannon: 0xc24dff,
    boss: [0xff5a5a, 0xffa83d, 0xffe9c8], // index by (hp-1)
  },
};

// localStorage keys
export const STORAGE = {
  SOUND: 'nn_sound',
  BULLET_TIME: 'nn_bulletTime',
  FLASH_TEXT: 'nn_flashText',
  PARTICLES: 'nn_particles',
  HIGH_SCORE: 'nn_highScore',
};

// Scene keys
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
