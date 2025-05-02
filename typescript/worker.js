self.importScripts('../vendor/noise.js')

const GAME_EVENTS = {
  INIT: 'INIT',
  READY: 'INIT',

  /* Render Requests to DOM */
  BUILD_SIDE_BAR: 'BUILD_SIDE_BAR',

  /* Setting Menu */
  SHOW_SETTINGS_MENU: 'SHOW_SETTINGS_MENU',
  UPDATE_SOUND_PREFERENCES: 'UPDATE_SOUND_PREFERENCES',
  SET_GAME_BACKGROUND_MUSIC: 'SET_GAME_BACKGROUND_MUSIC',
  UPDATE_SLOW_MO_PREFERENCES: 'UPDATE_SLOW_MO_PREFERENCES',
  UPDATE_FLASH_TEXT_PREFERENCES: 'UPDATE_FLASH_TEXT_PREFERENCES',
  HIDE_SETTINGS_MENU: 'HIDE_SETTINGS_MENU',

  /* Level Complete Screen Controls */
  SHOW_LEVEL_COMPLETE_MODAL: 'SHOW_LEVEL_COMPLETE_MODAL',
  HIDE_LEVEL_COMPLETE_MODAL: 'HIDE_LEVEL_COMPLETE_MODAL',

  /* GameOver Screen Controls */
  SHOW_GAME_OVER_MENU: 'SHOW_GAME_OVER_MENU',
  HIDE_GAME_OVER_MENU: 'HIDE_GAME_OVER_MENU',
  CONTINUE_GAME: 'CONTINUE_GAME',

  /* Pause Screen Controls */
  SHOW_PAUSE_MENU: 'SHOW_PAUSE_MENU',
  HIDE_PAUSE_MENU: 'HIDE_PAUSE_MENU',

  SET_POINTER_LOCK: 'SET_POINTER_LOCK',
  RESET_POINTER_LOCK: 'RESET_POINTER_LOCK',

  RESTART_GAME_FROM_BEGINNING: 'RESTART_GAME_FROM_BEGINNING',

  SYNC_HUD: 'SYNC_HUD',
  SYNC_SIDE_BAR: 'SYNC_SIDE_BAR',

  SET_SHAKE: 'SET_SHAKE',
  REMOVE_SHAKE: 'REMOVE_SHAKE',

  SET_HIT: 'SET_HIT',
  REMOVE_HIT: 'REMOVE_HIT',

  SHOW_FLASH_TEXT: 'SHOW_FLASH_TEXT',
  HIDE_FLASH_TEXT: 'HIDE_FLASH_TEXT',

  MOUSE_MOVE: 'MOUSE_MOVE',
  CLICK_ON_CANVAS: 'CLICK_ON_CANVAS',
  FLIP_POWER_UP: 'FLIP_POWER_UP',

  TOUCH_MOVE: 'TOUCH_MOVE',
  SHOW_LEVEL_COMPLETE_MODAL: 'SHOW_LEVEL_COMPLETE_MODAL'

}

const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

let gameCanvas, gameCanvasContext, game, isMobile, screenHeight;

onmessage = ({data}) => {
  switch (data.type) {
    case GAME_EVENTS.INIT: {
      flash('Loading...')

      isMobile = data.payload.isMobile;

      gameCanvas = data.payload.canvas;
      gameCanvas.width = data.payload.width;
      gameCanvas.height = data.payload.height;

      screenHeight = data.payload.screenHeight;

      CFG.MAX_SPEED = calculateSpeedBasedOnScreenSize(6, 8)
      CFG.MIN_SPEED = calculateSpeedBasedOnScreenSize(1, 2.5)

      gameCanvasContext = gameCanvas.getContext('2d');

      gameCanvasContext.font = '14px monospace';
      POWERS.forEach(k => textWidths[k] = gameCanvasContext.measureText(k).width);

      game = new Game(gameCanvasContext, data.payload.width, data.payload.height);
      postMessage({
        type: GAME_EVENTS.READY,
      })
      game.loadStoredPreferences(data.payload.config);

      game.startLoop();
      break;
    }

    case GAME_EVENTS.MOUSE_MOVE: {
      if (!game) return
      game.updatePaddlePosition(data.payload)

      break;
    }

    case GAME_EVENTS.TOUCH_MOVE: {
      if (!game) return
      game.updatePaddlePositionForTouchSystems(data.payload)

      break;
    }

    case GAME_EVENTS.CLICK_ON_CANVAS: {
      game.releaseBalls(data.payload)
      break;
    }

    case GAME_EVENTS.HIDE_SETTINGS_MENU: {
      if (!game) return;

      game.hideSettingsMenu(data.payload)
      break
    }

    case GAME_EVENTS.SHOW_SETTINGS_MENU: {
      if (!game) return;

      game.showSettingsMenu()
      break
    }

    case GAME_EVENTS.HIDE_PAUSE_MENU: {
      if (!game) return;

      game.resumeGameplay()
      break
    }

    case GAME_EVENTS.SHOW_PAUSE_MENU: {
      if (!game) return;

      game.pauseGameplay()
      break
    }

    case GAME_EVENTS.CONTINUE_GAME: {
      if (!game) return;

      game.continueGame()
      break
    }

    case GAME_EVENTS.RESTART_GAME_FROM_BEGINNING: {
      if (!game) return;

      game.restartGame()
      break
    }

    case GAME_EVENTS.RESIZE: {
      resize({
        height: data.payload.height,
        width: data.payload.width,
      })
    }
  }
}


/* ---------- Utilities ---------- */

function calculateSpeedBasedOnScreenSize(minSpeed, maxSpeed) {
  const minHeight = 400;
  const maxHeight = 1080;

  // Clamp the height
  const clampedHeight = Math.max(minHeight, Math.min(maxHeight, screenHeight));

  // Ratio between 0 and 1
  const ratio = (clampedHeight - minHeight) / (maxHeight - minHeight);

  // Exponential mapping
  return minSpeed * Math.pow((maxSpeed / minSpeed), ratio);
}

function resize({height, width}) {
  gameCanvas.width = width;
  gameCanvas.height = height;
}

function getProbability(level, min = 0.1, max = 0.7, rate = 0.1) {
  const raw = max * Math.exp(-rate * level);
  return Math.max(min, raw);
}

function getDecreasingProbability(level) {
  const min = 0.01;
  const max = 1;
  const rate = 0.3; // adjust this for faster/slower growth

  const prob = max - (max - min) * (1 - Math.exp(-rate * level));
  return Math.max(min, prob);
}

function getDt() {
  const now = performance.now();
  // raw frames (16 ms ⇒ 1 unit), cap at 4 frames
  const raw = Math.min((now - last) / 16, 4);
  last = now;
  return raw * timeScale;
}

/************ CONFIG & HELPERS ************/
const textWidths = {}
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60°

