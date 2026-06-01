import { GAME, JARDINAIN } from '../config/Constants.js';
import { GNOME_TIERS, GNOME_TIER, pickProjectile } from '../config/GnomeTiers.js';
import { rand, clamp } from '../utils/Helpers.js';

export const JSTATE = {
  POPPING: 'popping',
  IDLE: 'idle',
  FALLING: 'falling',
  CAPTURED: 'captured',
  EXITING: 'exiting',
};

/** Garden gnome — pops up on bricks during play, throws pots, juggle → power-up. */
export class Jardinain {
  constructor(scene, brick, tier = GNOME_TIER.NORMAL, opts = {}) {
    this.scene = scene;
    this.brick = brick;
    this.tier = tier;
    this.tierDef = GNOME_TIERS[tier] ?? GNOME_TIERS.normal;
    this.r = Math.max(
      14,
      Math.min(brick.h * 0.78, brick.w * 0.42, GAME.HEIGHT * 0.024),
    );
    this.bob = rand(0, Math.PI * 2);
    this.juggleCount = 0;
    this.vy = 0;
    this.vx = 0;
    this.lastThrowVxBias = 0;
    this.hitCooldown = 0;
    this.airborneMs = 0;
    this.brickBounceCount = 0;
    this.popElapsed = 0;

    const popping = opts.popping ?? false;
    this.state = popping ? JSTATE.POPPING : JSTATE.IDLE;
    this.throwTimer = popping
      ? rand(JARDINAIN.POST_POP_THROW_MIN_MS, JARDINAIN.POST_POP_THROW_MAX_MS)
      : rand(this.tierDef.throwMin, this.tierDef.throwMax);

    this.x = brick.cx;
    this.y = popping ? brick.y + brick.h + this.r : brick.y - this.r - 2;

    this.c = scene.add.container(this.x, this.y).setDepth(13);
    if (popping) this.c.setScale(0.12).setAlpha(0.5);
    this.draw();
  }

  get knocked() { return this.state !== JSTATE.IDLE && this.state !== JSTATE.POPPING; }
  get isAirborne() {
    return this.state === JSTATE.FALLING || this.state === JSTATE.CAPTURED || this.state === JSTATE.EXITING;
  }
  get canBeHit() { return this.state === JSTATE.IDLE; }

  draw() {
    const r = this.r;
    const body = this.tierDef.tint ?? 0x7eb87a;
    const g = this.scene.add.graphics();

    // shadow
    g.fillStyle(0x08050c, 0.35);
    g.fillEllipse(0, r * 0.95, r * 1.1, r * 0.28);

    // boots
    g.fillStyle(0x3d2818, 1);
    g.fillRoundedRect(-r * 0.55, r * 0.62, r * 0.45, r * 0.38, 3);
    g.fillRoundedRect(r * 0.1, r * 0.62, r * 0.45, r * 0.38, 3);

    // coat / body
    g.fillStyle(body, 1);
    g.fillRoundedRect(-r * 0.55, r * 0.05, r * 1.1, r * 0.65, 6);
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(-r * 0.08, r * 0.1, r * 0.16, r * 0.5);

    // beard
    g.fillStyle(0xf5ebe0, 0.95);
    g.fillEllipse(0, r * 0.28, r * 0.72, r * 0.55);

    // face
    g.fillStyle(0xffd4c0, 1);
    g.fillCircle(0, r * 0.02, r * 0.38);
    // cheeks
    g.fillStyle(0xff9a8a, 0.45);
    g.fillCircle(-r * 0.28, r * 0.08, r * 0.12);
    g.fillCircle(r * 0.28, r * 0.08, r * 0.12);
    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-r * 0.18, -r * 0.06, r * 0.11);
    g.fillCircle(r * 0.18, -r * 0.06, r * 0.11);
    g.fillStyle(0x1a1020, 1);
    g.fillCircle(-r * 0.16, -r * 0.04, r * 0.06);
    g.fillCircle(r * 0.2, -r * 0.04, r * 0.06);
    // nose
    g.fillStyle(0xffb0a0, 1);
    g.fillCircle(0, r * 0.06, r * 0.09);

