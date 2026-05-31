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
  /** Max deflection from vertical at paddle edges → ~30° from horizontal at rim. */
  MAX_BOUNCE_ANGLE: Math.PI / 3,
  /** Per-paddle-return speed gain (legacy had none; kept subtle for feel). */
  BOUNCE_SPEED_DELTA: 0.012,
  BALL_LEVEL_BASE_MULT: 1.04,

  PADDLE_BASE_WIDTH: 220,
  PADDLE_EXPAND_MULT: 1.35,
  PADDLE_SHRINK_MULT: 0.65,
  PADDLE_HEIGHT: 28,
  PADDLE_SPEED: 1500,
  PADDLE_Y_OFFSET: 78,

  BULLET_TIME_SCALE: 0.26,
  BULLET_TIME_MS: 780,
  BULLET_TIME_RAMP_MS: 90,
  HIT_STOP_MS: 48,

  LASER_BULLET_SPEED: 980,
  LASER_FIRE_MS: 95,
  POT_SPEED: 360,

  MAX_BALLS: 24,
  MAX_BALLS_MOBILE: 16,
  IS_PORTRAIT: false,
  SAFE_TOP: 10,
  SAFE_BOTTOM: 0,
  SAFE_LEFT: 0,
  SAFE_RIGHT: 0,
  MAX_BULLETS: 160,
  MAX_POWERS: 24,

  SCORE_BRICK: 50,
  SCORE_SILVER: 90,
  SCORE_EXPLODE_CHAIN: 30,
  SCORE_JARDINAIN: 250,
  JUGGLE_BASE: 250,
  JUGGLE_EXP: 1.55,
  JUGGLE_MAX_CHAIN: 7,
  JUGGLE_CONCURRENCY_CAP: 3,
  COMBO_MULT_STEP: 8,
  COMBO_MULT_MAX: 3,
  GNOME_DROP_CHANCE: 0.35,
  GNOME_DISLODGE_DROP_CHANCE: 0.55,
  /** Gnome streak meter — fills toward a 3-choice power draft */
  GNOME_STREAK_MAX: 100,
  /** Slow in-run trickle — main fill comes from level bonus. */
  GNOME_STREAK_JUGGLE: 2,
  GNOME_STREAK_KNOCKOUT: 5,
  GNOME_STREAK_LEVEL_BONUS: 24,
  /** Chance a silver/explosive/reinforced brick drops a capsule */
  BRICK_DROP_CHANCE_BASE: 0.05,
  BRICK_DROP_CHANCE_MAX: 0.12,
  POWERUP_FALL_SPEED: 280,
  SCORE_STUN_PENALTY: 60,
  SCORE_LEVEL_CLEAR: 1000,
  PADDLE_STUN_MS: 380,

  STUCK_LOOP_MS: 3800,
  STUCK_ANGLE_NUDGE: 0.12,
  /** Max px span for orbit detection around a brick */
  STUCK_ORBIT_SPAN: 48,
  STUCK_ORBIT_MS: 2400,
  ANCHOR_WIDTH_PENALTY: 0.85,
  POT_STUN_MS: 620,
  PHONE_SCRAMBLE_MS: 3000,

  EXPLODE_RADIUS: 150,
  BOSS_EVERY: 5,

  /** Player-controlled bullet-time meter */
  BT_METER_MAX: 100,
  BT_METER_COMBO_FILL: 1,
  BT_METER_KNOCKOUT_FILL: 4,
  BT_METER_NEAR_MISS_FILL: 2,
  BT_METER_LEVEL_FILL: 20,
  /** Minimum meter to activate partial slow-mo (spends entire meter). */
  BT_METER_SPEND: 25,
  BT_METER_BURST_COST: 100,

  /** Combo bank / gambit */
  COMBO_BANK_STEP: 8,
  COMBO_BANK_PAYOUT: 120,
  COMBO_GAMBIT_MIN: 8,
  GNOME_COMBO_MULT: 1.25,

  /** Cursed capsule auto-applies after this many ms on field */
  CURSE_AUTO_MS: 5000,

  /** 3-star thresholds */
  STAR_PAR_TIME_BASE: 90,
  STAR_PAR_TIME_PER_LEVEL: 8,
};

export const BRICK = {
  WIDTH: 96,
  HEIGHT: 38,
  GAP: 10,
  HP: { normal: 1, silver: 2, gold: Infinity, steel: Infinity, explosive: 1, nest: 1, boss: 3, reinforced: 2, invisible: 1, portal: 1, shifting: 1, mirror: 1, moss: 2, beehive: 1, seedpod: 1, linked: 1, hostage: 1 },
};