const CFG = {
  COLS: 14,
  MAX_ROWS: 8,
  MAX_SPEED: undefined,
  MIN_SPEED: undefined,
  DUR: {
    blackhole: 4000,
    bullet: 1200,
    burst: 5000,
    chargeshot: 15000,
    chill: 15000,
    echo: 8000,
    expand: 10000,
    flip: 7000,
    freeze: 10000,
    glue: 15000,
    gravity: 5000,
    joker: 10000,
    laser: 7000,
    magnet: 9000,
    missile: 7000,
    reduce: 10000,
    reverse: 5000,
    shield: 15000,
    stun: 800,
    teleport: 8000,
    velocity: 10000,
    wrap: 15000,
    squeeze: 5000,
    shuffle: 5000,
  },
  CANNON: {RATE: 2500, SPD: 5},
// Neon-themed color palette for all power-ups
//   COLORS :{
//     BlackHole:   '#D50000', // intense neon red
//     Burst:       '#FF00FF', // vibrant magenta
//     ChargeShot:  '#FFD700', // electric gold
//     Chill:       '#00FFFF', // bright cyan
//     Echo:        '#F8F8FF', // cool neon white
//     Expand:      '#40C4FF', // luminous sky blue
//     Flip:        '#D500F9', // neon purple
//     Freeze:      '#18FFFF', // icy neon teal
//     Glue:        '#00E676', // vivid mint green
//     Gravity:     '#AA00FF', // deep violet
//     Heart:       '#FF80AB', // soft neon pink
//     Joker:       '#69F0AE', // neon spring green
//     Laser:       '#FF1744', // hot neon red
//     Magnet:      '#FFD600', // bright neon yellow
//     Missile:     '#FF6D00', // blazing neon orange
//     Reduce:      '#7C4DFF', // rich neon indigo
//     Reverse:     '#FF4081', // punchy neon rose
//     Shield:      '#FFFFFF', // pure neon white
//     Teleport:    '#84FFFF', // glowing aqua
//     Velocity:    '#2979FF', // royal neon blue
//     Wrap:        '#FFFF33', // neon lemon
//     Squeeze:     '#F50057', // bold neon fuchsia
//     Shuffle:     '#00B8D4'  // electric neon cerulean
//   },

  COLORS: {
    // ─────── Offensive ───────
    BlackHole: '#FF0000', // Intense Neon Red
    Burst: '#FF00FF', // Electric Neon Fuchsia
    ChargeShot: '#FFC300', // Bold Neon Yellow
    Missile: '#FF5733', // Vivid Neon Orange
    Laser: '#FF0066', // Hot Neon Pink

    // ─────── Defensive ───────
    Shield: '#DDDDFF', // Soft Neon Lavender
    Freeze: '#00FFFF', // Bright Neon Cyan
    Reverse: '#FF0055', // Vivid Neon Rose
    Flip: '#FF007F', // Neon Magenta

    // ─────── Utility ───────
    Gravity: '#AA00FF',      // Electric Violet
    Magnet: '#FFFF00',      // Pure Neon Yellow
    Chill: '#00FFAA',      // Mint Neon Green
    Echo: '#E0E0FF',      // Light Neon Lavender
    Expand: '#0099FF',      // Bright Electric Blue
    Glue: '#FFD700',      // Neon Gold
    Teleport: '#00FFF0',      // Neon Aqua
    Velocity: '#007FFF',      // Electric Neon Blue
    Wrap: '#FFFF33',      // Neon Lemon
    Reduce: '#FF00AA',      // Punchy Neon Magenta
    Squeeze: '#FF4500',      // Neon Orange-Red

    // ─── Support & Special ───
    Heart: '#55FF55',      // Neon Spring Green
    Joker: '#00FF00'       // Electric Neon Green
  },
  PADDLE: {
    defaultColor: 'white',
  },
  BALL: {
    defaultColor: 'white',
    teleportColor: '#72F2EB',
    chargedColor: '#FFAC33'
  }
};
const POWERS = Object.keys(CFG.COLORS);
const MAX_PARTICLES = 150;
const MAX_RIPPLES = 5;


const keys = {L: false, R: false};

const noise = new Noise()


let timeScale = 1;
let isBulletTime = false;
let last = performance.now();

let ripples = []; // Store multiple ripples

let flashTimer;

let lastScore, lastLives, lastLevel, lastRemain, lastActivePowersMap;

function flash(text, color = '#00ffc3') {
  postMessage({
    type: GAME_EVENTS.SHOW_FLASH_TEXT,
    payload: {
      textContent: text,
      color,
      textShadow: `0 0 4px ${color}`,
      opacity: 1,
    }
  })

  flashTimer = setTimeout(() => {
    postMessage({
      type: GAME_EVENTS.HIDE_FLASH_TEXT,
      payload: {}
    })
  }, 800);
}

function drawShockwave(x, y, radius) {
  const maxRadius = 100;
  const opacity = 1 - radius / maxRadius;
  const hueValue = 50;

  gameCanvasContext.beginPath();
  gameCanvasContext.arc(x, y, radius, 0, Math.PI * 2);
  gameCanvasContext.strokeStyle = `hsla(${hueValue}, 100%, 50%, ${opacity})`;
  gameCanvasContext.lineWidth = 3 + 2 * opacity;
  gameCanvasContext.stroke();

  if (radius > 20) {
    gameCanvasContext.beginPath();
    gameCanvasContext.arc(x, y, radius * 0.7, 0, Math.PI * 2);
    gameCanvasContext.strokeStyle = `hsla(${hueValue}, 100%, 40%, ${opacity * 0.5})`;
    gameCanvasContext.lineWidth = 2;
    gameCanvasContext.setLineDash([5, 10]);
    gameCanvasContext.stroke();
    gameCanvasContext.setLineDash([]);
  }

  if (radius > 50) {
    gameCanvasContext.beginPath();
    gameCanvasContext.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    gameCanvasContext.strokeStyle = `hsla(${hueValue}, 100%, 30%, ${opacity * 0.35})`;
    gameCanvasContext.lineWidth = 2;
    gameCanvasContext.setLineDash([10, 15]);
    gameCanvasContext.stroke();
    gameCanvasContext.setLineDash([]);
  }
}

function triggerRippleEffect(x, y) {
  ripples.push({x, y, radius: 0});
}

function bulletTime() {
  if (isBulletTime) return;

  timeScale = 0.25;
  isBulletTime = true;

  setTimeout(() => {
    timeScale = 1;
    isBulletTime = false;
  }, CFG.DUR.bullet);
}

/************ ENTITY BASE ************/
class Ent {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  update() {
  }

  draw() {
  }
}

/************ PADDLE ************/
class Paddle extends Ent {
  constructor() {
    super();
    this.baseW = 120;
    this.w = this.baseW;
    this.h = 18;
    this.speed = 9;
    this.sticky = false;
    this.magnet = false;
    this.stun = 0;
    this.isReversed = false;
    this.reset();
  }

  reset() {
    this.w = this.baseW;
    this.x = (gameCanvas.width - this.w) / 2;
    this.y = gameCanvas.height - 34;
    this.sticky = false;
    this.magnet = false;
    this.isReversed = false;
  }

  update(keys, mouseX) {
    const direction = this.isReversed ? -1 : 1;

    if (this.stun > 0) {
      this.stun--;
      return;
    }

    if (!keys) {
      this.x = this.isReversed ? (gameCanvas.width - this.w) - mouseX : mouseX;
      return;
    }

    if (keys.L) this.x -= this.speed * timeScale * direction;
    if (keys.R) this.x += this.speed * timeScale * direction;

    this.x = clamp(this.x, 0, gameCanvas.width - this.w);
  }

  draw() {
    gameCanvasContext.save();
    gameCanvasContext.shadowBlur = 4;
    gameCanvasContext.shadowColor = CFG.COLORS.defaultColor;
    gameCanvasContext.fillStyle = this.stun ? '#5a5a5a' : CFG.PADDLE.defaultColor;
    gameCanvasContext.fillRect(this.x, this.y, this.w, this.h);
    gameCanvasContext.restore();
  }
}

/************ BALL ************/
class Ball extends Ent {
  constructor(paddle) {
    super();
    this.r = 8;
    this.paddle = paddle;
    this.baseSp = CFG.MIN_SPEED;
    this.sp = this.baseSp * 1.2;
    this.vx = 0;
    this.vy = 0;
    this.stuck = true;
    this.stuckOffsetX = this.paddle.w / 2;    // ← record where on paddle it stuck
    this.x = this.paddle.x + this.paddle.w / 2;
    this.y = this.paddle.y - this.r;
  }