    // hat
    const hatColor = this.tier === GNOME_TIER.HEAVY ? 0x8899aa : this.tier === GNOME_TIER.ELITE ? 0xd45d8c : 0xc84040;
    g.fillStyle(hatColor, 1);
    g.fillTriangle(-r * 0.65, r * 0.02, r * 0.65, r * 0.02, 0, -r * 1.35);
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(-r * 0.7, r * 0.0, r * 1.4, r * 0.14);
    g.fillStyle(0x2a1810, 0.5);
    g.fillRect(-r * 0.72, r * 0.1, r * 1.44, r * 0.1);

    if (this.tier === GNOME_TIER.HEAVY) {
      g.lineStyle(3, 0xccddee, 0.85);
      g.strokeCircle(0, r * 0.15, r * 0.85);
      g.fillStyle(0x8899aa, 0.4);
      g.fillCircle(0, -r * 0.55, r * 0.2);
    }
    if (this.tier === GNOME_TIER.SPEED) {
      g.lineStyle(2, 0xffd23d, 0.8);
      g.lineBetween(-r * 0.5, -r * 0.3, r * 0.5, -r * 0.3);
    }
    if (this.tier === GNOME_TIER.ELITE) {
      g.fillStyle(0xffd23d, 1);
      for (let i = -1; i <= 1; i++) {
        g.fillTriangle(i * r * 0.22, -r * 1.35, i * r * 0.22 + r * 0.08, -r * 1.55, i * r * 0.22 - r * 0.08, -r * 1.55);
      }
    }