export const JARDINAIN = {
  THROW_MIN_MS: 2600,
  THROW_MAX_MS: 5200,
  GRAVITY: 980,
  LAUNCH_SPEED: 920,
  DISLODGE_SPEED: 520,
  MAX_ALIVE: 6,
  SIZE: 26,
  TAUNT_MS: 1400,
  ROPE_CLIMB_MS: 900,
  /** Min ms between ball hits on same gnome */
  JUGGLE_HIT_COOLDOWN_MS: 300,
  /** Juggles before gnome pops into a power-up */
  KNOCKOUT_JUGGLES: 3,
  /** Force floor taunt if airborne this long */
  MAX_AIRBORNE_MS: 7500,
  /** Ms between random pop-up spawns during play */
  POPUP_MIN_MS: 2800,
  POPUP_MAX_MS: 6200,
  /** Rise-out-of-brick animation length */
  POPUP_ANIM_MS: 520,
  /** Delay after pop-up before first pot throw */
  POST_POP_THROW_MIN_MS: 700,
  POST_POP_THROW_MAX_MS: 1600,
};

export function computeLayout(winW, winH, insets) {
  const vw = Math.max(1, winW || 1280);
  const vh = Math.max(1, winH || 800);
  const aspect = vw / vh;
  const isPortrait = aspect < 0.82;
  /** Match logical canvas to viewport so Scale.FIT fills the screen with no letterboxing. */
  const H = Math.round(clampN(vh, 680, 1600));
  const W = Math.round(H * aspect);

  GAME.WIDTH = W;
  GAME.HEIGHT = H;

  const safe = insets ?? { top: 0, bottom: 0, left: 0, right: 0 };
  GAME.SAFE_TOP = Math.max(8, Math.round(safe.top || 0));
  GAME.SAFE_BOTTOM = Math.max(8, Math.round(safe.bottom || 0));
  GAME.SAFE_LEFT = Math.round(safe.left || 0);
  GAME.SAFE_RIGHT = Math.round(safe.right || 0);

  GAME.WALL_X = Math.round(clampN(W * 0.022, 14, 36));
  GAME.WALL_TOP = Math.round(H * (isPortrait ? 0.085 : 0.11)) + GAME.SAFE_TOP;

  GAME.IS_PORTRAIT = isPortrait;
  /** Portrait phones — wide paddle for thumb control. */
  const paddleFrac = isPortrait ? 0.38 : 0.155;
  const paddleMin = isPortrait ? Math.round(W * 0.34) : Math.round(W * 0.12);
  const paddleMax = isPortrait ? W * 0.58 : W * 0.42;
  GAME.PADDLE_BASE_WIDTH = Math.round(clampN(W * paddleFrac, paddleMin, paddleMax));
  GAME.PADDLE_HEIGHT = Math.round(clampN(H * (isPortrait ? 0.026 : 0.022), 22, 34));
  GAME.PADDLE_Y_OFFSET = Math.round(H * (isPortrait ? 0.042 : 0.048)) + GAME.SAFE_BOTTOM;
  /** Tie paddle speed to height so wide/narrow aspect changes don't skew feel */
  GAME.PADDLE_SPEED = Math.round(H * 0.88);

  GAME.BALL_RADIUS = Math.round(clampN(H * 0.0098, 9, 16));
  GAME.BALL_MIN_SPEED = Math.round(H * 0.44);
  GAME.BALL_MAX_SPEED = Math.round(H * 0.95);

  GAME.LASER_BULLET_SPEED = Math.round(H * 0.76);
  GAME.POT_SPEED = Math.round(H * 0.28);
  GAME.POWERUP_FALL_SPEED = Math.round(H * 0.22);
  GAME.EXPLODE_RADIUS = Math.round(H * 0.12);
  JARDINAIN.GRAVITY = Math.round(H * 1.22);
  JARDINAIN.LAUNCH_SPEED = Math.round(H * 1.15);
  JARDINAIN.DISLODGE_SPEED = Math.round(H * 0.65);

  BRICK.WIDTH = Math.round(H * (isPortrait ? 0.068 : 0.07));
  BRICK.HEIGHT = Math.round(H * (isPortrait ? 0.026 : 0.03));
  BRICK.GAP = Math.round(H * (isPortrait ? 0.0055 : 0.008));

  return { W, H };
}

export const STORAGE = {
  SOUND: 'nn_sound',
  MUSIC: 'nn_music',
  BULLET_TIME: 'nn_bulletTime',
  FLASH_TEXT: 'nn_flashText',
  PARTICLES: 'nn_particles',
  HIGH_SCORE: 'nn_highScore',
  SFX_VOLUME: 'nn_sfxVol',
  MUSIC_VOLUME: 'nn_musicVol',
  SCANLINES: 'nn_scanlines',
  REDUCED_FX: 'nn_reducedFx',
  HAPTICS: 'nn_haptics',
  VFX_QUALITY: 'nn_vfxQuality',
  IMMERSIVE_HUD: 'nn_immersiveHud',
  REMOVE_ADS: 'nn_removeAds',
  RUN: 'nn_run_v1',
  META: 'nn_meta_v1',
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
  CODEX: 'Codex',
  SHOP: 'Shop',
  AD_BREAK: 'AdBreak',
};
