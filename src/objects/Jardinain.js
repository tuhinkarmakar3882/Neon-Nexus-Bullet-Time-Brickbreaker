import { GAME, JARDINAIN, paddleSideInset } from '../config/Constants.js';
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
    ) * (this.tierDef.scale ?? 1);
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
    const coat = this.tierDef.coat ?? this.tierDef.tint ?? 0x7eb87a;
    const hat = this.tierDef.hat ?? 0xc84040;
    const g = this.scene.add.graphics();

    // tier outline glow
    g.lineStyle(2, coat, 0.55);
    g.strokeEllipse(0, r * 0.35, r * 1.25, r * 1.05);

    // shadow
    g.fillStyle(0x08050c, 0.35);
    g.fillEllipse(0, r * 0.95, r * 1.1, r * 0.28);

    // boots — heavy has steel toe caps
    g.fillStyle(this.tier === GNOME_TIER.HEAVY ? 0x2a2838 : 0x3d2818, 1);
    g.fillRoundedRect(-r * 0.55, r * 0.62, r * 0.45, r * 0.38, 3);
    g.fillRoundedRect(r * 0.1, r * 0.62, r * 0.45, r * 0.38, 3);
    if (this.tier === GNOME_TIER.HEAVY) {
      g.fillStyle(0x99aabb, 0.9);
      g.fillRect(-r * 0.52, r * 0.88, r * 0.38, r * 0.1);
      g.fillRect(r * 0.14, r * 0.88, r * 0.38, r * 0.1);
    }

    // coat / body
    g.fillStyle(coat, 1);
    g.fillRoundedRect(-r * 0.55, r * 0.05, r * 1.1, r * 0.65, 6);
    if (this.tier === GNOME_TIER.SPEED) {
      g.lineStyle(2, 0xffffff, 0.35);
      g.lineBetween(-r * 0.45, r * 0.15, r * 0.45, r * 0.55);
    }
    if (this.tier === GNOME_TIER.ELITE) {
      g.fillStyle(0xffd23d, 0.85);
      g.fillRect(-r * 0.55, r * 0.05, r * 1.1, r * 0.12);
      g.fillStyle(0xffffff, 0.25);
      g.fillRect(-r * 0.08, r * 0.18, r * 0.16, r * 0.42);
    } else {
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(-r * 0.08, r * 0.1, r * 0.16, r * 0.5);
    }
    if (this.tier === GNOME_TIER.VOLLEY) {
      g.fillStyle(0xff7744, 0.9);
      for (let i = -1; i <= 1; i++) g.fillCircle(i * r * 0.28, r * 0.38, r * 0.09);
    }

    // beard — speed has shorter beard
    g.fillStyle(0xf5ebe0, 0.95);
    const beardH = this.tier === GNOME_TIER.SPEED ? 0.42 : 0.55;
    g.fillEllipse(0, r * 0.28, r * 0.72, r * beardH);

    // face
    g.fillStyle(this.tier === GNOME_TIER.SNIPER ? 0xffd4c0 : 0xffd4c0, 1);
    g.fillCircle(0, r * 0.02, r * 0.38);
    g.fillStyle(0xff9a8a, 0.45);
    g.fillCircle(-r * 0.28, r * 0.08, r * 0.12);
    g.fillCircle(r * 0.28, r * 0.08, r * 0.12);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-r * 0.18, -r * 0.06, r * 0.11);
    g.fillCircle(r * 0.18, -r * 0.06, r * 0.11);
    g.fillStyle(0x1a1020, 1);
    g.fillCircle(-r * 0.16, -r * 0.04, r * 0.06);
    g.fillCircle(r * 0.2, -r * 0.04, r * 0.06);
    if (this.tier === GNOME_TIER.SNIPER) {
      g.lineStyle(2, 0x44ffaa, 0.9);
      g.strokeCircle(r * 0.22, -r * 0.04, r * 0.14);
      g.fillStyle(0x1a5040, 1);
      g.fillRect(-r * 0.38, -r * 0.12, r * 0.76, r * 0.08);
    }
    g.fillStyle(0xffb0a0, 1);
    g.fillCircle(0, r * 0.06, r * 0.09);

    // hat — shape per tier
    g.fillStyle(hat, 1);
    if (this.tier === GNOME_TIER.HEAVY) {
      g.fillRoundedRect(-r * 0.72, -r * 0.55, r * 1.44, r * 0.55, 4);
      g.fillRect(-r * 0.82, -r * 0.05, r * 1.64, r * 0.18);
    } else if (this.tier === GNOME_TIER.SPEED) {
      g.fillTriangle(-r * 0.35, r * 0.02, r * 0.35, r * 0.02, 0, -r * 1.55);
      g.lineStyle(2, 0xffffff, 0.7);
      g.lineBetween(-r * 0.55, -r * 0.55, r * 0.15, -r * 0.85);
    } else if (this.tier === GNOME_TIER.ELITE) {
      g.fillTriangle(-r * 0.65, r * 0.02, r * 0.65, r * 0.02, 0, -r * 1.35);
      g.fillStyle(0xffd23d, 1);
      for (let i = -1; i <= 1; i++) {
        g.fillTriangle(i * r * 0.22, -r * 1.35, i * r * 0.22 + r * 0.08, -r * 1.58, i * r * 0.22 - r * 0.08, -r * 1.58);
      }
      g.fillStyle(0xffffff, 0.35);
      g.fillRect(-r * 0.7, r * 0.0, r * 1.4, r * 0.14);
    } else if (this.tier === GNOME_TIER.SNIPER) {
      g.fillRoundedRect(-r * 0.55, -r * 0.35, r * 1.1, r * 0.38, 3);
      g.fillTriangle(-r * 0.25, -r * 0.35, r * 0.25, -r * 0.35, 0, -r * 0.95);
    } else if (this.tier === GNOME_TIER.VOLLEY) {
      g.fillTriangle(-r * 0.75, r * 0.02, r * 0.75, r * 0.02, 0, -r * 1.2);
      g.fillStyle(0xffaa66, 1);
      g.fillCircle(-r * 0.42, -r * 1.05, r * 0.12);
      g.fillCircle(r * 0.42, -r * 1.05, r * 0.12);
    } else {
      g.fillTriangle(-r * 0.65, r * 0.02, r * 0.65, r * 0.02, 0, -r * 1.35);
      g.fillStyle(0xffffff, 0.2);
      g.fillRect(-r * 0.7, r * 0.0, r * 1.4, r * 0.14);
    }
    g.fillStyle(0x2a1810, 0.5);
    g.fillRect(-r * 0.72, r * 0.08, r * 1.44, r * 0.1);

    if (this.tier === GNOME_TIER.HEAVY) {
      g.lineStyle(3, 0xccddee, 0.85);
      g.strokeCircle(0, r * 0.15, r * 0.85);
    }
    if (this.tier === GNOME_TIER.SNIPER) {
      g.lineStyle(2, 0x44ffaa, 0.85);
      g.strokeCircle(0, -r * 0.55, r * 0.35);
    }

    this.c.add(g);
    this.tip = this.scene.add.image(0, -r * 1.45, 'soft').setTint(hat)
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
    const inset = paddleSideInset();
    this.x = clamp(paddle.x, inset + this.r, GAME.WIDTH - inset - this.r);
    this.y = paddle.top - this.r - 1;
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

  update(dtMs, dtSec, envMult = 1, frozen = false, throwLevelScale = 1) {
    if (this._destroyed) return null;
    if (this.hitCooldown > 0) this.hitCooldown -= dtMs;
    if (frozen) return null;
    const ts = dtSec * envMult;
    const gravScale = this.gravityMult();
    const throwScale = Math.max(0.45, throwLevelScale);

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

      const throwRate = (this.scene.potThrowRateMult ?? this.scene.difficulty?.potThrowRateMult ?? 1)
        * (this.tier === GNOME_TIER.VOLLEY ? 1.08 : 1);
      this.throwTimer -= dtMs * envMult * throwRate * throwScale;
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

  missedBelowPaddle(paddle) {
    if (!paddle || this.state === JSTATE.EXITING) return false;
    if (this.vy <= 0) return false;
    // Miss only once the gnome has fallen past the paddle hull — not at ARENA_FLOOR,
    // which sits above the paddle when the canvas reserves bottom touch space.
    const missLine = paddle.y + paddle.h * 0.62;
    return this.y - this.r > missLine;
  }

  hitsPaddle(paddle) {
    if (!this.isAirborne || this.state === JSTATE.EXITING) return false;
    if (this.vy <= 0) return false;
    const pad = Math.max(6, this.r * 0.2);
    return this.x > paddle.left - this.r - pad
      && this.x < paddle.right + this.r + pad
      && this.y + this.r >= paddle.top - pad
      && this.y - this.r <= paddle.y + paddle.h * 0.55;
  }

  /** @deprecated Use missedBelowPaddle — kept for legacy callers. */
  hitFloor() {
    return this.missedBelowPaddle(this.scene?.paddle);
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