  release() {
    if (!this.stuck) return;

    this.stuckOffsetX = 0;  // ← clear the saved offset

    // 1. Compute relative offset
    const relX = (this.x - this.paddle.x) - this.paddle.w / 2;

    // 2. Normalize to [-1,1]
    const norm = relX / (this.paddle.w / 2);

    // 3. Compute bounce angle
    const angle = norm * MAX_BOUNCE_ANGLE;

    // 4. Set new velocity
    this.vx = this.sp * Math.sin(angle);
    this.vy = -this.sp * Math.cos(angle);

    this.stuck = false;

  }

  update(game) {
    this.chargeReady = game.chargeReady
    this.isTeleportAvailable = game.active.has('Teleport')
    /* follow paddle until release */
    if (this.stuck) {
      this.x = this.paddle.x + this.stuckOffsetX;
      this.y = this.paddle.y - this.r;
      return;
    }

    /* motion */
    this.x += this.vx * timeScale;
    this.y += this.vy * timeScale;

    /* SIDE‐WALL HANDLING */
    if (game.active.has('Wrap')) {
      // Pac‑Man style wrap
      if (this.x < -this.r) this.x = gameCanvas.width + this.r;
      else if (this.x > gameCanvas.width + this.r) this.x = -this.r;
    } else {
      // Standard bounce + clamp
      if (this.x <= this.r) {
        this.x = this.r;
        this.vx *= -1;
      } else if (this.x >= gameCanvas.width - this.r) {
        this.x = gameCanvas.width - this.r;
        this.vx *= -1;
      }
    }

    /* TOP WALL */
    if (this.y < this.r) {
      this.y = this.r;
      this.vy *= -1;
    }

    /* SHIELD BOUNCE */
    if (game.active.has('Shield') && this.y + this.r > gameCanvas.height - 6) {
      this.vy = -Math.abs(this.vy);
      game.clear('Shield');
    }

    /* BOTTOM → LOSE BALL */
    if (this.y > gameCanvas.height + this.r) {
      game.ballLost(this);
      return;
    }

    /* BOOMERANG CURVE */
    if (this.missile && !game._frameThrottle) {
      const ang = Math.atan2(
        game.paddle.y - this.y,
        game.paddle.x + game.paddle.w / 2 - this.x
      );
      const strength = -0.075;  // higher arc
      this.vx += Math.cos(ang) * strength;
      this.vy += Math.sin(ang) * strength;
    }

    if (this.gravity && !game._frameThrottle) {
      const ang = Math.atan2(
        game.paddle.y - this.y,
        game.paddle.x + game.paddle.w / 2 - this.x
      );
      const strength = 0.075;  // higher arc
      this.vx += Math.cos(ang) * strength;
      this.vy += Math.sin(ang) * strength;
    }
  }

  getBallColor() {
    if (this.chargeReady) return CFG.BALL.chargedColor
    if (this.isTeleportAvailable) return CFG.BALL.teleportColor

    return CFG.BALL.defaultColor
  }

  draw() {
    gameCanvasContext.save();
    gameCanvasContext.shadowBlur = 15;
    gameCanvasContext.shadowColor = this.getBallColor();
    gameCanvasContext.fillStyle = this.getBallColor();
    gameCanvasContext.beginPath();
    gameCanvasContext.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    gameCanvasContext.fill();
    gameCanvasContext.restore();
  }
}

/************ BRICK ************/
class Brick extends Ent {
  constructor(x, y, w, h, type, level) {
    super(x, y);
    this.w = w;
    this.h = h;
    this.type = type;
    this.hp = type === 'boss' ? 3 : 1;
    this.baseX = x;
    this.timer = rand(0, CFG.CANNON.RATE * getDecreasingProbability(level));
    this.alive = true;
  }

  update(dt, game) {
    if (!this.alive) return;

    if (this.type === 'moving') {
      this.x = this.baseX + Math.sin(Date.now() / 600) * 50;
    }

    if (this.type === 'cannon') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = CFG.CANNON.RATE * getDecreasingProbability(game.level);
        game.spawnBullet(this.x + this.w / 2, this.y + this.h, CFG.CANNON.SPD, 'enemy');
      }
    }
  }

  draw() {
    if (!this.alive) return;
    const pal = {
      static: 'rgba(179,86,255,0.42)',
      moving: 'hsl(30,100%,63%)',
      explode: 'hsl(60,100%,50%)',
      cannon: 'hsl(284,100%,63%)',
      boss: ['#ffebd8', '#f90', '#f44'][this.hp - 1]
    };
    gameCanvasContext.fillStyle = pal[this.type] || pal.static;
    gameCanvasContext.fillRect(this.x, this.y, this.w, this.h);
  }
}

/************ BULLET (PLAYER + ENEMY) ************/
class Bullet extends Ent {
  constructor(x, y, vy, owner) {
    super(x, y);
    this.vy = vy;
    this.owner = owner; // 'player' | 'enemy'
  }

  update(game) {
    this.y += this.vy * timeScale;
  }

  draw() {
    gameCanvasContext.fillStyle = this.owner === 'player' ? '#ff3131' : '#ffa600';
    gameCanvasContext.fillRect(this.x - 2, this.y, 4, 10);
  }
}

/************ POWER‑UP CAPSULE ************/
class Power extends Ent {
  constructor(x, y, key) {
    super(x, y);
    this.key = key;
    this.sz = 20;
    this.dead = false;
  }

  paddleLeft() {
    return game.paddle.x;
  }

  paddleRight() {
    return game.paddle.x + game.paddle.w;
  }

  update() {
    this.y += (2 * timeScale);

    /* magnet attraction */
    if (game.paddle.magnet) {
      const tx = game.paddle.x + game.paddle.w / 2;
      const ty = game.paddle.y;
      this.x += (tx - this.x) * 0.07 * timeScale;
      this.y += (ty - this.y) * 0.07 * timeScale;
    }

    /* out of bounds */
    if (this.y > gameCanvas.height) this.dead = true;

    /* pickup */
    if (
      this.x < this.paddleRight() &&
      this.x + this.sz > this.paddleLeft() &&
      this.y + this.sz > game.paddle.y
    ) {
      this.dead = true;
      game.applyPower(this.key);
    }
  }

  draw() {
    const text = this.key;
    const textWidth = textWidths[text]

    gameCanvasContext.font = '14px monospace';
    gameCanvasContext.fillStyle = CFG.COLORS[this.key];
    this.sz = 20;

    gameCanvasContext.fillRect(this.x, this.y, textWidth + 10, this.sz);

    this.sz = textWidth
    gameCanvasContext.fillStyle = '#000';
    gameCanvasContext.fillText(this.key, this.x + 5, this.y + 15);
  }
}

/************ PARTICLE ************/
class Particle extends Ent {
  constructor(x, y, color) {
    super(x, y);
    this.vx = rand(-2, 2);
    this.vy = rand(-2, 2);
    this.life = 100;
    this.col = color;
  }

  update() {
    this.x += this.vx * timeScale;
    this.y += this.vy * timeScale;
    this.life--;
  }

  draw() {
    gameCanvasContext.globalAlpha = this.life / 40;
    gameCanvasContext.fillStyle = this.col;
    gameCanvasContext.fillRect(this.x, this.y, 3, 3);
    gameCanvasContext.globalAlpha = 1;
  }
}