    this.c.add(g);
    this.tip = this.scene.add.image(0, -r * 1.45, 'soft').setTint(hatColor)
      .setBlendMode('ADD').setDisplaySize(r * 0.7, r * 0.7).setAlpha(0.45);
    this.c.add(this.tip);
    this.gfx = g;
  }

  syncPosition() {
    this.c.setPosition(this.x, this.y);
    if (this.tip) this.tip.setAlpha(0.6 + 0.4 * Math.sin(this.bob * 2));
  }

  gravityMult() {
    return (this.tierDef.gravityMult ?? 1) * (this.scene.levelGravityScale ?? 1);
  }

  onHostDestroyed() {
    if (this.state !== JSTATE.IDLE) return;
    this.brick = null;
    this.brickBounceCount = 0;
    this.airborneMs = 0;
    this.enterFalling(-JARDINAIN.DISLODGE_SPEED * 0.5);
  }

  dislodge(fromBall = false, ballVy = 0) {
    if (this.state !== JSTATE.IDLE) return false;
    this.brick = null;
    const kick = fromBall
      ? -Math.max(JARDINAIN.DISLODGE_SPEED, Math.abs(ballVy) * 0.5 + 240)
      : -JARDINAIN.DISLODGE_SPEED * 0.65;
    this.hitCooldown = JARDINAIN.JUGGLE_HIT_COOLDOWN_MS;
    this.brickBounceCount = 0;
    this.airborneMs = 0;
    this.enterFalling(kick);
    return true;
  }

  enterFalling(initialVy = 0) {
    this.state = JSTATE.FALLING;
    this.vy = initialVy;
    this.vx = this.lastThrowVxBias * 0.3;
    if (this.juggleCount === 0) this.scene.onGnomeDislodged(this);
  }

  /** Missed juggle — slide off the bottom of the playfield. */
  beginExitFall() {
    if (this._destroyed || this.state === JSTATE.EXITING) return;
    this.state = JSTATE.EXITING;
    this.brick = null;
    this.vy = Math.max(this.vy, 220);
    this.vx += rand(-70, 70);
    this.scene.onGnomeEscaped?.(this);
  }

  isOffScreen() {
    return this.y - this.r > GAME.HEIGHT + 20
      || this.x < -this.r * 2
      || this.x > GAME.WIDTH + this.r * 2;
  }

  exitScreen() {
    if (this._destroyed) return;
    this.destroy();
  }

  onPaddleCatch(paddle) {
    this.juggleCount++;
    this.hitCooldown = JARDINAIN.JUGGLE_HIT_COOLDOWN_MS;
    this.state = JSTATE.CAPTURED;
    this.x = clamp(paddle.x, GAME.WALL_X + this.r, GAME.WIDTH - GAME.WALL_X - this.r);
    this.y = paddle.top - this.r;
    this.vy = -JARDINAIN.LAUNCH_SPEED * Math.max(0.55, 1 - this.juggleCount * 0.08);
    this.vx = 0;
    this.syncPosition();
    this.scene.onGnomeJuggle(this, this.juggleCount);
    this.scene.tweens.add({ targets: this.c, scaleY: 0.65, scaleX: 1.25, duration: 90, yoyo: true });
    if (this.juggleCount >= JARDINAIN.KNOCKOUT_JUGGLES) {
      this.knockout();
      return;
    }
    this.timeToFalling();
  }

  timeToFalling() {
    this.scene.time.delayedCall(80, () => {
      if (!this._destroyed && this.state === JSTATE.CAPTURED) this.state = JSTATE.FALLING;
    });
  }

  onBallJuggle(ball) {
    if (this.hitCooldown > 0) return;
    this.juggleCount++;
    this.hitCooldown = JARDINAIN.JUGGLE_HIT_COOLDOWN_MS;

    const lift = Math.max(220, Math.abs(ball.vy) * 0.45) / (1 + this.juggleCount * 0.18);
    this.vy = -lift;
    this.x = ball.x;
    this.y = ball.y - this.r - ball.r - 6;
    this.state = JSTATE.FALLING;
    this.scene.onGnomeJuggle(this, this.juggleCount);
    ball.vy = -Math.max(180, Math.abs(ball.vy) * 0.55);
    ball.y = this.y + this.r + ball.r + 4;
    ball.enforceMinVertical();

    if (this.juggleCount >= JARDINAIN.KNOCKOUT_JUGGLES) {
      this.knockout();
    }
  }

  onElectricPop() {
    this.scene.onGnomeElectricPop(this);
    this.destroy();
  }

  /** Returns projectile spawn info when throw triggers. */
  createThrowPayload(paddleX) {
    const projType = pickProjectile(this.tierDef);
    const spread = this.tierDef.throwVxSpread ?? 80;
    const brickDrift = this.brick?.moving ? Math.cos(this.brick.t + this.brick.movePhase) * this.brick.moveAmp * 2 : 0;
    this.lastThrowVxBias = brickDrift + rand(-spread, spread);
    return {
      type: projType,
      vxBias: this.lastThrowVxBias,
      tracking: this.tierDef.tracking && projType !== 'anchor',
      gravityScale: projType === 'anchor' ? 1.5 * this.gravityMult() : this.gravityMult(),
    };
  }

  update(dtMs, dtSec, envMult = 1, frozen = false) {
    if (this._destroyed) return null;
    if (this.hitCooldown > 0) this.hitCooldown -= dtMs;
    if (frozen) return null;
    const ts = dtSec * envMult;
    const gravScale = this.gravityMult();

    if (this.state === JSTATE.POPPING) {
      this.updatePopUp(dtMs);
      return null;
    }

    if (this.state === JSTATE.IDLE) {
      if (!this.brick?.alive) { this.onHostDestroyed(); return null; }
      this.bob += ts * 3;
      this.x = this.brick.cx;
      this.y = this.brick.y - this.r - 2 + Math.sin(this.bob) * 3;
      this.syncPosition();

      const throwRate = this.scene.potThrowRateMult ?? this.scene.difficulty?.potThrowRateMult ?? 1;
      this.throwTimer -= dtMs * envMult * throwRate;
      if (this.throwTimer <= 0) {
        const intervalMult = 1 / Math.max(0.35, throwRate);
        this.throwTimer = rand(
          this.tierDef.throwMin * intervalMult,
          this.tierDef.throwMax * intervalMult,
        );
        this.scene.tweens.add({ targets: this.c, scaleY: 0.7, scaleX: 1.2, duration: 110, yoyo: true });
        return 'throw';
      }
      return null;
    }

    if (this.state === JSTATE.FALLING || this.state === JSTATE.CAPTURED || this.state === JSTATE.EXITING) {
      this.airborneMs += dtMs;
      if (this.airborneMs >= JARDINAIN.MAX_AIRBORNE_MS) {
        this.vy = Math.max(this.vy, 360);
        this.vx *= 0.985;
      }
      this.vy += JARDINAIN.GRAVITY * gravScale * ts;
      this.x += this.vx * ts;
      this.y += this.vy * ts;
      this.vx *= this.state === JSTATE.EXITING ? 0.996 : 0.992;
      // Stuck floating — force downward fall
      if (this.state !== JSTATE.EXITING && this.airborneMs > 2500 && this.vy > -60 && this.vy < 120) {
        this.vy += 280 * ts;
      }
      this.syncPosition();
      if (this.state !== JSTATE.EXITING) {
        this.checkBrickProjectileHits();
        this.checkPortal();
      }
      if (this.isOffScreen()) this.exitScreen();
      return null;
    }

    return null;
  }

  checkPortal() {
    for (const br of this.scene.bricks) {
      if (!br.alive || br.type !== 'portal' || !br.portalLink) continue;
      if (this.x > br.x && this.x < br.x + br.w && this.y > br.y && this.y < br.y + br.h) {
        this.scene.teleportEntityToPortal(this, br);
        break;
      }
    }
  }

  checkBrickProjectileHits() {
    if (this.vy >= 0) return;
    if (this.brickBounceCount >= 4) return;
    for (const br of this.scene.bricks) {
      if (!br.alive || br.indestructible) continue;
      if (this.x > br.x && this.x < br.x + br.w && this.y - this.r < br.y + br.h && this.y > br.y) {
        if (br.hit(1)) this.scene.destroyBrick(br, false);
        this.brickBounceCount++;
        this.vy = Math.abs(this.vy) * 0.35 + 140;
        break;
      }
    }
  }

  hitsPaddle(paddle) {
    if (!this.isAirborne || this.state === JSTATE.EXITING) return false;
    if (this.vy <= 0) return false;
    return this.x > paddle.left - this.r && this.x < paddle.right + this.r &&
      this.y + this.r > paddle.top && this.y - this.r < paddle.y + paddle.h / 2;
  }

  hitFloor() {
    return this.vy > 0 && this.y + this.r >= GAME.HEIGHT - 8;
  }

  hitBy(ball) {
    if (this.state === JSTATE.POPPING || this.state === JSTATE.EXITING) return false;
    if (this.state === JSTATE.IDLE) {
      return Math.hypot(ball.x - this.x, ball.y - this.y) < this.r + ball.r;
    }
    if (this.isAirborne) {
      return Math.hypot(ball.x - this.x, ball.y - this.y) < this.r + ball.r + 4;
    }
    return false;
  }

  knockout() {
    if (this._destroyed) return;
    this.scene.onGnomeKnockout(this);
    this.destroy();
  }

  /** Rise-out-of-brick pop-up animation. */
  updatePopUp(dtMs) {
    if (!this.brick?.alive) {
      this.brick = null;
      this.enterFalling(-JARDINAIN.DISLODGE_SPEED * 0.4);
      return true;
    }
    this.popElapsed += dtMs;
    const t = clamp(this.popElapsed / JARDINAIN.POPUP_ANIM_MS, 0, 1);
    const ease = 1 - (1 - t) ** 3;
    const targetY = this.brick.y - this.r - 2;
    const startY = this.brick.y + this.brick.h + this.r;
    this.y = startY + (targetY - startY) * ease;
    this.x = this.brick.cx + Math.sin(this.popElapsed * 0.012) * (1 - ease) * 4;
    this.c.setScale(0.12 + 0.88 * ease);
    this.c.setAlpha(0.5 + 0.5 * ease);
    this.syncPosition();
    if (t >= 1) {
      this.state = JSTATE.IDLE;
      this.c.setScale(1).setAlpha(1);
      this.y = targetY;
      this.syncPosition();
    }
    return true;
  }

  /** Wobble + bob when the player loses a life. */
  playTauntLaugh() {
    if (this._destroyed || !this.c?.scene) return;
    this.scene.tweens.killTweensOf(this.c);
    this.scene.tweens.add({
      targets: this.c,
      angle: -10,
      duration: 90,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: this.c,
      scaleY: 1.18,
      scaleX: 0.88,
      duration: 110,
      yoyo: true,
      repeat: 3,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!this._destroyed && this.c?.scene) this.c.setScale(1).setAngle(0);
      },
    });
  }

  flee() {
    if (this._destroyed || this.state !== JSTATE.IDLE) return;
    this.brick = null;
    this.state = JSTATE.EXITING;
    this.vy = 280;
    this.vx = rand(-90, 90);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.scene.tweens.killTweensOf(this.c);
    this.c.destroy();
  }
}
