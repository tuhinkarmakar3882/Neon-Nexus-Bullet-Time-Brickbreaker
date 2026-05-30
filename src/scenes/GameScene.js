import Phaser from 'phaser';
import { GAME, SCENES, JARDINAIN } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { POWERS, rollPower } from '../config/PowerUps.js';
import { GAME_OVER_MESSAGES, LEVEL_CLEARED_MESSAGES } from '../config/Messages.js';
import { Background } from '../objects/Background.js';
import { Paddle } from '../objects/Paddle.js';
import { Ball } from '../objects/Ball.js';
import { Brick } from '../objects/Brick.js';
import { Bullet } from '../objects/Bullet.js';
import { PowerUp } from '../objects/PowerUp.js';
import { Jardinain } from '../objects/Jardinain.js';
import { Pot } from '../objects/Pot.js';
import { PowerUpSystem } from '../systems/PowerUpSystem.js';
import { buildLevel } from '../systems/LevelGenerator.js';
import { audio } from '../systems/AudioManager.js';
import { Monetization } from '../systems/Monetization.js';
import { SaveManager } from '../systems/SaveManager.js';
import { addCameraFx } from '../utils/UI.js';
import { pick, clamp } from '../utils/Helpers.js';

export class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create() {
    this.settings = SaveManager.loadSettings();
    addCameraFx(this, { bloom: 0.65 });
    this.bg = new Background(this, PAL.accent);
    this.drawArena();

    this.score = 0;
    this.lives = GAME.STARTING_LIVES;
    this.continues = GAME.CONTINUES;
    this.level = 1;
    this.combo = 0;
    this.timeScale = 1;
    this.bulletTimeRemaining = 0;
    this.over = false;
    this.transitioning = false;
    this.laserAccum = 0;
    this.frame = 0;
    this._hintShown = false;

    this.powerSys = new PowerUpSystem();
    this.powerSys.onExpire = (key) => this.onPowerExpire(key);

    this.paddle = new Paddle(this);
    this.balls = [new Ball(this, this.paddle)];
    this.bricks = [];
    this.bullets = [];
    this.powers = [];
    this.pots = [];
    this.jardinains = [];

    this.shieldGfx = this.add.graphics().setDepth(7);
    this.aimGfx = this.add.graphics().setDepth(23);

    this.createEmitters();
    this.spawnLevel();
    this.setupInput();

    this.scene.launch(SCENES.HUD);
    this.bus = this.game.events;
    this.emitStats();
    this.emitPowers();