/************ MAIN GAME CLASS ************/
class Game {
  constructor(gameCanvasContext, width, height) {
    this.canvas = gameCanvasContext;
    this.width = width;
    this.height = height;

    /* basic state */
    this.score = 0;
    this.lives = 3;
    this.canContinue = 3;
    this.level = 1;

    this.active = new Map(); // key -> expires timestamp

    this.paddle = new Paddle();
    this.balls = [new Ball(this.paddle)];
    this.bricks = [];
    this.powers = [];
    this.parts = [];
    this.bullets = [];
    this._frameCount = 0;  // initialize frame counter
    this._frameThrottle = 0;
    this.paused = false

    this.buildSidebar()
    this.buildLevel();

    this.startLoop();

    this.paddleX = (gameCanvas.width - this.paddle.w) / 2;
  }

  releaseBalls() {
    this.balls.forEach(b => b.release())
  }

  updatePaddlePosition({x, y}) {
    this.paddleX += x;

    // Clamp within canvas bounds
    if (this.paddleX < 0) {
      this.paddleX = 0;
    }
    if (this.paddleX > gameCanvas.width - this.paddle.w) {
      this.paddleX = gameCanvas.width - this.paddle.w;
    }
    // const r = cvs.getBoundingClientRect();
    this.paddle.update(null, this.paddleX || 0);
  }

  updatePaddlePositionForTouchSystems({x}) {
    this.paddle.update(null, (x - this.paddle.w / 2) || 0);
  }

  loadStoredPreferences(config) {
    this.isSoundEnabled = config.isSoundEnabled;
    this.isBulletTimeEnabled = config.isBulletTimeEnabled;
    this.isFlashTextEnabled = config.isFlashTextEnabled;
  }

  buildSidebar() {
    postMessage({
      type: GAME_EVENTS.BUILD_SIDE_BAR,
      payload: {
        powers: POWERS,
        config: CFG,
      }
    })
  }

  showSettingsMenu() {
    this.paused = true;
  }

  hideSettingsMenu(config) {
    this.paused = false;

    this.isAudioMuted = !config.isSoundEnabled
    this.isBulletTimeEnabled = config.isBulletTimeEnabled
    this.isFlashTextEnabled = config.isFlashTextEnabled

    this.startLoop();

  }

  resumeGameplay() {
    this.paused = false;

    this.startLoop();
  }

  pauseGameplay() {
    this.paused = true;
    pausedContainer.classList.add('show');
  }

  _applyLevelSound() {
    postMessage({
      type: GAME_EVENTS.SET_GAME_BACKGROUND_MUSIC,
      payload: {
        src: LevelSounds.sort(() => Math.random() > 0.5 ? -1 : 1)[this.level % LevelSounds.length]
      }
    })
  }

  buildLevel() {
    const layouts = [
      'procedural',
      'grid',
      'circle',
      'diamond',
      'tunnel',
      'wave',
      'perlin'
    ];
    const levelType = layouts[(Math.random() * 100) % layouts.length];
    this._buildLevel(levelType);
    this._applyLevelSound()
  }

  _placeBrick(x, y, w, h) {
    const p = Math.random();
    let type = 'static';
    if (p < 0.05) type = 'explode';
    else if (p < 0.10) type = 'moving';
    else if (p < 0.15) type = 'cannon';
    else if (p < 0.20) type = 'boss';
    this.bricks.push(new Brick(x, y, w, h, type, this.level));
  }

  _buildLevel(layout = 'procedural') {
    this.bricks = [];
    if (layout === 'procedural') {
      const availableZones = this._createZones();
      const layoutPool = [
        'grid',
        'circle',
        'diamond',
        'tunnel',
        'wave',
        'perlin'
      ];
      const usedLayouts = new Set();

      while (availableZones.length > 0 && layoutPool.length > 0) {
        const zone = availableZones.pop();
        const layoutType = this._pickRandom(layoutPool, usedLayouts);
        usedLayouts.add(layoutType);

        this._generateLayoutInZone(zone, layoutType);
      }
    } else {
      // Fallback for single layout type
      const zone = {x: 0, y: 0, width: gameCanvas.width * 0.8, height: (gameCanvas.height * 0.7) / 2};
      this._generateLayoutInZone(zone, layout);
    }
  }

  _createZones() {
    const zoneCount = Math.floor(rand(2, 4));
    const zoneHeight = (gameCanvas.height * .7) / zoneCount;
    const zones = [];
    for (let i = 0; i < zoneCount; i++) {
      zones.push({
        x: 10,
        y: i * zoneHeight,
        width: gameCanvas.width,
        height: zoneHeight
      });
    }
    return zones.sort(() => Math.random() - 0.5); // shuffle
  }

  _pickRandom(pool, used) {
    const options = pool.filter(x => !used.has(x));
    return options[Math.floor(Math.random() * options.length)];
  }

  _generateLayoutInZone(zone, layout) {
    switch (layout) {
      case 'grid':
        this._buildGridLayout(zone);
        break;
      case 'circle':
        this._buildCircleLayoutInZone(zone);
        break;
      case 'diamond':
        this._buildDiamondLayoutInZone(zone);
        break;
      case 'tunnel':
        this._buildTunnelLayout(zone);
        break;
      case 'wave':
        this._buildWaveLayout(zone);
        break;
      case 'perlin':
        this._buildNoiseLayout(zone);
        break;
    }
  }

