// Global, tunable game constants with a responsive LOGICAL layout.
// computeLayout() sets GAME.WIDTH/HEIGHT in CSS viewport pixels (game coordinates).
// Physical canvas pixels = logical size × devicePixelRatio (see LayoutManager).

const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const GAME = {
  WIDTH: 1280,
  HEIGHT: 800,

  STARTING_LIVES: 3,
  CONTINUES: 2,

  WALL_X: 30,
  /** Horizontal clamp for paddle (may be tighter than WALL_X when side HUD is in DOM). */
  PADDLE_INSET: 30,
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

  /** Homing / gravity steering — radial accel as fraction of ball speed per second (positive = toward target). */
  STEER_MISSILE_RADIAL: 0.58,
  STEER_GRAVITY_RADIAL: 0.62,
  STEER_GRAVITY_EXTRA_Y: 0.32,
  STEER_SWIRL_MISSILE: 6.2,
  STEER_SWIRL_GRAVITY: 3.4,
  STEER_SPEED_MIN: 0.62,
  STEER_SPEED_MAX: 1.75,
  ECHO_ORBIT_COUNT: 8,
  ECHO_ORBIT_SPEED: 9.5,
  /** Multiplier on ball radius for echo satellite orbit path. */
  ECHO_ORBIT_RADIUS: 3.4,
  /** Black hole pull radius (fraction of min screen dimension). */
  BLACK_HOLE_RADIUS: 0.34,

  PADDLE_BASE_WIDTH: 220,
  PADDLE_EXPAND_MULT: 1.35,
  PADDLE_SHRINK_MULT: 0.65,
  PADDLE_HEIGHT: 28,
  PADDLE_SPEED: 1500,
  PADDLE_Y_OFFSET: 78,
  /** 0–1 tablet paddle boost from computeLayout (short side ~680–1080px). */
  TABLET_BOOST: 0,
  IS_TABLET: false,

  BULLET_TIME_SCALE: 0.26,
  BULLET_TIME_MS: 780,
  BULLET_TIME_RAMP_MS: 90,
  HIT_STOP_MS: 48,

  LASER_BULLET_SPEED: 980,
  LASER_FIRE_MS: 95,
  /** Min ms between auto-fire shots per cannon type */
  CANNON_FIRE_MS: {
    laser: 380,
    fire: 620,
    ice: 520,
    shock: 480,
    napalm: 700,
  },
  POT_SPEED: 360,

  MAX_BALLS: 24,
  MAX_BALLS_MOBILE: 16,
  IS_PORTRAIT: false,
  /** Header + side meters rendered in React on /play (canvas = arena only). */
  USE_DOM_HUD: false,
  SAFE_TOP: 10,
  SAFE_BOTTOM: 0,
  SAFE_LEFT: 0,
  SAFE_RIGHT: 0,
  /** Y of playable floor (walls stop here; paddle sits above). */
  ARENA_FLOOR: 800,
  /** Reserved strip at bottom for paddle, ball, and touch targets. */
  PLAY_MARGIN_BOTTOM: 72,
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
  /** Brick capsule drop curve lives in utils/Helpers.js `dropChance(level)`. */
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
  /** Player-activated Nexus slow-mo — slower and longer than incidental bullet time. */
  BT_NEXUS_TIME_MS: 2800,
  BT_NEXUS_TIME_SCALE: 0.10,
  BT_NEXUS_INTENSITY_MIN: 1.2,
  BT_NEXUS_INTENSITY_MAX: 1.75,

  /** Cooldown after portal teleport — prevents ping-pong between linked bricks. */
  PORTAL_GRACE_MS: 220,

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
  /** Classic tile proportions (width : height). */
  WIDTH: 96,
  HEIGHT: 38,
  GAP: 10,
  DESIGN_RATIO: 96 / 38,
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
  /** Freeze + gnome taunt after the last ball is lost (before respawn). */
  BALL_LOSS_BEAT_MS: 1500,
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
  /** Logical height in CSS px — never clamp above the device (broke mobile FIT). */
  const H = Math.round(clampN(vh, 480, 1600));
  const W = Math.max(320, Math.round(H * aspect));

  // Logical game coordinates (CSS px). Rendering density is applied in LayoutManager.
  GAME.WIDTH = W;
  GAME.HEIGHT = H;

  const safe = insets ?? { top: 0, bottom: 0, left: 0, right: 0 };
  GAME.SAFE_TOP = Math.max(10, Math.round(safe.top || 0));
  GAME.SAFE_BOTTOM = Math.max(12, Math.round(safe.bottom || 0));
  GAME.SAFE_LEFT = Math.round(safe.left || 0);
  GAME.SAFE_RIGHT = Math.round(safe.right || 0);

  /** Slim edge overlays (12–16px) — drawn on top; do not shrink arena width. */
  GAME.UI_EDGE_W = Math.round(clampN(W * 0.036, 12, 16));
  /** When true, header + edge meters live in React DOM; canvas is playfield-only. */
  if (GAME.USE_DOM_HUD) {
    GAME.UI_HEADER_H = 0;
    GAME.UI_HEADER_GAP = Math.round(clampN(H * 0.008, 4, 8));
    GAME.UI_EDGE_W = 0;
    GAME.WALL_TOP = GAME.SAFE_TOP + GAME.UI_HEADER_GAP;
  } else {
    GAME.WALL_X = Math.round(clampN(W * 0.022, 14, 36));
    GAME.PADDLE_INSET = GAME.WALL_X;
    /** Compact top HUD (~6.5% H, clamped) — single stat row per wireframe. */
    GAME.UI_HEADER_H = Math.round(clampN(H * (isPortrait ? 0.065 : 0.07), 44, 58));
    /** Float gap between header island and playfield. */
    GAME.UI_HEADER_GAP = Math.round(clampN(H * 0.01, 6, 10));
    GAME.WALL_TOP = GAME.SAFE_TOP + GAME.UI_HEADER_H + GAME.UI_HEADER_GAP;
  }

  /** Bottom play strip — paddle, ball, launch hint (scales with screen height). */
  GAME.PLAY_MARGIN_BOTTOM = Math.round(
    H * (isPortrait ? 0.08 : 0.06) + GAME.SAFE_BOTTOM,
  );
  GAME.ARENA_FLOOR = H - GAME.PLAY_MARGIN_BOTTOM;
  if (GAME.ARENA_FLOOR < GAME.WALL_TOP + H * 0.45) {
    GAME.PLAY_MARGIN_BOTTOM = Math.round(
      H * (isPortrait ? 0.13 : 0.09) + GAME.SAFE_BOTTOM,
    );
    GAME.ARENA_FLOOR = H - GAME.PLAY_MARGIN_BOTTOM;
  }
  GAME.UI_PLAY_H = Math.max(64, GAME.ARENA_FLOOR - GAME.WALL_TOP);

  GAME.IS_PORTRAIT = isPortrait;

  /** 0 = large screens; ramps to 1 when short side ≤ 360px (phones, small windows). */
  const shortSide = Math.min(W, H);
  const compact = clampN((680 - shortSide) / 320, 0, 1);

  /** Tablets (short side ~680–1080px): modest paddle boost — separate from phone compact ramp. */
  const tablet = compact > 0 ? 0 : clampN(
    clampN((shortSide - 680) / 160, 0, 1) * clampN((1080 - shortSide) / 180, 0, 1),
    0,
    1,
  );
  GAME.TABLET_BOOST = tablet;
  GAME.IS_TABLET = tablet >= 0.35;

  /** Wide paddle on portrait; phones + tablets scale up on smaller viewports. */
  const paddleFrac = isPortrait
    ? 0.38 + compact * 0.10 + tablet * 0.08
    : 0.155 + compact * 0.10 + tablet * 0.07;
  const paddleMin = isPortrait
    ? Math.round(W * (0.34 + compact * 0.08 + tablet * 0.06))
    : Math.round(W * (0.12 + compact * 0.08 + tablet * 0.05));
  const paddleMax = isPortrait
    ? W * (0.62 + tablet * 0.05)
    : W * (0.48 + tablet * 0.05);
  GAME.PADDLE_BASE_WIDTH = Math.round(clampN(W * paddleFrac, paddleMin, paddleMax));
  GAME.PADDLE_HEIGHT = Math.round(clampN(
    H * ((isPortrait ? 0.026 : 0.022) + compact * 0.006),
    24,
    38,
  ));
  GAME.PADDLE_Y_OFFSET = Math.round(
    GAME.PLAY_MARGIN_BOTTOM * 0.58 + GAME.PADDLE_HEIGHT * 0.5,
  );
  /** Tie paddle speed to height so wide/narrow aspect changes don't skew feel */
  GAME.PADDLE_SPEED = Math.round(H * 0.88);

  GAME.BALL_RADIUS = Math.round(clampN(H * 0.0098, 9, 16));
  if (GAME.USE_DOM_HUD) {
    /** Rails live in React DOM — canvas edge is the play wall; ball needs radius clearance only. */
    GAME.WALL_X = Math.max(2, Math.round(GAME.BALL_RADIUS * 0.28));
    GAME.PADDLE_INSET = 0;
  } else if (GAME.WALL_X == null) {
    GAME.WALL_X = Math.round(clampN(W * 0.022, 14, 36));
    GAME.PADDLE_INSET = GAME.WALL_X;
  }
  GAME.BALL_MIN_SPEED = Math.round(H * 0.44);
  GAME.BALL_MAX_SPEED = Math.round(H * 0.95);

  GAME.LASER_BULLET_SPEED = Math.round(H * 0.76);
  GAME.POT_SPEED = Math.round(H * 0.28);
  GAME.POWERUP_FALL_SPEED = Math.round(H * 0.22);
  GAME.EXPLODE_RADIUS = Math.round(H * 0.12);
  JARDINAIN.GRAVITY = Math.round(H * 1.22);
  JARDINAIN.LAUNCH_SPEED = Math.round(H * 1.15);
  JARDINAIN.DISLODGE_SPEED = Math.round(H * 0.65);

  BRICK.GAP = Math.round(clampN(H * (isPortrait ? 0.0032 : 0.004), 3, 6));
  BRICK.HEIGHT = Math.round(clampN(H * (isPortrait ? 0.052 : 0.048), 32, 46));
  BRICK.WIDTH = Math.round(BRICK.HEIGHT * BRICK.DESIGN_RATIO);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--play-aspect-w', String(W));
    root.style.setProperty('--play-aspect-h', String(H));
  }

  return { W, H };
}

