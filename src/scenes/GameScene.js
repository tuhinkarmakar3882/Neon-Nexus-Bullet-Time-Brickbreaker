import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { POWERS, POWER_KEYS } from '../config/PowerUps.js';
import { GAME_OVER_MESSAGES, LEVEL_CLEARED_MESSAGES } from '../config/Messages.js';
import { Background } from '../objects/Background.js';
import { Paddle } from '../objects/Paddle.js';
import { Ball } from '../objects/Ball.js';
import { Brick } from '../objects/Brick.js';
import { Bullet } from '../objects/Bullet.js';
import { PowerUp } from '../objects/PowerUp.js';
import { PowerUpSystem } from '../systems/PowerUpSystem.js';
import { buildLevel, randomBrickType } from '../systems/LevelGenerator.js';
import { audio } from '../systems/AudioManager.js';
import { Monetization } from '../systems/Monetization.js';
import { SaveManager } from '../systems/SaveManager.js';
import { addCameraFx } from '../utils/UI.js';
import { pick, clamp, dropChance, levelScale, lerpColor } from '../utils/Helpers.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAME);
  }

  create() {
    this.settings = SaveManager.loadSettings();
    addCameraFx(this, { bloom: 1.0 });
    this.bg = new Background(this, 0x00ffc3);

    this.score = 0;
    this.lives = GAME.STARTING_LIVES;
    this.continues = GAME.CONTINUES;
    this.level = 1;
    this.combo = 0;
    this.timeScale = 1;
    this.bulletTimeRemaining = 0;
    this.over = false;
    this.transitioning = false;
    this.wrap = false;
    this.freeze = false;
    this.echo = false;
    this.chargeReady = false;
    this.squeezed = false;
    this.blackHole = null;
    this.echoSegments = [];
    this.laserAccum = 0;
    this.frame = 0;

    this.powerSys = new PowerUpSystem();
    this.powerSys.onExpire = (key) => this.onPowerExpire(key);

    this.paddle = new Paddle(this);
    this.balls = [new Ball(this, this.paddle)];
    this.bricks = [];
    this.bullets = [];
    this.powers = [];

    this.blackHoleGfx = this.add.graphics().setDepth(8);
    this.echoGfx = this.add.graphics().setDepth(9);
    this.shieldGfx = this.add.graphics().setDepth(7);

    this.createEmitters();
    this.spawnLevel();
    this.setupInput();

    this.scene.launch(SCENES.HUD);
    this.bus = this.game.events;
    this.emitStats();
    this.emitPowers();
    this._hintShown = false;

    this.time.delayedCall(80, () => this.flash('LEVEL ' + this.level, '#00ffc3', 1100));
    this.events.on('shutdown', () => this.cleanup());
  }

  cleanup() {
    this.bus?.emit('hud:flash', { text: '', color: '#fff', ms: 0 });
    this.bus?.emit('hud:hint', false);
  }

  // ---------------- INPUT ----------------
  setupInput() {
    this.bus = this.game.events;
    this.input.on('pointermove', (p) => {
      if (this.over || this.transitioning) return;
      this.paddle.setPointer(p.worldX);
    });
    this.input.on('pointerdown', () => {
      if (this.over || this.transitioning) return;
      audio.resume();
      this.releaseBalls();
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => this.releaseBalls());
    this.input.keyboard.on('keydown-ENTER', () => this.releaseBalls());
    this.input.keyboard.on('keydown-P', () => this.requestPause());
    this.input.keyboard.on('keydown-ESC', () => this.requestPause());

    this._onPauseReq = () => this.requestPause();
    this.game.events.on('req:pause', this._onPauseReq);
    this.events.once('shutdown', () => this.game.events.off('req:pause', this._onPauseReq));
  }

  requestPause() {
    if (this.over || this.transitioning) return;
    this.scene.pause();
    this.scene.launch(SCENES.PAUSE);
  }

  releaseBalls() {
    this.balls.forEach((b) => b.release());
  }

  // ---------------- EMITTERS / FX ----------------
  createEmitters() {
    this.hitEmitter = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 280 }, scale: { start: 0.8, end: 0 },
      lifespan: 420, blendMode: 'ADD', emitting: false,
    }).setDepth(30);

    this.explodeEmitter = this.add.particles(0, 0, 'soft', {
      speed: { min: 160, max: 520 }, scale: { start: 1.2, end: 0 },
      lifespan: 750, blendMode: 'ADD', emitting: false, tint: 0xffd23d,
    }).setDepth(31);
  }

  burstHit(x, y, color = 0xffffff, count = 8) {
    if (!this.settings.particles) return;
    this.hitEmitter.setParticleTint(color);
    this.hitEmitter.explode(count, x, y);
  }

  floatText(x, y, msg, color, size = 30) {
    const t = this.add.text(x, y, msg, {
      fontFamily: 'Orbitron, monospace', fontSize: size + 'px', fontStyle: 'bold', color,
    }).setOrigin(0.5).setDepth(41);
    t.setShadow(0, 0, color, 10, true, true);
    this.tweens.add({ targets: t, y: y - 64, alpha: 0, duration: 720, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // ---------------- LEVEL ----------------
  spawnLevel() {
    const data = buildLevel(this.level);
    this.bricks = data.map((b) => new Brick(this, b.x, b.y, b.w, b.h, b.type, this.level));
    this.bg.setAccent(pick([0x00ffc3, 0xff2bd6, 0x2b9bff, 0xffd23d, 0xaa66ff]));
    this.emitStats();
  }

  // ---------------- POWER-UPS ----------------
  applyActiveStateToBall(ball) {
    ball.missile = this.powerSys.isActive('Missile');
    ball.gravity = this.powerSys.isActive('Gravity');
    ball.teleport = this.powerSys.isActive('Teleport');
    ball.chargeReady = this.chargeReady;
  }

  applyPower(key) {
    const def = POWERS[key];
    if (!def) return;

    if (this.settings.flashText) this.flash(key, '#' + def.color.toString(16).padStart(6, '0'), 700);
    audio.power();
    if (def.bulletTime && this.settings.bulletTime) this.triggerBulletTime();

    if (def.kind === 'timed' || def.kind === 'field') this.powerSys.activate(key, def.dur);

    switch (key) {
      case 'Expand': this.paddle.setWidth(this.paddle.w * 1.35); break;
      case 'Reduce': this.paddle.setWidth(this.paddle.w * 0.75); break;
      case 'Magnet': this.paddle.magnet = true; break;
      case 'Glue': this.paddle.sticky = true; break;
      case 'Reverse': this.paddle.reversed = true; break;
      case 'Wrap': this.wrap = true; break;
      case 'Freeze': this.freeze = true; break;
      case 'Laser': this.laserAccum = 0; break;
      case 'Shield': break;
      case 'Flip': this.cameras.main.setRotation(Math.PI); break;
      case 'Velocity': this.balls.forEach((b) => b.setSpeed(b.speed * 1.25)); break;
      case 'Chill': this.balls.forEach((b) => b.setSpeed(b.speed * 0.65)); break;
      case 'Missile':
        this.powerSys.clear('Gravity');
        this.balls.forEach((b) => { b.missile = true; b.gravity = false; });
        break;
      case 'Gravity':
        this.powerSys.clear('Missile');
        this.balls.forEach((b) => { b.gravity = true; b.missile = false; });
        break;
      case 'Teleport': this.balls.forEach((b) => { b.teleport = true; }); break;
      case 'ChargeShot': this.chargeReady = true; this.balls.forEach((b) => { b.chargeReady = true; }); break;
      case 'Echo': this.echo = true; this.echoSegments = new Array(8).fill(true); break;
      case 'Burst': this.doBurst(); break;
      case 'Heart': this.lives++; this.bus.emit('hud:life'); break;
      case 'Joker': {
        const got = pick(POWER_KEYS.filter((p) => p !== 'Joker'));
        this.flash('JOKER \u2192 ' + got, '#00ff00', 900);
        this.applyPower(got);
        break;
      }
      case 'Shuffle':
        this.bricks.forEach((b) => { b.type = randomBrickType(); b.hp = b.type === 'boss' ? 3 : 1; b.redraw(); });
        break;
      case 'Squeeze':
        if (!this.squeezed) { this.squeezed = true; this.bricks.forEach((b) => b.setScale(0.7)); }
        break;
      case 'BlackHole': this.spawnBlackHole(); break;
    }
    this.emitPowers();
  }

  onPowerExpire(key) {
    switch (key) {
      case 'Expand':
      case 'Reduce': this.paddle.setWidth(this.paddle.baseW); break;
      case 'Magnet': this.paddle.magnet = false; break;
      case 'Glue': this.paddle.sticky = false; break;
      case 'Reverse': this.paddle.reversed = false; break;
      case 'Wrap': this.wrap = false; break;
      case 'Freeze': this.freeze = false; break;
      case 'Missile': this.balls.forEach((b) => (b.missile = false)); break;
      case 'Gravity': this.balls.forEach((b) => (b.gravity = false)); break;
      case 'Teleport': this.balls.forEach((b) => (b.teleport = false)); break;
      case 'Echo': this.echo = false; this.echoGfx.clear(); break;
      case 'ChargeShot': this.chargeReady = false; this.balls.forEach((b) => (b.chargeReady = false)); break;
      case 'Chill': this.balls.forEach((b) => b.setSpeed(GAME.BALL_MIN_SPEED * 1.15)); break;
      case 'Flip': this.cameras.main.setRotation(0); break;
      case 'BlackHole': this.blackHole = null; this.blackHoleGfx.clear(); break;
      case 'Squeeze': this.squeezed = false; this.bricks.forEach((b) => b.setScale(1)); break;
    }
    this.emitPowers();
  }

  doBurst() {
    const main = this.balls[0];
    if (!main) return;
    [0.4, -0.4, 0.8, -0.8].forEach((off) => {
      if (this.balls.length >= GAME.MAX_BALLS) return;
      const nb = new Ball(this, this.paddle);
      nb.stuck = false;
      nb.x = main.x; nb.y = main.y;
      const ang = Math.atan2(main.vy || -1, main.vx || 0) + off;
      nb.vx = Math.cos(ang) * nb.speed;
      nb.vy = Math.sin(ang) * nb.speed;
      nb.enforceMinVertical();
      this.applyActiveStateToBall(nb);
      this.balls.push(nb);
    });
  }

  spawnBlackHole() {
    const alive = this.bricks.filter((b) => b.alive);
    if (alive.length === 0) { this.powerSys.clear('BlackHole'); return; }
    const b = pick(alive);
    this.blackHole = { x: b.cx, y: b.cy, r: GAME.HEIGHT * 0.2 * levelScale(this.level, 0.7, 1.2), angle: 0 };
  }

  triggerBulletTime() {
    if (this.bulletTimeRemaining <= 0) audio.bulletTime();
    this.timeScale = GAME.BULLET_TIME_SCALE;
    this.bulletTimeRemaining = GAME.BULLET_TIME_MS;
  }

  // ---------------- COMBAT ----------------
  spawnBullet(x, y, vy, owner) {
    if (this.bullets.length >= GAME.MAX_BULLETS) return;
    this.bullets.push(new Bullet(this, x, y, vy, owner));
  }

  explode(brick) {
    audio.explode();
    this.cameras.main.shake(220, 0.01);
    if (this.settings.bulletTime) this.triggerBulletTime();
    if (this.settings.particles) this.explodeEmitter.explode(28, brick.cx, brick.cy);
    this.spawnRipple(brick.cx, brick.cy);
    this.bricks.forEach((b) => {
      if (!b.alive || b === brick) return;
      if (Math.hypot(b.cx - brick.cx, b.cy - brick.cy) < GAME.EXPLODE_RADIUS) {
        b.alive = false;
        this.score += GAME.SCORE_BRICK;
        if (this.settings.particles) this.burstHit(b.cx, b.cy, b.fillColor(), 4);
      }
    });
  }

  spawnRipple(x, y) {
    const ring = this.add.image(x, y, 'ring').setDepth(32).setTint(0xffd23d).setBlendMode('ADD');
    ring.setScale(0.1).setAlpha(0.9);
    this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 620, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  destroyBrick(brick, fromBall) {
    brick.alive = false;
    audio.brick(fromBall ? this.combo : 0);
    if (fromBall) {
      this.combo++;
      const mult = Math.min(6, 1 + Math.floor(this.combo / 4));
      const pts = GAME.SCORE_BRICK * mult;
      this.score += pts;
      const col = mult > 1 ? '#ffd23d' : '#ffffff';
      this.floatText(brick.cx, brick.cy, (mult > 1 ? `+${pts} x${mult}` : `+${pts}`), col, mult > 1 ? 34 : 26);
    } else {
      this.score += GAME.SCORE_BRICK;
    }
    if (this.settings.particles) this.burstHit(brick.cx, brick.cy, lerpColor(brick.fillColor(), 0xffffff, 0.4), 9);
    if (brick.type === 'explode') this.explode(brick);
    if (Math.random() < dropChance(this.level) && this.powers.length < GAME.MAX_POWERS) {
      this.powers.push(new PowerUp(this, brick.x, brick.y, pick(POWER_KEYS)));
    }
  }

  ballLost(ball) {
    ball.destroy();
    this.balls = this.balls.filter((b) => b !== ball);
    if (this.balls.length > 0) return;

    audio.lose();
    this.combo = 0;
    this.lives--;
    this.bus.emit('hud:life');
    this.powerSys.clearAll();
    this.paddle.reset();
    this.cameras.main.setRotation(0);

    if (this.lives <= 0) { this.gameOver(); return; }
    this.flash(pick(GAME_OVER_MESSAGES), '#ff3131', 1300);
    this.balls.push(new Ball(this, this.paddle));
  }

  enemyStun() {
    this.paddle.stun(800);
    this.combo = 0;
    this.cameras.main.flash(160, 120, 0, 0);
    if (this.settings.bulletTime) this.triggerBulletTime();
    if (this.settings.flashText) this.flash('STUN!', '#ff3131', 700);
    this.score = Math.max(0, this.score - GAME.SCORE_STUN_PENALTY);
    this.powerSys.clearAll();
    this.cameras.main.setRotation(0);
    audio.lose();
  }

  gameOver() {
    this.over = true;
    const hs = SaveManager.getHighScore();
    if (this.score > hs) SaveManager.setHighScore(this.score);
    this.scene.pause();
    this.scene.launch(SCENES.GAMEOVER, {
      score: this.score, highScore: Math.max(hs, this.score),
      continues: this.continues, message: pick(GAME_OVER_MESSAGES),
    });
  }

  doContinue() {
    if (this.continues <= 0) { this.doRestart(); return; }
    this.continues--;
    this.lives = GAME.STARTING_LIVES;
    this.over = false;
    this.powerSys.clearAll();
    this.paddle.reset();
    this.balls.forEach((b) => b.destroy());
    this.balls = [new Ball(this, this.paddle)];
    this.scene.resume();
    this.emitStats();
  }

  doRestart() {
    this.scene.stop(SCENES.HUD);
    this.scene.start(SCENES.GAME);
  }

  doResume() { this.scene.resume(); }

  completeLevel() {
    this.transitioning = true;
    this.combo = 0;
    if (this.score > SaveManager.getHighScore()) SaveManager.setHighScore(this.score);
    audio.levelUp();
    this.scene.pause();
    Monetization.maybeShowLevelInterstitial();
    this.scene.launch(SCENES.LEVEL_COMPLETE, { level: this.level, message: pick(LEVEL_CLEARED_MESSAGES) });
  }

  startNextLevel() {
    this.level++;
    this.lives++;
    this.powerSys.clearAll();
    this.cameras.main.setRotation(0);
    this.bricks.forEach((b) => b.destroy()); this.bricks = [];
    this.bullets.forEach((b) => b.destroy()); this.bullets = [];
    this.powers.forEach((p) => p.destroy()); this.powers = [];
    this.balls.forEach((b) => b.destroy());
    this.paddle.reset();
    this.balls = [new Ball(this, this.paddle)];
    this.blackHole = null; this.echo = false;
    this.spawnLevel();
    this.transitioning = false;
    this.scene.resume();
    this.flash('LEVEL ' + this.level, '#00ffc3', 1100);
    this.emitStats();
    this.emitPowers();
  }

  // ---------------- HUD ----------------
  emitStats() {
    this.bus?.emit('hud:stats', {
      score: this.score, lives: this.lives, level: this.level,
      bricksLeft: this.bricks.filter((b) => b.alive).length, combo: this.combo,
    });
  }

  emitPowers() {
    const list = this.powerSys.keys().map((k) => ({ key: k, ratio: this.powerSys.ratio(k), color: POWERS[k].color }));
    this.bus?.emit('hud:powers', list);
  }

  flash(text, color, ms = 800) {
    this.bus?.emit('hud:flash', { text, color, ms });
  }

  // ---------------- UPDATE ----------------
  update(time, delta) {
    const realDt = delta;
    this.bg.update(realDt / 1000);
    if (this.over || this.transitioning) return;

    if (this.bulletTimeRemaining > 0) {
      this.bulletTimeRemaining -= realDt;
      if (this.bulletTimeRemaining <= 0) this.timeScale = 1;
    }

    const ts = this.timeScale;
    const dtSec = Math.min(realDt / 1000, 1 / 20) * ts;
    const dtMs = realDt * ts;
    this.frame++;

    this.powerSys.tick(dtMs);

    if (this.cursors.left.isDown) this.paddle.moveByKeyboard(-1, realDt / 1000, ts);
    if (this.cursors.right.isDown) this.paddle.moveByKeyboard(1, realDt / 1000, ts);

    if (this.powerSys.isActive('Laser')) {
      this.laserAccum += dtMs;
      while (this.laserAccum >= GAME.LASER_FIRE_MS) {
        this.laserAccum -= GAME.LASER_FIRE_MS;
        this.spawnBullet(this.paddle.left + 14, this.paddle.top, -GAME.LASER_BULLET_SPEED, 'player');
        this.spawnBullet(this.paddle.right - 14, this.paddle.top, -GAME.LASER_BULLET_SPEED, 'player');
        audio.laser();
      }
    }

    this.updateBlackHole(dtSec);
    this.updateEcho();

    this.bricks.forEach((br) => {
      if (!br.alive) return;
      if (br.update(dtMs, this.freeze)) this.spawnBullet(br.cx, br.y + br.h, GAME.CANNON_BULLET_SPEED, 'enemy');
    });

    this.updateBalls(dtSec);
    this.updateBullets(dtSec, ts);
    this.updatePowers(dtSec, ts);

    const before = this.bricks.length;
    this.bricks = this.bricks.filter((b) => { if (!b.alive) { b.destroy(); return false; } return true; });
    if (this.bricks.length !== before) this.emitStats();

    this.paddle.sync();
    this.balls.forEach((b) => b.sync());
    this.bricks.forEach((b) => b.sync());
    this.bullets.forEach((b) => b.sync());
    this.powers.forEach((p) => p.sync());
    this.renderFieldFx();

    // launch hint
    const anyStuck = this.balls.some((b) => b.stuck);
    if (anyStuck !== this._hintShown) { this._hintShown = anyStuck; this.bus.emit('hud:hint', anyStuck); }

    if (this.bricks.length === 0) { this.completeLevel(); return; }
    this.emitStats();
  }

  updateBalls(dtSec) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];

      if (ball.stuck) {
        ball.x = clamp(this.paddle.x + ball.stuckOffset, ball.r, GAME.WIDTH - ball.r);
        ball.y = this.paddle.top - ball.r;
        continue;
      }

      // steering forces
      if (ball.missile) {
        const desired = Math.atan2(this.paddle.y - ball.y, this.paddle.x - ball.x);
        let cur = Math.atan2(ball.vy, ball.vx);
        const diff = Phaser.Math.Angle.Wrap(desired - cur);
        cur += clamp(diff, -3.2 * dtSec, 3.2 * dtSec);
        ball.vx = Math.cos(cur) * ball.speed;
        ball.vy = Math.sin(cur) * ball.speed;
      } else if (ball.gravity) {
        ball.vy += GAME.HEIGHT * 0.5 * dtSec;
        const sp = Math.hypot(ball.vx, ball.vy);
        const cap = ball.speed * 1.5;
        if (sp > cap) { const k = cap / sp; ball.vx *= k; ball.vy *= k; }
      }

      ball.x += ball.vx * dtSec;
      ball.y += ball.vy * dtSec;

      if (this.wrap) {
        if (ball.x < -ball.r) ball.x = GAME.WIDTH + ball.r;
        else if (ball.x > GAME.WIDTH + ball.r) ball.x = -ball.r;
      } else {
        if (ball.x <= ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); audio.wall(); }
        else if (ball.x >= GAME.WIDTH - ball.r) { ball.x = GAME.WIDTH - ball.r; ball.vx = -Math.abs(ball.vx); audio.wall(); }
      }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); audio.wall(); }

      if (this.powerSys.isActive('Shield') && ball.y + ball.r > GAME.HEIGHT - 16) {
        ball.vy = -Math.abs(ball.vy);
        ball.y = GAME.HEIGHT - 16 - ball.r;
        this.powerSys.clear('Shield');
        this.emitPowers();
      }

      if (ball.y > GAME.HEIGHT + ball.r) { this.ballLost(ball); continue; }

      // paddle collision
      if (ball.vy > 0 &&
        ball.x + ball.r > this.paddle.left && ball.x - ball.r < this.paddle.right &&
        ball.y + ball.r > this.paddle.top && ball.y - ball.r < this.paddle.y + this.paddle.h / 2) {
        const rel = (ball.x - this.paddle.x) / (this.paddle.w / 2);
        const ang = clamp(rel, -1, 1) * GAME.MAX_BOUNCE_ANGLE;
        ball.vx = ball.speed * Math.sin(ang);
        ball.vy = -Math.abs(ball.speed * Math.cos(ang));
        ball.y = this.paddle.top - ball.r;
        ball.enforceMinVertical();
        this.combo = 0; // combo resets on paddle touch
        audio.paddle();
        if (this.settings.particles) this.burstHit(ball.x, this.paddle.top, this.paddle.color(), 4);
        if (this.paddle.sticky) { ball.stuck = true; ball.stuckOffset = ball.x - this.paddle.x; }
      }

      this.ballBrickCollisions(ball);
    }
  }

  ballBrickCollisions(ball) {
    for (const br of this.bricks) {
      if (!br.alive) continue;
      if (ball.x + ball.r > br.x && ball.x - ball.r < br.x + br.w &&
          ball.y + ball.r > br.y && ball.y - ball.r < br.y + br.h) {

        if (!ball.teleport) {
          const oX = Math.min(ball.x + ball.r - br.x, br.x + br.w - (ball.x - ball.r));
          const oY = Math.min(ball.y + ball.r - br.y, br.y + br.h - (ball.y - ball.r));
          if (oX < oY) ball.vx *= -1; else ball.vy *= -1;
          ball.enforceMinVertical();
        }

        const oneShot = this.chargeReady;
        const killed = br.hit(oneShot ? 99 : 1);
        if (this.settings.particles) this.burstHit(ball.x, ball.y, 0xffffff, 5);
        if (oneShot) { this.chargeReady = false; this.powerSys.clear('ChargeShot'); this.balls.forEach((b) => (b.chargeReady = false)); }

        if (killed) this.destroyBrick(br, true);
        else audio.brick(0);
        if (!ball.teleport) break;
      }
    }
  }

  updateBlackHole(dtSec) {
    if (!this.blackHole) return;
    const bh = this.blackHole;
    bh.angle += 2 * dtSec;
    for (const b of this.bricks) {
      if (!b.alive) continue;
      const dx = bh.x - b.cx, dy = bh.y - b.cy;
      const dist = Math.hypot(dx, dy);
      if (dist >= bh.r) continue;
      const pull = ((bh.r - dist) / bh.r) * GAME.HEIGHT * 0.22 * dtSec;
      b.x += (dx / dist) * pull;
      b.y += (dy / dist) * pull;
      if (dist < 24) {
        b.alive = false;
        this.score += GAME.SCORE_BLACKHOLE;
        if (this.settings.particles) this.burstHit(b.cx, b.cy, 0xffffff, 3);
      }
    }
  }

  updateEcho() {
    if (!this.echo || !this.balls[0]) return;
    const count = this.echoSegments.length;
    const r = GAME.HEIGHT * 0.09;
    const cx = this.balls[0].x, cy = this.balls[0].y;
    this.echoSegments.forEach((alive, i) => {
      if (!alive) return;
      const ang = this.frame * 0.06 + (Math.PI * 2 / count) * i;
      const rx = cx + Math.cos(ang) * r, ry = cy + Math.sin(ang) * r;
      for (const b of this.bricks) {
        if (b.alive && rx > b.x && rx < b.x + b.w && ry > b.y && ry < b.y + b.h) {
          b.alive = false;
          this.score += GAME.SCORE_ECHO;
          this.echoSegments[i] = false;
          if (this.settings.particles) this.burstHit(rx, ry, POWERS.Echo.color, 4);
          break;
        }
      }
    });
  }

  updateBullets(dtSec, ts) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let remove = false;
      if (b.owner === 'enemy' && b.y > this.paddle.top && b.x > this.paddle.left && b.x < this.paddle.right) {
        this.enemyStun(); remove = true;
      } else if (b.owner === 'player') {
        for (const br of this.bricks) {
          if (!br.alive) continue;
          if (b.x > br.x && b.x < br.x + br.w && b.y > br.y && b.y < br.y + br.h) {
            const killed = br.hit(1);
            if (this.settings.particles) this.burstHit(b.x, b.y, 0xff3131, 4);
            if (killed) this.destroyBrick(br, false);
            remove = true; break;
          }
        }
      }
      if (!remove) { b.update(dtSec, ts); if (b.y < -20 || b.y > GAME.HEIGHT + 20) remove = true; }
      if (remove) { b.destroy(); this.bullets.splice(i, 1); }
    }
  }

  updatePowers(dtSec, ts) {
    for (let i = this.powers.length - 1; i >= 0; i--) {
      const p = this.powers[i];
      p.update(dtSec, ts, this.paddle);
      if (p.overlapsPaddle(this.paddle)) { this.applyPower(p.key); p.destroy(); this.powers.splice(i, 1); continue; }
      if (p.y > GAME.HEIGHT) { p.destroy(); this.powers.splice(i, 1); }
    }
  }

  renderFieldFx() {
    this.shieldGfx.clear();
    if (this.powerSys.isActive('Shield')) {
      this.shieldGfx.fillStyle(POWERS.Shield.color, 0.32 + 0.16 * Math.sin(this.frame * 0.2));
      this.shieldGfx.fillRect(0, GAME.HEIGHT - 16, GAME.WIDTH, 16);
    }

    this.blackHoleGfx.clear();
    if (this.blackHole) {
      const bh = this.blackHole;
      this.blackHoleGfx.fillStyle(0x000000, 0.7);
      this.blackHoleGfx.fillCircle(bh.x, bh.y, bh.r * 0.32);
      for (let k = 0; k < 3; k++) {
        this.blackHoleGfx.lineStyle(3, POWERS.BlackHole.color, 0.5 - k * 0.12);
        this.blackHoleGfx.beginPath();
        this.blackHoleGfx.arc(bh.x, bh.y, bh.r * (0.5 + k * 0.22), bh.angle + k, bh.angle + k + Math.PI * 1.5);
        this.blackHoleGfx.strokePath();
      }
    }

    this.echoGfx.clear();
    if (this.echo && this.balls[0]) {
      const count = this.echoSegments.length;
      const r = GAME.HEIGHT * 0.09;
      const cx = this.balls[0].x, cy = this.balls[0].y;
      this.echoGfx.fillStyle(POWERS.Echo.color, 0.85);
      this.echoSegments.forEach((alive, i) => {
        if (!alive) return;
        const ang = this.frame * 0.06 + (Math.PI * 2 / count) * i;
        this.echoGfx.fillCircle(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 8);
      });
    }
  }
}