  _buildNoiseLayout(zone) {
    noise.seed(this.level + ((Math.random() * 10) + (Math.random() * 10)));
    const cols = Math.floor(zone.width / (CFG.COLS + 20))
    const rows = Math.floor(zone.height / 28)
    const bw = zone.width / cols
    const bh = 20;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const val = noise.perlin2(c / cols * 3, r / rows * 3);
      if (val > 0) {
        this._placeBrick(zone.x + c * bw, zone.y + r * bh, bw - 4, bh - 4)
      }
    }
  }

  _buildWaveLayout(zone) {
    const cols = Math.floor(zone.width / (CFG.COLS + 20))
    const rows = Math.floor(zone.height / 28)
    const bw = zone.width / cols;
    const bh = 20;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const phase = (c / cols + this.level / 10) * Math.PI * 2;
      const offset = Math.sin(phase) * bh;
      this._placeBrick(zone.x + c * bw, zone.y + r * bh + offset, bw - 4, bh - 4);
    }
  }

  _randomBrickType() {
    const p = Math.random();
    if (p < 0.05) return 'explode';
    if (p < 0.1) return 'moving';
    if (p < 0.13) return 'cannon';
    if (p < 0.15) return 'boss';
    return 'static';
  }

  _buildGridLayout({x, y, width, height}) {
    const cols = Math.floor(width / (CFG.COLS + 20))
    const rows = Math.floor(height / 28)
    const bw = (width - 40) / cols;
    const bh = 20;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.1) continue;
        const bx = 20 + c * bw;
        const by = y + 20 + r * (bh + 5);
        const type = this._randomBrickType();
        this.bricks.push(new Brick(bx, by, bw - 5, bh, type, this.level));
      }
    }
  }

  _buildCircleLayoutInZone({x, y, width, height}) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(width, height) / 3;
    const total = 16;

    for (let i = 0; i < total; i++) {
      const angle = (2 * Math.PI * i) / total;
      const bx = centerX + Math.cos(angle) * radius;
      const by = centerY + Math.sin(angle) * radius;
      const type = this._randomBrickType();
      this.bricks.push(new Brick(bx - 20, by - 10, 40, 20, type, this.level));
    }
  }

  _buildDiamondLayoutInZone({x, y, width, height}) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const layers = 4;

    for (let i = -layers; i <= layers; i++) {
      const count = layers - Math.abs(i) + 1;
      for (let j = 0; j < count; j++) {
        const bx = cx + (j - count / 2) * 45;
        const by = cy + i * 30;
        const type = this._randomBrickType();
        this.bricks.push(new Brick(bx, by, 40, 20, type, this.level));
      }
    }
  }

  _buildTunnelLayout({x, y, width, height}) {
    const cols = Math.floor(width / (CFG.COLS + 20))
    const rows = Math.floor(height / 28)
    const bw = (width - 40) / cols;
    const bh = 20;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c > 4 && c < 8) continue;
        const bx = 20 + c * bw;
        const by = y + 20 + r * (bh + 5);
        const type = this._randomBrickType();
        this.bricks.push(new Brick(bx, by, bw - 5, bh, type, this.level));
      }
    }
  }

  /* ----- HUD / SIDEBAR ----- */
  sync() {
    this.syncHUD();
    this.syncSidebar();
  }

  syncHUD() {
    let hasChange = false

    if (this.score !== lastScore) {
      lastScore = this.score;
      hasChange = true
    }

    if (this.lives !== lastLives) {
      lastLives = this.lives;
      hasChange = true

    }

    if (this.level !== lastLevel) {
      lastLevel = this.level;
      hasChange = true

    }

    if (this.bricks.length !== lastRemain) {
      lastRemain = this.bricks.length;
      hasChange = true

    }

    if (!hasChange) return

    postMessage({
      type: GAME_EVENTS.SYNC_HUD,
      payload: {
        score: this.score,
        lives: this.lives,
        level: this.level,
        left: lastRemain,
      }
    })
  }

  // TODO CHECK FOR OPTIMISATIONS
  syncSidebar() {

    function compareMaps(map1, map2) {
      let testVal;
      if (map1?.size !== map2?.size) {
        return false;
      }
      for (let [key, val] of map1) {
        testVal = map2.get(key);
        // in cases of an undefined value, make sure the key
        // actually exists on the object so there are no false positives
        if (testVal !== val || (testVal === undefined && !map2.has(key))) {
          return false;
        }
      }
      return true;
    }


    const isSame = compareMaps(this.active, lastActivePowersMap)
    lastActivePowersMap = new Map(this.active)

    if (isSame) return

    postMessage({
      type: GAME_EVENTS.SYNC_SIDE_BAR,
      payload: {
        powers: POWERS,
        activePowers: this.active,
      }
    })
  }

  /* ----- POWER‑UPS ----- */
  clear(key) {
    this.active.delete(key);
  }

  applyPower(key) {
    this.isFlashTextEnabled && flash(key, CFG.COLORS[key]);

    this.isBulletTimeEnabled && bulletTime();

    const dur = CFG.DUR[key.toLowerCase()] || 5000;
    this.clear(key);

    this.active.set(key, performance.now() + dur);
    switch (key) {
      case 'Expand': {
        this.paddle.w = Math.min(
          this.paddle.w * 1.3,
          Math.min(gameCanvas.width * 0.5, this.paddle.baseW * 3)
        );
        break;
      }
      case 'Reduce': {
        this.paddle.w = Math.max(this.paddle.w * 0.8, this.paddle.baseW * 0.2);
        break;
      }
      case 'Magnet': {
        clearTimeout(this.magnetPowerTimeout)

        this.paddle.magnet = true;
        this.magnetPowerTimeout = setTimeout(() => {
          this.paddle.magnet = false;
          this.clear(key);
        }, dur);
        break;
      }
      case 'Glue': {
        clearTimeout(this.gluePowerTimeout)

        this.paddle.sticky = true;
        this.gluePowerTimeout = setTimeout(() => {
          this.paddle.sticky = false;
          this.clear(key);
        }, dur);
        break;
      }
      case 'Laser': {
        clearTimeout(this.laserPowerTimeout)
        clearInterval(this.laserTimer);
        this.clear(key);

        this.laserTimer = setInterval(() => {
          this.spawnBullet(
            this.paddle.x + 10,
            this.paddle.y,
            -8,
            'player'
          );

          this.spawnBullet(
            this.paddle.x + this.paddle.w - 10,
            this.paddle.y,
            -8,
            'player'
          );
        }, 200);

        this.laserPowerTimeout = setTimeout(() => {
          clearInterval(this.laserTimer);
          this.clear(key);
        }, dur);
        break;
      }
      case 'Shield': {
        clearTimeout(this.shieldPowerTimeout)

        this.shieldPowerTimeout = setTimeout(() => this.clear(key), dur);
        break;
      }
      case 'Flip': {
        clearTimeout(this.flipPowerTimeout)

        postMessage({
          type: GAME_EVENTS.FLIP_POWER_UP,
          payload: {
            transformStyle: 'rotateX(180deg)'
          }
        })

        this.flipPowerTimeout = setTimeout(() => {
          postMessage({
            type: GAME_EVENTS.FLIP_POWER_UP,
            payload: {
              transformStyle: ''
            }
          })
          this.clear(key);
        }, dur);
        break;
      }
      case 'Velocity': {
        this.balls.forEach(b => {
          b.sp = Math.min(CFG.MAX_SPEED, b.sp * 1.2);
          const ang = Math.atan2(b.vy, b.vx);
          b.vx = Math.cos(ang) * b.sp;
          b.vy = Math.sin(ang) * b.sp;
        });

        break;
      }
      case 'Chill': {
        clearTimeout(this.chillPowerTimeout)

        this.balls.forEach(b => {
          b.sp = Math.max(4, b.sp * 0.7);
          const ang = Math.atan2(b.vy, b.vx);
          b.vx = Math.cos(ang) * b.sp;
          b.vy = Math.sin(ang) * b.sp;
        });
        this.chillPowerTimeout = setTimeout(() => {
          this.balls.forEach(b => b.sp = b.baseSp);
          this.clear(key);
        }, dur);
        break;
      }
      case 'Burst': {
        const main = this.balls[0];

        [0.3, -0.3].forEach(angleOffset => {
          const ang = Math.atan2(main.vy, main.vx) + angleOffset;
          const nb = new Ball(this.paddle);
          nb.stuck = false;
          nb.vx = Math.cos(ang) * nb.sp;
          nb.vy = Math.sin(ang) * nb.sp;
          nb.x = main.x;
          nb.y = main.y;
          this.balls.push(nb);
        });
        this.clear(key);
        break;
      }
      case 'Heart': {
        this.lives++;
        this.clear(key);

        break;
      }
      case 'Joker': {
        const opts = POWERS.filter(p => p !== 'Joker');
        this.applyPower(opts[Math.random() * opts.length | 0]);
        this.clear('Joker');
        break;
      }
      case 'Reverse': {
        clearTimeout(this.reversePowerTimeout)

        this.paddle.isReversed = true;
        this.reversePowerTimeout = setTimeout(() => {
          this.paddle.isReversed = false;
          this.clear(key);
        }, dur);
        break;
      }
      case 'Wrap': {
        clearTimeout(this.wrapPowerTimeout)

        this.wrap = true;
        this.wrapPowerTimeout = setTimeout(() => {
          this.wrap = false;
          this.clear(key);
        }, dur);
        break;
      }
      case 'Freeze': {
        clearTimeout(this.freezePowerTimeout)
        this.clear('Freeze');

        this.freeze = true;
        this.freezePowerTimeout = setTimeout(() => {
          this.freeze = false;
          this.clear(key);
        }, dur);
        break;
      }
      case 'ChargeShot': {
        clearTimeout(this.chargeReadyPowerTimeout)

        this.chargeReady = true;
        this.chargeReadyPowerTimeout = setTimeout(() => {
          this.chargeReady = false;
          this.clear(key);
        }, dur);
        break;
      }
      case 'BlackHole': {
        clearTimeout(this.blackHolePowerTimeout)

        this.blackHole = {
          x: rand(0, gameCanvas.width),
          y: rand(0, gameCanvas.width),
          r: 100 * getDecreasingProbability(this.level)
        };
        this.blackHolePowerTimeout = setTimeout(() => {
          this.blackHole = null;
          this.clear(key);
        }, dur);
        break;
      }
      case 'Missile': {
        clearTimeout(this.missilePowerTimeout)
        clearTimeout(this.gravityPowerTimeout)

        this.balls.forEach(b => {
          b.gravity = false
          b.missile = true
        });

        this.missilePowerTimeout = setTimeout(() => {
          this.balls.forEach(b => b.missile = false);
          this.clear(key);
        }, dur);
        break;
      }
      case 'Gravity': {
        clearTimeout(this.gravityPowerTimeout)
        clearTimeout(this.missilePowerTimeout)

        this.balls.forEach(b => {
          b.gravity = true
          b.missile = false
        });

        this.gravityPowerTimeout = setTimeout(() => {
          this.balls.forEach(b => b.gravity = false);
          this.clear(key);
        }, dur);
        break;
      }
      case 'Echo': {
        clearTimeout(this.echoPowerTimeout)

        this.echo = true;
        this.echoSegments = new Array(8).fill(true)

        this.echoPowerTimeout = setTimeout(() => {
          this.echo = false;
          this.echoSegments = new Array(8).fill(false)
          this.clear(key);
        }, dur);
        break;
      }

      case 'Squeeze': {
        this.bricks.forEach(br => {
          br.w *= 0.7;
          br.h *= 0.7;
        });
        setTimeout(() => {
          game.bricks.forEach(br => {
            br.w /= 0.7;
            br.h /= 0.7;
          });
        }, CFG.DUR.squeeze);
        break
      }

      case 'Shuffle': {
        this.bricks.forEach(brick => {
          brick.type = this._randomBrickType();
        });
        break
      }
    }
  }

  applyStun() {
    this.balls.forEach(b => b.sp = Math.max(b.baseSp, b.sp));
    this.paddle.reset()
    this.active.clear();
    clearInterval(this.laserTimer);
  }

  /* ----- BULLET SPAWN ----- */
  spawnBullet(x, y, vy, owner) {
    this.bullets.push(new Bullet(x, y, vy, owner));
  }

  /* ----- EXPLOSION EVENT ----- */
  explode(brick) {
    postMessage({
      type: GAME_EVENTS.SET_SHAKE,
      payload: {}
    })

    this.isBulletTimeEnabled && bulletTime();

    this.explodeBrickTimeout = setTimeout(
      () => postMessage({
        type: GAME_EVENTS.REMOVE_SHAKE,
        payload: {}
      }),
      250
    );

    triggerRippleEffect(brick.x, brick.y)
    /* particles */
    for (let i = 0; i < 20; i++) {
      this.parts.push(
        new Particle(brick.x + rand(0, brick.w), brick.y + rand(0, brick.h), 'hsl(50, 100%, 50%)')
      );
    }

    /* splash damage */
    this.bricks.forEach(b => {
      if (Math.hypot(b.x - brick.x, b.y - brick.y) < 90) b.alive = false;
    });
  }

  /* ----- BALL LOST ----- */
  ballLost(ball) {
    this.balls = this.balls.filter(b => b !== ball);
    this.powers[0]?.applyStun?.()

    if (this.balls.length === 0) {
      this.lives--;
      this.paddle.reset();
      this.balls.push(new Ball(this.paddle));
      this.active.clear();
      this.powers = []
    }

    if (this.lives <= 0) {
      const messageIdx = Math.floor(rand(0, GameOverTauntMessages.length - 1) % GameOverTauntMessages.length);

      postMessage({
        type: GAME_EVENTS.SHOW_GAME_OVER_MENU,
        payload: {
          canContinue: this.canContinue,
          buttonText: `Continue (${this.canContinue})`,
          gameOverMessage: GameOverTauntMessages[messageIdx],
        }
      })

      postMessage({
        type: GAME_EVENTS.RESET_POINTER_LOCK,
        payload: {}
      })

      this.stop = true;
    }
  }

  continueGame() {
    console.log('Continuing...')
    if (this.canContinue <= 0) this.restartGame();

    this.canContinue--;

    this.paddle = new Paddle();
    this.balls = [new Ball(this.paddle)];
    this.parts = [];
    this._frameCount = 0;

    this.lives = 3
    this.stop = false

    postMessage({
      type: GAME_EVENTS.HIDE_GAME_OVER_MENU,
      payload: {}
    })

    postMessage({
      type: GAME_EVENTS.SET_POINTER_LOCK,
      payload: {}
    })

    this.loop();
  }

  restartGame() {
    postMessage({
      type: GAME_EVENTS.RESTART_GAME_FROM_BEGINNING,
      payload: {}
    })
  }

  /* ----- MAIN LOOP ----- */
  startLoop() {
    requestAnimationFrame(() => this.loop());
  }

  loop() {
    if (this.stop || this.paused) return;
    this._frameThrottle = 0 //this._frameThrottle ? 1 : 0;

    const dt = getDt();
    this.update(dt);
    this.render();

    requestAnimationFrame(() => this.loop());
  }

  applyEnemyStun() {
    this.paddle.stun = CFG.DUR.stun / 16;

    postMessage({
      type: GAME_EVENTS.SET_HIT,
      payload: {}
    })

    this.isBulletTimeEnabled && bulletTime();
    this.isFlashTextEnabled && flash('Stun!', '#ff3131');

    this.score = Math.max(0, this.score - 10);

    this.active.clear();
    this.powers[0]?.applyStun?.();

    this.applyEnemyStunTimer = setTimeout(() => postMessage({
      type: GAME_EVENTS.REMOVE_HIT,
      payload: {}
    }), 200);
  }

  spawnHitParticles(x, y, w, h, count = 5) {
    for (let i = 0; i < count; i++) {
      this.parts.push(
        new Particle(x + rand(0, w), y + rand(0, h), '#ff3131')
      );
    }
  }

  launchNextLevelSequence() {
    // stop the game-loop
    this.stop = true;

    const messageIdx = Math.floor(
      rand(0, LevelClearedMessages.length - 1) % LevelClearedMessages.length)
    ;
    this.lvlUp = true;

    postMessage({
      type: GAME_EVENTS.SHOW_LEVEL_COMPLETE_MODAL,
      payload: {
        lvlText: `Level ${this.level}`,
        lvlUpText: LevelClearedMessages[messageIdx],
        opacity: 1,
      }
    })

    this.level++;
    this.lives++;

    setTimeout(() => {
      this.moveToNextLevel()

      this.buildLevel();
      this.lvlUp = false
      this.stop = false;
      this.loop()

      postMessage({
        type: GAME_EVENTS.HIDE_LEVEL_COMPLETE_MODAL,
        payload: {
          lvlText: `Level ${this.level}`,
          lvlUpText: LevelClearedMessages[messageIdx],
          opacity: 1,
        }
      })
    }, 3000);
  }

  /* ----- UPDATE STEP ----- */
  update(dt) {
    if (this.lvlUp) return

    if (this._frameThrottle === 0) {
      ripples = ripples.filter(ripple => {
        ripple.radius += 200 * dt * timeScale * 0.1;
        return ripple.radius <= 100;
      });
    }

    this._frameCount++; // increment per frame

    /* expire powers */
    for (const [key, until] of this.active) {
      if (performance.now() > until) this.clear(key);
    }

    if (this.blackHole && this._frameThrottle === 0) {
      this._blackHoleAngle += 0.05;

      for (let b of this.bricks) {
        if (!b.alive) continue;

        const dx = this.blackHole.x - (b.x + b.w / 2);
        const dy = this.blackHole.y - (b.y + b.h / 2);
        const dist = Math.hypot(dx, dy);

        if (dist >= this.blackHole.r) continue

        // spiral inwards
        const pull = (this.blackHole.r - dist) / this.blackHole.r * 4 * timeScale;
        b.x += (dx / dist) * pull;
        b.y += (dy / dist) * pull;
        // rotate around center
        const ang = Math.atan2(b.y - this.blackHole.y, b.x - this.blackHole.x) + 0.02;
        const dist2 = Math.hypot(b.x - this.blackHole.x, b.y - this.blackHole.y);
        b.x = this.blackHole.x + Math.cos(ang) * dist2;
        b.y = this.blackHole.y + Math.sin(ang) * dist2;

        // if close to center, destroy brick with particle
        if (dist > 10) continue

        b.alive = false;
        /* particles */
        this.parts.push(
          new Particle(b.x + rand(0, b.w), b.y + rand(0, b.h), 'rgba(213,213,213,0.7)')
        );

        this.score += 5;
      }
    }

    if (this.echo && this._frameThrottle === 0) {
      const count = this.echoSegments.length;
      const r = 100;
      this.echoSegments.forEach((alive, i) => {
        if (!alive) return;
        const ang = this._frameCount * 0.05 + (2 * Math.PI / count) * i;
        const rx = this.balls[0].x + Math.cos(ang) * r;
        const ry = this.balls[0].y + Math.sin(ang) * r;
        for (let b of this.bricks) {
          if (b.alive && rx > b.x && rx < b.x + b.w && ry > b.y && ry < b.y + b.h) {
            b.alive = false;
            this.score += 10;
            this.echoSegments[i] = false;
            break;
          }
        }
      });
      this.bricks = this.bricks.filter(b => b.alive);
    }


    /* update entities */
    this.paddle.update(keys);

    /* ball collisions */
    let temp = [];
    let hasHitBrick = false
    this.balls.forEach(ball => {
      if (
        !ball.stuck && ball.vy > 0 &&
        ball.x > this.paddle.x &&
        ball.x < this.paddle.x + this.paddle.w &&
        ball.y + ball.r > this.paddle.y
      ) {
        const rel = (ball.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2);
        const ang = rel * (Math.PI / 3);
        ball.vx = ball.sp * Math.sin(ang);
        ball.vy = -Math.abs(ball.sp * Math.cos(ang));

        if (this.paddle.sticky) {
          ball.stuck = true;
          // record exactly where on the paddle the ball landed:
          ball.stuckOffsetX = ball.x - this.paddle.x;
        }
      }

      /* bricks */
      this.bricks.forEach(br => {
        if (!br.alive) return;
        if (ball.x + ball.r > br.x && ball.x - ball.r < br.x + br.w && ball.y + ball.r > br.y && ball.y - ball.r < br.y + br.h) {
          hasHitBrick = true;

          /* bounce logic: choose axis of least overlap */
          if (!this.active.has('Teleport')) {
            const oX = Math.min(ball.x + ball.r - br.x, br.x + br.w - (ball.x - ball.r));
            const oY = Math.min(ball.y + ball.r - br.y, br.y + br.h - (ball.y - ball.r));
            if (oX < oY) ball.vx *= -1; else ball.vy *= -1;
          }

          if (this.chargeReady) {
            br.hp = 0
            br.type = 'explode';
          }

          br.hp--;
          if (br.hp <= 0) {
            br.alive = false;
            if (br.type === 'explode') this.explode(br);
            this.score += 10;
            /* 30% drop chance */
            const randomPercentage = Math.random()
            const powerDropChance = getProbability(this.level);

            if (randomPercentage < powerDropChance) {
              const k = POWERS[Math.floor(Math.random() * POWERS.length)];
              this.powers.push(new Power(br.x, br.y, k));
            }
          }

          /* particles */
          for (let i = 0; i < 5; i++) {
            this.parts.push(new Particle(ball.x + rand(0, 6), ball.y + rand(0, 6), '#fff'));
          }
        }
      });

      ball.update(this)
    });

    temp = []
    this.bricks.forEach(b => {
      if (!b.alive) return

      temp.push(b)
      if (this.freeze) return;
      b.update(dt, this)
    });
    this.bricks = temp

    temp = []
    this.powers.forEach(p => {
      if (p.dead) return
      temp.push(p)
      p.update()
    });
    this.powers = temp

    temp = []
    this.bullets.forEach(b => {
      if (!(b.y > -5 && b.y < gameCanvas.height + 5)) return;

      // ➤ Enemy bullet hits paddle?
      if (b.owner === 'enemy'
        && b.y > this.paddle.y
        && b.x > this.paddle.x
        && b.x < this.paddle.x + this.paddle.w) {
        this.applyEnemyStun();
        return;
      }

      // ➤ Player laser hits brick?
      if (b.owner === 'player') {
        let collided = false;

        for (const br of this.bricks) {
          if (!br.alive) continue;
          if (
            b.x > br.x && b.x < br.x + br.w && b.y > br.y && b.y < br.y + br.h
          ) {
            br.hp--;

            if (br.hp <= 0) {
              br.alive = false;
              if (br.type === 'explode') this.explode(br);
              this.score += 10;
            }

            this.spawnHitParticles(b.x, b.y, br.w, br.h);
            collided = true;
            break;
          }
        }
        if (collided) return; // drop bullet if it hit any brick
      }

      b.update(this)
      temp.push(b)
    });
    this.bullets = temp

    temp = []
    this.parts.forEach(pt => {
      if (pt.life <= 0) return

      temp.push(pt)
      pt.update()
    });
    this.parts = temp

    if (this.chargeReady && hasHitBrick) {
      this.chargeReady = false
    }

    // if (this._frameThrottle === 0) {         // every 4th frame
    if (this.parts.length > MAX_PARTICLES) {
      this.parts.splice(this.parts.length - MAX_PARTICLES, this.parts.length)
    }

    if (ripples.length > MAX_RIPPLES) {
      ripples.splice(
        ripples.length - MAX_RIPPLES,
        ripples.length
      )
    }

    if (this.bullets.length > 200) {
      this.bullets.splice(this.bullets.length - 200, this.bullets.length)
    }

    if (this.balls.length > 30) {
      this.balls.splice(this.balls.length - 30, this.balls.length)
    }

    if (this.powers.length > 50) {
      this.powers.splice(this.powers.length - 30, this.powers.length)
    }
    // }

    /* level clear */
    if (this.bricks.length <= 0) {
      this.launchNextLevelSequence()
    }

    this.sync();
  }

  moveToNextLevel() {
    this.active = new Map(); // key -> expires timestamp
    this.paddle = new Paddle();
    this.balls = [new Ball(this.paddle)];
    this.bricks = [];
    this.powers = [];
    this.parts = [];
    this.bullets = [];
    this._frameCount = 0;  // initialize frame counter
    // this.sync();
  }

  /* ----- RENDER STEP ----- */
  render() {
    gameCanvasContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    if (this.blackHole && this._frameThrottle === 0) {
      const bh = this.blackHole;
      // swirling vortex effect
      const grad = gameCanvasContext.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bh.r);
      grad.addColorStop(0, 'rgba(80,80,80,0.8)');
      grad.addColorStop(1, 'rgba(20,20,20,0.4)');
      gameCanvasContext.save();
      gameCanvasContext.translate(bh.x, bh.y);
      gameCanvasContext.rotate(this._blackHoleAngle);
      gameCanvasContext.translate(-bh.x, -bh.y);
      gameCanvasContext.beginPath();
      gameCanvasContext.arc(bh.x, bh.y, bh.r, 0, 2 * Math.PI);
      gameCanvasContext.fillStyle = grad;
      gameCanvasContext.fill();
      gameCanvasContext.restore();
      // inner ring
      gameCanvasContext.beginPath();
      gameCanvasContext.arc(bh.x, bh.y, bh.r * 0.6, 0, 2 * Math.PI);
      gameCanvasContext.strokeStyle = 'rgba(255,255,255,0.2)';
      gameCanvasContext.lineWidth = 4;
      gameCanvasContext.stroke();
    }

    if (this.echo && this._frameThrottle === 0) {
      const count = this.echoSegments.length;
      const r = 50;
      gameCanvasContext.save();
      gameCanvasContext.globalAlpha = 0.5;
      gameCanvasContext.fillStyle = CFG.COLORS.Echo;
      this.echoSegments.forEach((alive, i) => {
        if (!alive) return;
        const ang = this._frameCount * 0.05 + (2 * Math.PI / count) * i;
        const rx = this.balls[0].x + Math.cos(ang) * r;
        const ry = this.balls[0].y + Math.sin(ang) * r;
        gameCanvasContext.beginPath();
        gameCanvasContext.arc(rx, ry, this.balls[0].r / 2, 0, 2 * Math.PI);
        gameCanvasContext.fill();
      });
      gameCanvasContext.restore();
    }

    this.paddle.draw();
    this.bricks.forEach(b => b.draw());
    this.balls.forEach(b => b.draw());
    this.bullets.forEach(b => b.draw());
    this.powers.forEach(p => p.draw());
    this.parts.forEach(pt => pt.draw());

    /* shield visual */
    if (this.active.has('Shield')) {
      gameCanvasContext.fillStyle = 'rgba(255,255,255,.5)';
      gameCanvasContext.fillRect(0, gameCanvas.height - 8, gameCanvas.width, 8);
    }

    if (this._frameThrottle === 0) {
      ripples.forEach(ripple => {
        drawShockwave(ripple.x, ripple.y, ripple.radius);
      });
    }
  }
}