/** Left/right clamp for paddle — flush to playfield edges (bricks use playfieldSideInset). */
export function paddleSideInset() {
  if (GAME.USE_DOM_HUD) return 0;
  return GAME.PADDLE_INSET ?? GAME.WALL_X;
}

/** Ball side walls — match paddle travel so walls and paddle align. */
export function ballSideInset() {
  if (GAME.USE_DOM_HUD) return 0;
  return GAME.WALL_X;
}

/** Left/right inset for brick grid (aligned with paddle travel on DOM HUD). */
export function playfieldSideInset() {
  if (GAME.USE_DOM_HUD) return BRICK.GAP;
  return GAME.WALL_X + BRICK.GAP;
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
  MUSIC_VARIANT: 'nn_musicVariant',
  IMMERSIVE_HUD: 'nn_immersiveHud',
  REMOVE_ADS: 'nn_removeAds',
  STRIPE_REDEEMED: 'nn_stripeRedeemed',
  RUN: 'nn_run_v1',
  META: 'nn_meta_v1',
  SAVE_SCHEMA: 'nn_save_schema',
};

/** Default audio mix — SFX loud, music faint background bed. */
export const DEFAULT_SFX_VOLUME = 100;
export const DEFAULT_MUSIC_VOLUME = 3;

export const SCENES = {
  BOOT: 'Boot',
  PRELOAD: 'Preload',
  MENU: 'Menu',
  GAME: 'Game',
  UI: 'UIScene',
  /** @deprecated use SCENES.UI */
  HUD: 'UIScene',
  PAUSE: 'Pause',
  SETTINGS: 'Settings',
  GAMEOVER: 'GameOver',
  LEVEL_COMPLETE: 'LevelComplete',
  CODEX: 'Codex',
  SHOP: 'Shop',
  AD_BREAK: 'AdBreak',
  PURCHASE: 'Purchase',
};
