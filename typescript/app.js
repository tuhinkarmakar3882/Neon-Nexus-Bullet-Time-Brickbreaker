const $ = q => document.querySelector(q);
const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

/* ---------- CANVAS SETUP ---------- */
const gameCanvas = $('#game');
const gameCanvasContext = gameCanvas.getContext('2d');
const gameContainer = $('#game-container');
const canvasContainer = $('div.canvas-container');


/* ---------- Utilities ---------- */

function calculateSpeedBasedOnScreenSize(minSpeed, maxSpeed) {
  const minHeight = 400;
  const maxHeight = 1080;

  const screenHeight = canvasContainer.offsetHeight || window.innerHeight;

  // Clamp the height
  const clampedHeight = Math.max(minHeight, Math.min(maxHeight, screenHeight));

  // Ratio between 0 and 1
  const ratio = (clampedHeight - minHeight) / (maxHeight - minHeight);

  // Exponential mapping
  return minSpeed * Math.pow((maxSpeed / minSpeed), ratio);
}

function resize() {
  gameCanvas.width = canvasContainer.clientWidth;
  gameCanvas.height = canvasContainer.clientHeight;
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
  MAX_SPEED: calculateSpeedBasedOnScreenSize(8, 12),
  MIN_SPEED: calculateSpeedBasedOnScreenSize(3, 4),
  DUR: {
    expand: 10000,
    reduce: 10000,
    chill: 15000,
    velocity: 10000,
    glue: 15000,
    magnet: 9000,
    laser: 7000,
    shield: 15000,
    teleport: 8000,
    flip: 7000,
    bullet: 1200,
    stun: 800,

    joker: 10000,
    reverse: 5000,
    wrap: 15000,
    freeze: 10000,
    chargeshot: 15000,
    blackhole: 4000,
    gravity: 5000,
    missile: 7000,
    echo: 8000,
    burst: 5000,
  },
  CANNON: { RATE: 2500, SPD: 5 },
  COLORS: {
    BlackHole: '#be0000',        // Mint green
    Burst: '#9723e7',        // Mint green
    ChargeShot: '#FFAC33',       // Soft blue
    Chill: '#5BE7C4',
    Echo: '#E0E0E0',         // Emerald green
    Expand: '#6699FF',        // Bold red
    Flip: '#C084FC',
    Freeze: '#1FB6FF',       // Soft white
    Glue: '#00C48C',
    Gravity: '#D88BFF',     // Aqua blue
    Heart: '#FFD6E8',        // Lively lime
    Joker: '#A3FF12',
    Laser: '#FF5A5F',      // Pastel coral
    Missile: '#00ff8b',         // Banana yellow
    Reverse: '#FFB3C1',       // Ice blue
    Shield: '#F5F5F5',   // Orange amber
    Teleport: '#72F2EB',    // Deep space black
    Velocity: '#0077FF',      // Lavender haze
    Wrap: '#FFE156',          // Gentle gray
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


gameCanvasContext.font = '14px monospace';
POWERS.forEach(k => textWidths[k] = gameCanvasContext.measureText(k).width);

window.addEventListener('resize', resize);
$('#btn-start').addEventListener('click', () => {
  document.exitPointerLock();

  gameCanvas.requestPointerLock();
  $('#app').requestFullscreen();


  setTimeout(() => {
    $('#start').classList.remove('show')
    game = new Game();
  }, 200)
  /************ INIT GAME ************/

});
$('#btn-restart').addEventListener('click', () => {
  game.restartGame()
});
// cache DOM elements
const btnContinue = $('#btn-continue');
btnContinue.addEventListener('click', () => {
  game.continueGame()
})

const audioElem = $('#audio-elem');


const btnResume = $('#btn-resume');
const btnPause = $('#btn-pause');
const pausedContainer = $('#paused');

const btnSetting = $('#btn-setting');
const btnSettingSave = $('#btn-setting-save');
const settingsContainer = $('#settings-container');

const soundToggle = $('input#sound-toggle');
const bulletTimeToggleInput = $('input#bullet-time-toggle')
const flashTextToggleInput = $('input#flash-text-toggle')

resize();

/* ---------- GLOBAL STATE ---------- */

/************ INPUT KEYS ************/
const keys = { L: false, R: false };

let game;
const noise = new Noise()

let timeScale = 1;
let isBulletTime = false;
let last = performance.now();

let ripples = []; // Store multiple ripples

let flashTimer;

const scoreEl = $('#score'),
  livesEl = $('#lives'),
  levelEl = $('#level'),
  remainEl = $('#remaining-bricks-count');
let lastScore, lastLives, lastLevel, lastRemain;

const fireConfetti = confetti.create(gameCanvas, { resize: true });

function flash(text, color = '#00ffc3') {
  const box = $('#flash');
  box.textContent = text;
  box.style.opacity = '1';
  box.style.color = color;
  box.style.textShadow = `0 0 4px ${color}`;

  flashTimer = setTimeout(() => {
    box.style.opacity = '0';
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
  ripples.push({ x, y, radius: 0 });

  if (ripples.length > MAX_RIPPLES) {
    ripples.splice(
      ripples.length - MAX_RIPPLES,
      ripples.length
    )
  }
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
    // gameCanvasContext.shadowBlur = 4;
    // gameCanvasContext.shadowColor = CFG.COLORS.defaultColor;
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
    this.baseSp = calculateSpeedBasedOnScreenSize(1, 3.7);
    this.sp = this.baseSp;
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
    // gameCanvasContext.shadowBlur = 15;
    // gameCanvasContext.shadowColor = this.getBallColor();
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

  update() {
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
  constructor() {
    /* basic state */
    this.score = 0;
    this.lives = 3;
    this.canContinue = 3;
    this.level = 1;

    /* active power‑ups */
    this.active = new Map(); // key -> expires timestamp

    /* entity collections */
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


    /* build first level */
    this.buildLevel();
    this.sync();

    /* input handlers */
    this.bindUI();
    this.startLoop();

    this.loadStoredPreferences()
  }

  loadStoredPreferences() {
    this.isSoundEnabled = localStorage.getItem('isSoundEnabled') ? localStorage.getItem('isSoundEnabled') === 'true' : true

    audioElem.muted = !this.isSoundEnabled;
    soundToggle.checked = this.isSoundEnabled;


    this.isBulletTimeEnabled = localStorage.getItem('isBulletTimeEnabled') ? localStorage.getItem('isBulletTimeEnabled') === 'true' : true
    bulletTimeToggleInput.checked = this.isBulletTimeEnabled;

    this.isFlashTextEnabled = localStorage.getItem('isFlashTextEnabled') ? localStorage.getItem('isFlashTextEnabled') === 'true' : true
    flashTextToggleInput.checked = this.isFlashTextEnabled;
  }

  buildSidebar() {
    const sb = $('.sidebar > .sidebar-powerups');

    sb.innerHTML = '<h3>Power‑Ups</h3>';

    POWERS.forEach(k => {
      const row = document.createElement('div');
      row.className = 'power';
      row.id = `power-ups-${k}-indicator`
      row.innerHTML = `<span class="color" style="background:${CFG.COLORS[k]}"></span><span>${k}</span>`;
      sb.appendChild(row);
    });
  }

  /* ----- UI BINDINGS ----- */
  bindUI() {
    if (this.UIBindingCompleted) return;

    document.addEventListener('keydown', e => {
      if (e.code === 'ArrowLeft') keys.L = true;
      if (e.code === 'ArrowRight') keys.R = true;

      if (e.code === 'Space' || e.code === 'enter') this.balls.forEach(b => b.release());
    });

    document.addEventListener('keyup', e => {
      e.preventDefault()
      if (e.code === 'ArrowLeft') keys.L = false;
      if (e.code === 'ArrowRight') keys.R = false;

      if (e.code === 'Space' || e.code === 'enter') this.balls.forEach(b => b.release());
    });
    let paddleX = (gameCanvas.width - this.paddle.w) / 2;

    gameContainer.addEventListener('click', () => this.balls.forEach(b => b.release()));
    window.addEventListener('mousemove', (e) => {
      paddleX += e.movementX;

      // Clamp within canvas bounds
      if (paddleX < 0) {
        paddleX = 0;
      }
      if (paddleX > gameCanvas.width - this.paddle.w) {
        paddleX = gameCanvas.width - this.paddle.w;
      }
      // const r = cvs.getBoundingClientRect();
      this.paddle.update(null, paddleX || 0);
    });

    window.addEventListener('touchmove', (e) => {
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
      const touch = e.touches[0]; // First touch
      const x = touch.clientX; // X coordinate relative to viewport
      const y = touch.clientY; // Y coordinate relative to viewport

      const r = gameCanvas.getBoundingClientRect();
      this.paddle.update(null, x - r.left - this.paddle.w / 2);
    });

    // bind pause/resume
    btnResume.addEventListener('click', () => this.resumeGameplay());
    btnPause.addEventListener('click', () => this.pauseGameplay());

    btnSetting.addEventListener('click', () => this.showSettingsMenu())
    btnSettingSave.addEventListener('click', () => this.hideSettingsMenu())

    this.UIBindingCompleted = true
  }

  showSettingsMenu() {
    this.paused = true;
    settingsContainer.classList.add('show')
  }

  hideSettingsMenu() {
    this.paused = false;
    audioElem.muted = !soundToggle.checked

    this.isBulletTimeEnabled = bulletTimeToggleInput.checked
    this.isFlashTextEnabled = flashTextToggleInput.checked

    localStorage.setItem('isSoundEnabled', soundToggle.checked)
    localStorage.setItem('isFlashTextEnabled', this.isFlashTextEnabled)
    localStorage.setItem('isBulletTimeEnabled', this.isBulletTimeEnabled)

    $('#app').requestFullscreen();
    document.exitPointerLock();
    gameCanvas.requestPointerLock();
    this.startLoop();

    settingsContainer.classList.remove('show');
  }

  resumeGameplay() {
    this.paused = false;
    pausedContainer.classList.remove('show');
    document.exitPointerLock();
    gameCanvas.requestPointerLock();
    $('#app').requestFullscreen();

    this.startLoop();
  }

  pauseGameplay() {
    this.paused = true;
    pausedContainer.classList.add('show');
  }

  _applyLevelSound() {
    audioElem.src = LevelSounds.sort(
      () => Math.random() > 0.5 ? -1 : 1
    )[this.level % LevelSounds.length]
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
      const zone = { x: 0, y: 0, width: gameCanvas.width, height: gameCanvas.height / 2 };
      this._generateLayoutInZone(zone, layout);
    }
  }

  _createZones() {
    const zoneCount = Math.floor(rand(2, 4));
    const zoneHeight = (gameCanvas.height * .8) / zoneCount;
    const zones = [];
    for (let i = 0; i < zoneCount; i++) {
      zones.push({
        x: 0,
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

  _buildGridLayout({ x, y, width, height }) {
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

  _buildCircleLayoutInZone({ x, y, width, height }) {
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

  _buildDiamondLayoutInZone({ x, y, width, height }) {
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

  _buildTunnelLayout({ x, y, width, height }) {
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
    if (this.score !== lastScore) {
      scoreEl.textContent = lastScore = this.score;
    }
    if (this.lives !== lastLives) {
      livesEl.textContent = lastLives = this.lives;
    }
    if (this.level !== lastLevel) {
      levelEl.textContent = lastLevel = this.level;
    }
    const rem = this.bricks.length;
    if (rem !== lastRemain) {
      remainEl.textContent = lastRemain = rem;
    }
  }

  syncSidebar() {
    POWERS.forEach(k => {
      const powerUpElem = $(`#power-ups-${k}-indicator`)
      this.active.has(k) ? powerUpElem.classList.add('active') : powerUpElem.classList.remove(
        'active')
    });
  }

  /* ----- POWER‑UPS ----- */
  clear(key) {
    this.active.delete(key);
    this.syncSidebar();
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
            this.paddle.x + this.paddle.w / 2,
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

        gameCanvas.style.transform = 'rotateX(180deg)';
        this.flipPowerTimeout = setTimeout(() => {
          gameCanvas.style.transform = '';
          this.clear(key);
        }, dur);
        break;
      }
      case 'Velocity': {
        this.balls.forEach(b => {
          b.sp = Math.min(CFG.MAX_SPEED, b.sp + 2);
          const ang = Math.atan2(b.vy, b.vx);
          b.vx = Math.cos(ang) * b.sp;
          b.vy = Math.sin(ang) * b.sp;
        });
        break;
      }
      case 'Chill': {
        clearTimeout(this.chillPowerTimeout)

        this.balls.forEach(b => {
          b.sp = Math.max(4, b.sp - 2);
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
    }

    this.sync();
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

    if (this.bullets.length > 200) {
      this.bullets.splice(this.bullets.length - 200, this.bullets.length)
    }
  }

  /* ----- EXPLOSION EVENT ----- */
  explode(brick) {
    gameContainer.classList.add('shake');
    this.isBulletTimeEnabled && bulletTime();

    setTimeout(() => gameContainer.classList.remove('shake'), 250);

    triggerRippleEffect(brick.x, brick.y)
    /* particles */
    for (let i = 0; i < 50; i++) {
      this.parts.push(new Particle(brick.x + rand(0, brick.w), brick.y + rand(0, brick.h), 'hsl(50, 100%, 50%)'));
    }

    /* splash damage */
    this.bricks.forEach(b => {
      if (Math.hypot(b.x - brick.x, b.y - brick.y) < 90) b.alive = false;
    });
  }

  /* ----- BALL LOST ----- */
  ballLost(ball) {
    this.balls = this.balls.filter(b => b !== ball);
    if (this.balls.length === 0) {
      this.lives--;
      this.paddle.reset();
      this.balls.push(new Ball(this.paddle));
      /* clear temporary powers (except Heart) */
      this.active.clear();
      this.powers.forEach(pow => {
        pow.applyStun?.()
      })
      this.powers = []
      this.sync();
    }
    if (this.lives <= 0) {
      $('#gameover').classList.add('show');

      if (!this.canContinue) {
        btnContinue.style.display = 'none'
      }

      $('#btn-continue-text').textContent = `Continue (${this.canContinue})`

      const messageIdx = Math.floor(rand(0, GameOverTauntMessages.length - 1) % GameOverTauntMessages.length);
      $('#game-over-text').textContent = GameOverTauntMessages[messageIdx]

      document.exitPointerLock();

      this.stop = true;
    }
    this.syncHUD();
  }

  continueGame() {
    if (this.canContinue <= 0) this.restartGame();

    this.canContinue--;

    this.paddle = new Paddle();
    this.balls = [new Ball(this.paddle)];
    this.parts = [];
    this._frameCount = 0;  // initialize frame counter

    // add hook to show ads!
    this.lives = 3
    this.stop = false

    this.sync();
    gameCanvas.requestPointerLock();

    $('#gameover').classList.remove('show');

    this.loop();
  }

  restartGame() {
    location.reload()
  }

  /* ----- MAIN LOOP ----- */
  startLoop() {
    requestAnimationFrame(() => this.loop());
  }

  loop() {
    if (this.stop || this.paused) return;
    this._frameThrottle = this._frameThrottle ? 1 : 0;

    const dt = getDt();
    this.update(dt);
    this.render();

    requestAnimationFrame(() => this.loop());
  }

  // 1) Extract your stun routine
  applyEnemyStun() {
    this.paddle.stun = CFG.DUR.stun / 16;
    gameCanvas.classList.add('hit');

    this.isBulletTimeEnabled && bulletTime();
    this.isFlashTextEnabled && flash('Stun!', '#ff3131');

    this.score = Math.max(0, this.score - 10);
    // clear all active powers
    for (const key of this.active.keys()) this.clear(key);
    setTimeout(() => gameCanvas.classList.remove('hit'), 200);
  }

  // 2) Extract particle burst on brick hit
  spawnHitParticles(x, y, w, h, count = 5) {
    for (let i = 0; i < count; i++) {
      this.parts.push(
        new Particle(
          x + rand(0, w),
          y + rand(0, h),
          '#ff3131'
        )
      );
    }
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
        // const dist = Math.hypot(dx, dy);
        const distSq = dx * dx + dy * dy;
        if (distSq < this.blackHole.r * this.blackHole.r) {
          const dist = Math.sqrt(distSq);
          // if (dist < this.blackHole.r) {
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
          if (dist < 10) {
            b.alive = false;
            /* particles */
            for (let i = 0; i < 5; i++) {
              this.parts.push(new Particle(b.x + rand(0, b.w), b.y + rand(0, b.h), 'rgba(213,213,213,0.7)'));
            }

            this.score += 5;
          }
        }
      }
      // cleanup destroyed bricks
      this.bricks = this.bricks.filter(b => b.alive);
      if (!this.bricks.length) {
        this.level++;
        this.lives++;

        $('#lvl-text').textContent = `Level ${this.level}`;
        $('#lvlup').classList.add('show');
        this.lvlUp = true

        setTimeout(() => {
          $('#lvlup').classList.remove('show');
          this.buildLevel();
          this.lvlUp = false
        }, 1200);
      }
    }

    if (this.echo && this._frameThrottle === 0) {
      const count = this.echoSegments.length;
      const r = 30;
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
    this.balls.forEach(b => b.update(this));

    this.bricks.forEach(b => {
      if (this.freeze) return;
      b.update(dt, this)
    });
    this.powers.forEach(p => p.update());

    this.bullets.forEach(b => b.update());
    this.parts.forEach(pt => pt.update());

    const nextBullets = [];
    for (const b of this.bullets) {
      // ➤ Enemy bullet hits paddle?
      if (b.owner === 'enemy'
        && b.y > this.paddle.y
        && b.x > this.paddle.x
        && b.x < this.paddle.x + this.paddle.w) {
        this.applyEnemyStun();
        continue; // drop this bullet
      }

      // ➤ Player laser hits brick?
      if (b.owner === 'player') {
        let collided = false;
        for (const br of this.bricks) {
          if (!br.alive) continue;
          if (b.x > br.x && b.x < br.x + br.w
            && b.y > br.y && b.y < br.y + br.h) {
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
        if (collided) continue; // drop bullet if it hit any brick
      }

      // ➤ Otherwise keep it only if it’s still on screen
      if (b.y > -50 && b.y < gameCanvas.height + 50) {
        nextBullets.push(b);
      }
    }
    this.bullets = nextBullets;

    /* ball collisions */
    let hasHitBrick = false
    this.balls.forEach(ball => {
      /* paddle */
      if (!ball.stuck && ball.vy > 0 &&
        ball.x > this.paddle.x && ball.x < this.paddle.x + this.paddle.w &&
        ball.y + ball.r > this.paddle.y) {
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
          if (!this.active.has('Teleport')) {
            /* bounce logic: choose axis of least overlap */
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
    });

    if (this.chargeReady && hasHitBrick) {
      this.chargeReady = false
    }

    if (!(this._frameCount & 2)) {         // every 4th frame
      this.bricks = this.bricks.filter(b => b.alive);
      this.bullets = this.bullets.filter(b => b.y > -60 && b.y < gameCanvas.height + 60);
      this.powers = this.powers.filter(p => !p.dead);
      this.parts = this.parts.filter(pt => pt.life > 0);
    }


    /* level clear */
    if (this.bricks.length <= 0) {
      // stop the game-loop
      this.stop = true;

      // bring that overlay
      $('#lvl-text').textContent = `Level ${this.level}`;

      const messageIdx = Math.floor(rand(0, LevelClearedMessages.length - 1) % LevelClearedMessages.length);
      $('#lvlup-text').textContent = LevelClearedMessages[messageIdx]

      $('#lvlup').classList.add('show');
      this.lvlUp = true;

      // Celebrate
      fireConfetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, scalar: 2 });

      this.level++;
      this.lives++;

      setTimeout(() => {
        this.moveToNextLevel()
        $('#lvlup').classList.remove('show');
        this.buildLevel();
        this.lvlUp = false
        this.stop = false;
        this.loop()
      }, 2500);
    }

    if (this._frameThrottle === 0) {
      this.parts = this.parts.filter(p => p.life > 0);
    }

    if (this.parts.length > MAX_PARTICLES) {
      this.parts.splice(this.parts.length - MAX_PARTICLES, this.parts.length)
    }

    this.syncHUD();
  }

  // levelCompleted() {
  //     this.stop = false;
  //
  //     this.level++;
  //     this.lives++;
  //     setTimeout(() => {
  //         this.moveToNextLevel()
  //         $('#lvlup').classList.remove('show');
  //         this.buildLevel();
  //         this.lvlUp = false
  //     }, 2000);
  //
  //     this.loop()
  // }

  moveToNextLevel() {
    this.active = new Map(); // key -> expires timestamp
    this.paddle = new Paddle();
    this.balls = [new Ball(this.paddle)];
    this.bricks = [];
    this.powers = [];
    this.parts = [];
    this.bullets = [];
    this._frameCount = 0;  // initialize frame counter
    this.sync();
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
      const r = 30;
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

    this.bricks.forEach(b => b.draw());
    this.paddle.draw();
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