const LevelSounds = [
  'https://cdn.pixabay.com/audio/2025/03/19/audio_56ae1dae5f.mp3',
  'https://cdn.pixabay.com/audio/2025/02/19/audio_3b45f7d855.mp3',
  'https://cdn.pixabay.com/audio/2025/02/18/audio_67a824edf7.mp3',
  'https://cdn.pixabay.com/audio/2024/09/09/audio_7556bb3a41.mp3',
  'https://cdn.pixabay.com/audio/2024/07/24/audio_5ec636ca14.mp3',
  'https://cdn.pixabay.com/audio/2025/03/18/audio_7d5c12b31a.mp3',
  'https://cdn.pixabay.com/audio/2024/09/16/audio_a10608d6cd.mp3'
]
const GameOverTauntMessages = [
  "You’ve met with a terrible fate, haven’t you?",
  "Press F to pay respects—to your dignity.",
  "Ight, imma head out… straight to the tutorial.",
  "This is fine. 🔥🐶",
  "Not even Doge could save you: much fail, so wow.",
  "Thanos snapped. You snapped. Same thing.",
  "When life gives you lemons… you still die in one hit.",
  "OK boomer, learn how to dodge.",
  "Your k/d ratio called; it wants a refund.",
  "Are you a Karen? Because you just got told, ‘Game over, Karen.’",
  "Your loot hopes are as dead as your last respawn.",
  "BRB—grabbing popcorn while you keep failing.",
  "Achievement unlocked: Most spectacular crash.",
  "Error 404: Victory not found.",
  "Nobody exists on purpose—you exist to die here.",
  "Rickrolled by gravity! Never gonna give you up.",
  "Your combo break was more tragic than your Wi-Fi.",
  "When the final boss is lag—and you lost.",
  "Literally unplayable. (Except you keep playing.)",
  "Your save file just face-palmed.",
  "Git gud? You might want to ‘git help.’",
  "RIP your hopes and dreams.",
  "You fell faster than my respect for you.",
  "At least you’re consistent: consistently bad.",
  "Even the loading screen is judging you.",
  "Game over, man! Game over! (Apollo 13 vibes.)",
  "If only your reflexes respawned, too.",
  "That death was sponsored by Clippy: ‘It looks like you died. Need help?’",
  "Your face when you realize you’re the final boss.",
  "Plot twist: you were the tutorial level. Again.",
  "Your XP just refunded itself.",
  "Your character left the chat.",
  "You just hit ‘U’ for Universe reset.",
  "Cue Despacito—you couldn’t go on.",
  "Your stamina bar is life goals: depletes instantly.",
  "404 skill not found.",
  "That was so cringe your controller unplugged itself.",
  "Your ghost wants a rematch. You don’t.",
  "Keep calm and blame lag.",
  "You respawn so much, you need a loyalty card.",
  "Your fatality was more ‘face-palm’ than ‘fatal.’",
  "Nobody panic—I only died 47 times.",
  "Your DRAMA meter: over 9000.",
  "Not even Shrek could swamp you—layer upon layer of fail.",
  "Your death animation deserves an Oscar.",
  "Keep respawning—maybe RNGesus will bless you.",
  "When your controller says ‘try again,’ you say ‘no thanks.’",
  "Your AFK skills are on point… too bad you’re not AFK.",
  "Game over: Now loading humility.",
  "You’re the real final boss of failure."
]
const LevelClearedMessages = [
  "Level complete! You make victory look easy.",
  "You smashed that level like Thanos snapped.",
  "Congratulations, you’ve unlocked a hair-trigger brain!",
  "Level conquered! Time to ascend.",
  "You just leveled up IRL—feel that power?",
  "Next level? More like next dimensions.",
  "You’re on fire! 🔥 Level done.",
  "Boss level? More like BOSS-YOU!",
  "Game: 0  You: 1.",
  "Whoa—did you code that win yourself?",
  "Leveled up faster than Mario on mushrooms.",
  "Achievement unlocked: Legendary status.",
  "Nailed it like a pro tutorial.",
  "Sweet! You made the tutorial jealous.",
  "Hello from the other side… of that level.",
  "You broke the level meter—epic!",
  "GG WP (Good Game, Well Played)!",
  "Your K/D (Keep Defeating) ratio is insane.",
  "Next stop: world domination.",
  "Level-up dance time! 🕺💃",
  "You just earned maximum bragging rights.",
  "Level done! Brain: 100, Ego: 1000.",
  "You didn’t beat it—you schooled it.",
  "Pro tip: You’re officially a pro.",
  "Epic win! Savor that moment.",
  "Streamer mode: activated.",
  "Your reflexes just got a medal.",
  "Teleporting to the next challenge…",
  "Score: UNSTOPPABLE.",
  "You’re the hero this game deserves.",
  "Too easy? Try harder next time.",
  "Your thumbs are now legendary.",
  "You leveled up your flex game.",
  "Game: 0  Level: ROFL.",
  "That level didn’t know what hit it.",
  "You’re rewriting the game’s code with skill.",
  "New win streak—update complete.",
  "You’re earning more XP than a celeb.",
  "Next level is quivering in fear.",
  "Power-up: You’re unstoppable!",
  "You’ve got the Midas touch on levels.",
  "Your victory is now trending.",
  "Unbelievable! You’re a glitch in the matrix.",
  "Did you just respawn in style?",
  "Certified legendary status unlocked.",
  "You leveled up and the universe noticed.",
  "360 no-scope your way forward!",
  "You and that level: besties now.",
  "New high score—eternally enshrined."
]