    this.time.delayedCall(80, () => this.flash(this.isBoss ? 'FORTRESS' : 'LEVEL ' + this.level, this.isBoss ? '#ffd770' : '#2fe6c7', 1200));
    this.events.on('shutdown', () => this.cleanup());
  }

  cleanup() {
    this.bus?.emit('hud:flash', { text: '', color: '#fff', ms: 0 });
    this.bus?.emit('hud:hint', false);
  }

  drawArena() {
    const W = GAME.WIDTH, H = GAME.HEIGHT, wx = GAME.WALL_X, wt = GAME.WALL_TOP;
    const g = this.add.graphics().setDepth(5);
    const draw = (x, y, w, h) => {
      g.fillStyle(0x121830, 1); g.fillRect(x, y, w, h);
      g.fillStyle(0x222c4a, 1); g.fillRect(x + 2, y + 2, w - 4, h - 4);
    };
    draw(0, wt, wx, H - wt);
    draw(W - wx, wt, wx, H - wt);
    draw(0, wt - 14, W, 16);
    // inner energy edges
    g.lineStyle(2, PAL.accent, 0.5);
    g.lineBetween(wx, wt, wx, H);
    g.lineBetween(W - wx, wt, W - wx, H);
    g.lineBetween(wx, wt, W - wx, wt);
    // corner nodes
    g.fillStyle(PAL.accent, 0.9);
    [[wx, wt], [W - wx, wt]].forEach(([x, y]) => g.fillCircle(x, y, 5));
  }

  setupInput() {
    this.bus = this.game.events;
    this.input.on('pointermove', (p) => { if (!this.over && !this.transitioning) this.paddle.setPointer(p.worldX); });
    this.input.on('pointerdown', () => { if (this.over || this.transitioning) return; audio.resume(); this.releaseBalls(); });
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

  releaseBalls() { this.balls.forEach((b) => b.release()); }

  createEmitters() {
    this.hitEmitter = this.add.particles(0, 0, 'spark', {
      speed: { min: 90, max: 320 }, scale: { start: 0.9, end: 0 }, lifespan: 450, blendMode: 'ADD', emitting: false,
    }).setDepth(30);
    this.explodeEmitter = this.add.particles(0, 0, 'soft', {
      speed: { min: 180, max: 560 }, scale: { start: 1.3, end: 0 }, lifespan: 800, blendMode: 'ADD', emitting: false, tint: 0xffb24d,
    }).setDepth(31);
  }

  burst(x, y, color, count = 8) {
    if (!this.settings.particles) return;
    this.hitEmitter.setParticleTint(color); this.hitEmitter.explode(count, x, y);
  }

  floatText(x, y, msg, color, size = 28) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Orbitron, monospace', fontSize: size + 'px', fontStyle: 'bold', color }).setOrigin(0.5).setDepth(41);
    t.setShadow(0, 0, color, 10, true, true);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 720, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // ---------------- LEVEL ----------------
  spawnLevel() {
    const { bricks, isBoss } = buildLevel(this.level);
    this.isBoss = isBoss;
    this.bricks = bricks.map((b) => new Brick(this, b.x, b.y, b.w, b.h, b.type, b.color, this.level));
    // jardinains on nest bricks
    this.bricks.forEach((b) => {
      if (b.type === 'nest' && this.jardinains.length < JARDINAIN.MAX_ALIVE) {
        this.jardinains.push(new Jardinain(this, b));
      }
    });
    this.bg.setAccent(pick([PAL.accent, PAL.accent2, PAL.info, PAL.accent3]));
    this.emitStats();
  }

  destructiblesLeft() { return this.bricks.filter((b) => b.alive && b.type !== 'gold').length; }

  // ---------------- POWERS ----------------
  applyActiveStateToBall(ball) {
    ball.through = this.powerSys.isActive('Through');
    ball.bomb = this.powerSys.isActive('Bomb');
    ball.setMega(this.powerSys.isActive('Mega'));
  }

  applyPower(key) {
    const def = POWERS[key];
    if (!def) return;
    if (this.settings.flashText) this.flash(key.toUpperCase(), '#' + def.color.toString(16).padStart(6, '0'), 650);
    audio.power();
    if (def.bulletTime && this.settings.bulletTime) this.triggerBulletTime();
    if (def.kind === 'timed') this.powerSys.activate(key, def.dur);

    switch (key) {
      case 'Laser': this.paddle.laser = true; this.laserAccum = 0; break;
      case 'Expand': this.paddle.setWidth(this.paddle.baseW * 1.6); break;
      case 'Catch': this.paddle.sticky = true; break;
      case 'Magnet': this.paddle.magnet = true; break;
      case 'Slow': this.balls.forEach((b) => b.setSpeed(b.speed * 0.62)); break;
      case 'Shield': break;
      case 'Through': this.balls.forEach((b) => (b.through = true)); break;
      case 'Bomb': this.balls.forEach((b) => (b.bomb = true)); break;
      case 'Mega': this.balls.forEach((b) => b.setMega(true)); break;
      case 'Multi': this.doMulti(); break;
      case 'Life': this.lives++; this.bus.emit('hud:life'); break;
      case 'Warp': this.flash('WARP!', '#b14dff', 700); this.time.delayedCall(250, () => { if (!this.transitioning) this.completeLevel(); }); break;
    }
    this.emitPowers();
  }

  onPowerExpire(key) {
    switch (key) {
      case 'Laser': this.paddle.laser = false; break;
      case 'Expand': this.paddle.setWidth(this.paddle.baseW); break;
      case 'Catch': this.paddle.sticky = false; break;
      case 'Magnet': this.paddle.magnet = false; break;
      case 'Slow': this.balls.forEach((b) => b.setSpeed(GAME.BALL_MIN_SPEED * 1.12)); break;
      case 'Through': this.balls.forEach((b) => (b.through = false)); break;
      case 'Bomb': this.balls.forEach((b) => (b.bomb = false)); break;
      case 'Mega': this.balls.forEach((b) => b.setMega(false)); break;
    }
    this.emitPowers();
  }

  doMulti() {
    const src = [...this.balls];
    src.forEach((main) => {
      [0.45, -0.45].forEach((off) => {
        if (this.balls.length >= GAME.MAX_BALLS) return;
        const nb = new Ball(this, this.paddle);
        nb.stuck = false; nb.x = main.x; nb.y = main.y;
        const ang = Math.atan2(main.vy || -1, main.vx || 0) + off;
        nb.vx = Math.cos(ang) * nb.speed; nb.vy = Math.sin(ang) * nb.speed;
        nb.enforceMinVertical(); this.applyActiveStateToBall(nb);
        this.balls.push(nb);
      });
    });
  }

  triggerBulletTime() {
    if (this.bulletTimeRemaining <= 0) audio.bulletTime();
    this.timeScale = GAME.BULLET_TIME_SCALE;
    this.bulletTimeRemaining = GAME.BULLET_TIME_MS;
  }

  spawnBullet(x, y, vy) { if (this.bullets.length < GAME.MAX_BULLETS) this.bullets.push(new Bullet(this, x, y, vy)); }

  explodeAt(x, y, sourceColor) {
    audio.explode();
    this.cameras.main.shake(200, 0.009);
    if (this.settings.bulletTime) this.triggerBulletTime();
    if (this.settings.particles) this.explodeEmitter.explode(26, x, y);
    this.spawnRipple(x, y);
    this.bricks.forEach((b) => {
      if (!b.alive || b.type === 'gold') return;
      if (Math.hypot(b.cx - x, b.cy - y) < GAME.EXPLODE_RADIUS) {
        if (b.hit(99)) { this.score += GAME.SCORE_EXPLODE_CHAIN; if (this.settings.particles) this.burst(b.cx, b.cy, b.color, 4); }
      }
    });
  }

  spawnRipple(x, y) {
    const ring = this.add.image(x, y, 'ring').setDepth(32).setTint(0xffb24d).setBlendMode('ADD').setScale(0.1).setAlpha(0.9);
    this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  destroyBrick(brick, fromBall) {
    const exploded = brick.type === 'explosive';
    brick.alive = false;
    const base = brick.type === 'silver' ? GAME.SCORE_SILVER : GAME.SCORE_BRICK;
    audio.brick(fromBall ? this.combo : 0);
    if (fromBall) {
      this.combo++;
      const mult = Math.min(8, 1 + Math.floor(this.combo / 4));
      const pts = base * mult;
      this.score += pts;
      this.floatText(brick.cx, brick.cy, mult > 1 ? `+${pts} x${mult}` : `+${pts}`, mult > 1 ? '#ffd23d' : '#e8eefc', mult > 1 ? 32 : 24);
    } else {
      this.score += base;
    }
    if (this.settings.particles) this.burst(brick.cx, brick.cy, brick.color, 9);
    if (exploded) this.explodeAt(brick.cx, brick.cy, brick.color);
    if (Math.random() < this.dropChance() && this.powers.length < GAME.MAX_POWERS) {
      this.powers.push(new PowerUp(this, brick.cx - 1, brick.cy, rollPower()));
    }
  }

  dropChance() { return clamp(0.30 - this.level * 0.006, 0.14, 0.30); }

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
    if (this.lives <= 0) { this.gameOver(); return; }
    this.flash(pick(GAME_OVER_MESSAGES), '#ff5a6e', 1200);
    this.balls.push(new Ball(this, this.paddle));
  }

  potHitPaddle() {
    this.paddle.stun(750);
    this.combo = 0;
    this.cameras.main.flash(150, 120, 30, 0);
    if (this.settings.bulletTime) this.triggerBulletTime();
    if (this.settings.flashText) this.flash('POTTED!', '#ff5a6e', 650);
    this.score = Math.max(0, this.score - GAME.SCORE_STUN_PENALTY);
    audio.lose();
  }

  gameOver() {
    this.over = true;
    const hs = SaveManager.getHighScore();
    if (this.score > hs) SaveManager.setHighScore(this.score);
    this.scene.pause();
    this.scene.launch(SCENES.GAMEOVER, { score: this.score, highScore: Math.max(hs, this.score), continues: this.continues, message: pick(GAME_OVER_MESSAGES) });
  }

  doContinue() {
    if (this.continues <= 0) { this.doRestart(); return; }
    this.continues--; this.lives = GAME.STARTING_LIVES; this.over = false;
    this.powerSys.clearAll(); this.paddle.reset();
    this.balls.forEach((b) => b.destroy()); this.balls = [new Ball(this, this.paddle)];
    this.scene.resume(); this.emitStats();
  }

  doRestart() { this.scene.stop(SCENES.HUD); this.scene.start(SCENES.GAME); }
  doResume() { this.scene.resume(); }

  completeLevel() {
    this.transitioning = true;
    this.combo = 0;
    const bonus = GAME.SCORE_LEVEL_CLEAR + this.lives * 200;
    this.score += bonus;
    if (this.score > SaveManager.getHighScore()) SaveManager.setHighScore(this.score);
    audio.levelUp();
    this.scene.pause();
    Monetization.maybeShowLevelInterstitial();
    this.scene.launch(SCENES.LEVEL_COMPLETE, { level: this.level, message: pick(LEVEL_CLEARED_MESSAGES), bonus, score: this.score });
  }

  startNextLevel() {
    this.level++;
    this.lives++;
    this.powerSys.clearAll();
    this.bricks.forEach((b) => b.destroy()); this.bricks = [];
    this.bullets.forEach((b) => b.destroy()); this.bullets = [];
    this.powers.forEach((p) => p.destroy()); this.powers = [];
    this.pots.forEach((p) => p.destroy()); this.pots = [];
    this.jardinains.forEach((j) => j.destroy()); this.jardinains = [];
    this.balls.forEach((b) => b.destroy());
    this.paddle.reset();
    this.balls = [new Ball(this, this.paddle)];
    this.spawnLevel();
    this.transitioning = false;
    this.scene.resume();
    this.flash(this.isBoss ? 'FORTRESS' : 'LEVEL ' + this.level, this.isBoss ? '#ffd770' : '#2fe6c7', 1200);
    this.emitStats(); this.emitPowers();
  }

  emitStats() {
    this.bus?.emit('hud:stats', { score: this.score, lives: this.lives, level: this.level, bricksLeft: this.destructiblesLeft(), combo: this.combo });
  }
  emitPowers() {
    this.bus?.emit('hud:powers', this.powerSys.keys().map((k) => ({ key: k, ratio: this.powerSys.ratio(k), color: POWERS[k].color, letter: POWERS[k].letter })));
  }
  flash(text, color, ms = 800) { this.bus?.emit('hud:flash', { text, color, ms }); }

  // ---------------- UPDATE ----------------
  update(time, delta) {
    const realDt = delta;
    this.bg.update(realDt / 1000);
    if (this.over || this.transitioning) return;

    if (this.bulletTimeRemaining > 0) { this.bulletTimeRemaining -= realDt; if (this.bulletTimeRemaining <= 0) this.timeScale = 1; }
    const ts = this.timeScale;
    const dtSec = Math.min(realDt / 1000, 1 / 20) * ts;
    const dtMs = realDt * ts;
    this.frame++;

    this.powerSys.tick(dtMs);

    if (this.cursors.left.isDown) this.paddle.moveByKeyboard(-1, realDt / 1000, ts);
    if (this.cursors.right.isDown) this.paddle.moveByKeyboard(1, realDt / 1000, ts);

    if (this.paddle.laser && !this.paddle.stunned) {
      this.laserAccum += dtMs;
      while (this.laserAccum >= GAME.LASER_FIRE_MS) {
        this.laserAccum -= GAME.LASER_FIRE_MS;
        this.spawnBullet(this.paddle.left + 13, this.paddle.top, -GAME.LASER_BULLET_SPEED);
        this.spawnBullet(this.paddle.right - 13, this.paddle.top, -GAME.LASER_BULLET_SPEED);
        audio.laser();
      }
    }

    this.updateJardinains(dtMs, dtSec);
    this.updateBalls(dtSec);
    this.updateBullets(dtSec, ts);
    this.updatePots(dtSec, ts);
    this.updatePowers(dtSec, ts);

    const before = this.bricks.length;
    this.bricks = this.bricks.filter((b) => { if (!b.alive) { b.destroy(); return false; } return true; });
    if (this.bricks.length !== before) this.emitStats();

    this.paddle.sync();
    this.balls.forEach((b) => b.sync());
    this.bricks.forEach((b) => b.sync());
    this.bullets.forEach((b) => b.sync());
    this.pots.forEach((p) => p.sync());
    this.powers.forEach((p) => p.sync());
    this.renderFx();

    const anyStuck = this.balls.some((b) => b.stuck);
    if (anyStuck !== this._hintShown) { this._hintShown = anyStuck; this.bus.emit('hud:hint', anyStuck); }

    if (this.destructiblesLeft() === 0) { this.completeLevel(); return; }
    this.emitStats();
  }

  updateJardinains(dtMs, dtSec) {
    for (let i = this.jardinains.length - 1; i >= 0; i--) {
      const j = this.jardinains[i];
      if (j._destroyed) { this.jardinains.splice(i, 1); continue; }
      const wantThrow = j.update(dtMs, dtSec);
      if (wantThrow && this.pots.length < 8) {
        this.pots.push(new Pot(this, j.x, j.y, this.paddle.x));
        audio.blip(220);
      }
    }
  }

  updateBalls(dtSec) {
    const lw = GAME.WALL_X, rw = GAME.WIDTH - GAME.WALL_X, tw = GAME.WALL_TOP;
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (ball.stuck) {
        ball.x = clamp(this.paddle.x + ball.stuckOffset, lw + ball.r, rw - ball.r);
        ball.y = this.paddle.top - ball.r;
        continue;
      }
      ball.x += ball.vx * dtSec;
      ball.y += ball.vy * dtSec;

      if (ball.x <= lw + ball.r) { ball.x = lw + ball.r; ball.vx = Math.abs(ball.vx); audio.wall(); }
      else if (ball.x >= rw - ball.r) { ball.x = rw - ball.r; ball.vx = -Math.abs(ball.vx); audio.wall(); }
      if (ball.y < tw + ball.r) { ball.y = tw + ball.r; ball.vy = Math.abs(ball.vy); audio.wall(); }

      if (this.powerSys.isActive('Shield') && ball.y + ball.r > GAME.HEIGHT - 18) {
        ball.vy = -Math.abs(ball.vy); ball.y = GAME.HEIGHT - 18 - ball.r;
        this.powerSys.clear('Shield'); this.emitPowers();
      }

      if (ball.y > GAME.HEIGHT + ball.r) { this.ballLost(ball); continue; }

      // jardinains
      for (const j of this.jardinains) {
        if (j.hitBy(ball)) {
          j.knockout();
          this.score += GAME.SCORE_JARDINAIN;
          this.floatText(j.x, j.y, `+${GAME.SCORE_JARDINAIN}`, '#86e6b0', 30);
          this.burst(j.x, j.y, 0x86e6b0, 12);
          this.cameras.main.shake(120, 0.006);
          ball.vy = -Math.abs(ball.vy);
          audio.blip(880);
          break;
        }
      }

      // paddle
      if (ball.vy > 0 && ball.x + ball.r > this.paddle.left && ball.x - ball.r < this.paddle.right &&
        ball.y + ball.r > this.paddle.top && ball.y - ball.r < this.paddle.y + this.paddle.h / 2) {
        const rel = (ball.x - this.paddle.x) / (this.paddle.w / 2);
        const ang = clamp(rel, -1, 1) * GAME.MAX_BOUNCE_ANGLE;
        ball.vx = ball.speed * Math.sin(ang);
        ball.vy = -Math.abs(ball.speed * Math.cos(ang));
        ball.y = this.paddle.top - ball.r;
        ball.enforceMinVertical();
        this.combo = 0;
        audio.paddle();
        if (this.settings.particles) this.burst(ball.x, this.paddle.top, this.paddle.glowColor(), 4);
        if (this.paddle.sticky) { ball.stuck = true; ball.stuckOffset = clamp(ball.x - this.paddle.x, -this.paddle.w / 2, this.paddle.w / 2); }
      }

      this.ballBricks(ball);
    }
  }

  ballBricks(ball) {
    for (const br of this.bricks) {
      if (!br.alive) continue;
      if (ball.x + ball.r > br.x && ball.x - ball.r < br.x + br.w && ball.y + ball.r > br.y && ball.y - ball.r < br.y + br.h) {
        const passThrough = ball.through && br.type !== 'gold';
        if (!passThrough) {
          const oX = Math.min(ball.x + ball.r - br.x, br.x + br.w - (ball.x - ball.r));
          const oY = Math.min(ball.y + ball.r - br.y, br.y + br.h - (ball.y - ball.r));
          if (oX < oY) ball.vx *= -1; else ball.vy *= -1;
          ball.enforceMinVertical();
        }
        const dmg = ball.mega ? 2 : 1;
        const killed = br.hit(dmg);
        if (this.settings.particles) this.burst(ball.x, ball.y, 0xffffff, 4);
        if (killed) {
          if (ball.bomb) this.explodeAt(br.cx, br.cy, br.color);
          this.destroyBrick(br, true);
        } else if (!br.indestructible) {
          audio.brick(0);
        }
        if (!passThrough) break;
      }
    }
  }

  updateBullets(dtSec, ts) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let remove = false;
      for (const br of this.bricks) {
        if (!br.alive) continue;
        if (b.x > br.x && b.x < br.x + br.w && b.y > br.y && b.y < br.y + br.h) {
          if (br.type === 'gold') { remove = true; break; }
          const killed = br.hit(1);
          if (this.settings.particles) this.burst(b.x, b.y, 0xff5566, 4);
          if (killed) this.destroyBrick(br, false);
          remove = true; break;
        }
      }
      // bullets can knock jardinains too
      if (!remove) {
        for (const j of this.jardinains) {
          if (!j._destroyed && Math.hypot(b.x - j.x, b.y - j.y) < j.r) {
            j.knockout(); this.score += GAME.SCORE_JARDINAIN;
            this.floatText(j.x, j.y, `+${GAME.SCORE_JARDINAIN}`, '#86e6b0', 28);
            remove = true; break;
          }
        }
      }
      if (!remove) { b.update(dtSec, ts); if (b.y < -20) remove = true; }
      if (remove) { b.destroy(); this.bullets.splice(i, 1); }
    }
  }

  updatePots(dtSec, ts) {
    for (let i = this.pots.length - 1; i >= 0; i--) {
      const p = this.pots[i];
      p.update(dtSec, ts);
      if (p.hitsPaddle(this.paddle)) {
        this.potHitPaddle();
        this.burst(p.x, p.y, 0xc8773f, 8);
        p.destroy(); this.pots.splice(i, 1); continue;
      }
      if (p.y > GAME.HEIGHT + 40) { p.destroy(); this.pots.splice(i, 1); }
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

  renderFx() {
    this.shieldGfx.clear();
    if (this.powerSys.isActive('Shield')) {
      const a = 0.3 + 0.16 * Math.sin(this.frame * 0.2);
      this.shieldGfx.fillStyle(POWERS.Shield.color, a);
      this.shieldGfx.fillRect(GAME.WALL_X, GAME.HEIGHT - 18, GAME.WIDTH - GAME.WALL_X * 2, 16);
    }

    // aim line while any ball is stuck
    this.aimGfx.clear();
    const stuck = this.balls.find((b) => b.stuck);
    if (stuck) {
      this.aimGfx.fillStyle(0xffffff, 0.5);
      for (let d = 1; d <= 6; d++) {
        const yy = stuck.y - d * 26;
        if (yy < GAME.WALL_TOP) break;
        this.aimGfx.fillCircle(stuck.x, yy, 3 - d * 0.25);
      }
    }
  }
}
