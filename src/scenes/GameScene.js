import Phaser from 'phaser';
import { GAME, SCENES, JARDINAIN, BRICK, DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { POWERS, powerFillColor, powerColorHex, resolvePowerKey, CANNON_TYPES, BALL_MODS, POWER_KEYS, powerDisplayName, powerPillLabel, powerHasBallMod, powerHasCannon, findActiveBallModKey, findActiveCannonKey } from '../config/PowerUps.js';
import { rollPower, rollPowerDraft, rollPositivePowerDraft, rollCapsuleVariant, rollBlessedPower } from '../config/DropTables.js';
import { mutatorDisplay } from '../config/Mutators.js';
import { goalProgressText } from '../config/LevelGoals.js';
import { rollContract } from '../config/GnomeContracts.js';
import { fusionTarget } from '../config/PowerFusion.js';
import { cosmeticById, PADDLE_HULLS, BALL_TRAILS, GARDEN_THEMES } from '../config/Cosmetics.js';
import { seasonalMutatorForDate } from '../config/SeasonalMutators.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { GAME_OVER_MESSAGES, LEVEL_CLEARED_MESSAGES } from '../config/Messages.js';
import { Background } from '../objects/Background.js';
import { Paddle } from '../objects/Paddle.js';
import { Ball } from '../objects/Ball.js';
import { Brick } from '../objects/Brick.js';
import { Bullet } from '../objects/Bullet.js';
import { PowerUp } from '../objects/PowerUp.js';
import { Jardinain, JSTATE } from '../objects/Jardinain.js';
import { GnomeProjectile } from '../objects/GnomeProjectile.js';
import { rollGnomeTier } from '../config/GnomeTiers.js';
import { Enemy } from '../objects/Enemy.js';
import { Gem } from '../objects/Gem.js';
import { PowerUpSystem } from '../systems/PowerUpSystem.js';
import { buildLevel } from '../systems/LevelGenerator.js';
import { StatusSystem } from '../systems/StatusSystem.js';
import { ChallengeSystem } from '../systems/ChallengeSystem.js';
import { audio } from '../systems/AudioManager.js';
import { Monetization } from '../systems/Monetization.js';
import { SaveManager } from '../systems/SaveManager.js';
import { RunPersistence } from '../systems/RunPersistence.js';
import { InputRouter } from '../systems/InputRouter.js';
import { hapticPulse } from '../systems/Haptics.js';
import { scaledBallBaseSpeed, difficultyFor } from '../systems/DifficultyScaler.js';
import { addCameraFx, spawnConfetti, makeButton } from '../utils/UI.js';
import { applySceneVfx } from '../utils/SceneVfx.js';
import { popScale, squashStretch, wobble, rippleRing, staggerDropIn, shardBurst, brickBreakFx, microShake, surgeText, hitSpark, brickNudge, launchBurst, risePop, tierPulse, dropIn, spinIn, powerAcquireBurst, powerPickupFx, explosiveImpactFx, fireImpactFx, electricImpactFx, frostImpactFx, comboFlare } from '../utils/MicroFx.js';
import { initBulletTimeFx, setBulletTimeIntensity, screenPunch, impactFlash, radialBlast, resetGameplayCamera, clearBulletTimeFx } from '../utils/BulletTimeFx.js';
import { pick, clamp, rand, mulberry32 } from '../utils/Helpers.js';
import { fitTextWidth, orbitronStyle, uiPx, wrapWidth } from '../utils/Typography.js';
import { resolveSettings } from '../config/VfxQuality.js';
import { gemsForLevelClear } from '../config/GemRewards.js';

const SCORE_ENEMY = 220;
const GEM_VALUE = 150;

export class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  init(data) {
    this._resumeData = data?.resume ?? null;
    this._newGame = data?.newGame ?? false;
  }

  create() {
    this.settings = resolveSettings(SaveManager.loadSettings());
    const musicSettings = SaveManager.loadSettings();
    audio.setSoundEnabled(musicSettings.sound);
    audio.setMusicEnabled(musicSettings.music);
    audio.setSfxVolume(musicSettings.sfxVolume ?? DEFAULT_SFX_VOLUME);
    audio.setMusicVolume(musicSettings.musicVolume ?? DEFAULT_MUSIC_VOLUME);
    audio.applyMusicSettings({ musicVolume: musicSettings.musicVolume });
    addCameraFx(this, this.settings);
    initBulletTimeFx(this);

    this.bg = new Background(this, PAL.accent, { preset: this.settings, gameplay: true });
    this.campaignSeed = this._resumeData?.campaignSeed ?? ((Date.now() ^ 0xdeadbeef) >>> 0);
    this.levelSeed = this._resumeData?.levelSeed ?? this.campaignSeed + 1;

    this.score = this._resumeData?.score ?? 0;
    this.lives = this._resumeData?.lives ?? GAME.STARTING_LIVES;
    this.continues = this._resumeData?.continues ?? GAME.CONTINUES;
    this.level = this._resumeData?.level ?? 1;
    this.combo = this._resumeData?.combo ?? 0;
    this.powerDropSeq = this._resumeData?.powerDropSeq ?? 0;
    this.timeScale = 1;
    this.bulletTimeRemaining = 0;
    this.bulletTimePeak = 1;
    this._nexusSlowMo = false;
    this._nexusBtMs = 0;
    this.hitStopRemaining = 0;
    this._completingLevel = false;
    this.over = false;
    this.transitioning = false;
    this.cannonCooldown = 0;
    this.frame = 0;
    this._hintShown = false;
    this.enemyTimer = 0;
    this.controlsInverted = false;
    this.activeBallMod = null;
    this.jardinainPressure = 1;
    this.bounceAccelMult = 1;
    this.levelGravityScale = 1;
    this.brickGap = BRICK.GAP;
    this.timeFreezeUntil = 0;
    this.uiScrambleUntil = 0;
    this.blackHole = null;
    this.squeezeActive = false;
    this._squeezeOrig = null;
    this._seenBrickTypes = new Set();
    this._seenPowers = new Set();
    this.gnomeStreak = 0;
    this.draftOpen = false;
    this._draftContainer = null;
    this._draftSource = 'gnome';
    this._draftQueue = [];
    this.btMeter = 0;
    this._pendingCompleteLevel = false;
    this.levelKnockouts = 0;
    this.levelStartTime = 0;
    this.potHitLevel = false;
    this.goalFail = false;
    this.contract = null;
    this.contractDone = false;
    this.maxJardinains = JARDINAIN.MAX_ALIVE;
    this.potThrowMult = 1;
    this.jugglePointMult = 1;
    this.scoreMultLevel = 1;
    this.shieldHitsLeft = 0;
    this.gambitAtCombo = 0;
    this.vineBlocks = [];
    this._firstNegativeRun = false;
    this._runPath = [];
    this._runPathFrame = 0;
    this.escortBrick = null;
    this.escortGlow = null;

    this.powerSys = new PowerUpSystem();
    this.powerSys.onExpire = (key) => this.onPowerExpire(key);
    this.statusSys = new StatusSystem(this);
    this.challengeSys = new ChallengeSystem(this);

    this.paddle = new Paddle(this);
    this.balls = [new Ball(this, this.paddle, 0)];

    if (this._resumeData?.activePowers) {
      this._resumeData.activePowers.forEach(({ key: rawKey, remaining }) => {
        const key = resolvePowerKey(rawKey);
        if (remaining > 0 && POWERS[key]?.kind === 'timed') {
          this.powerSys.activate(key, remaining);
          this.applyPowerSideEffects(key, true);
        }
      });
      this.balls.forEach((b) => this.applyActiveStateToBall(b));
      this.activeBallMod = findActiveBallModKey(this.powerSys);
    } else if (this._resumeData?.ballElement) {
      const legacy = { cannon: 'electric', fire: 'explosive', nuke: 'nuke' };
      const el = legacy[this._resumeData.ballElement] ?? this._resumeData.ballElement;
      if (el === 'explosive') this.balls[0].bomb = true;
      else if (el === 'nuke') this.balls[0].setElement('nuke');
      else this.balls[0].setElement(el);
      this.syncBallSpeed(this.balls[0], { reset: true });
    } else {
      this.balls.forEach((b) => this.applyActiveStateToBall(b));
    }

    this.bricks = [];
    this.bullets = [];
    this.powers = [];
    this.pots = [];
    this.jardinains = [];
    this.enemies = [];
    this.gems = [];

    this.arenaGfx = this.add.graphics().setDepth(5);
    this.shieldGfx = this.add.graphics().setDepth(7);
    this.fogGfx = this.add.graphics().setDepth(850).setScrollFactor(0).setAlpha(0);
    this.aimGfx = this.add.graphics().setDepth(23);

    this.applyEquippedCosmetics();
    this.createEmitters();
    this.spawnLevel();
    this._layoutW = GAME.WIDTH;
    this._layoutH = GAME.HEIGHT;
    this.setupInput();

    this.scene.launch(SCENES.HUD);
    this.bus = this.game.events;
    this.emitStats();
    this.emitGnomeStreak();
    this.emitBtMeter();
    this.bus?.emit('hud:treasury', { value: MetaProgress.getTreasury() });
    this.bus?.emit('hud:immersive', { on: true });
    this.game.events.on('req:gambit', () => this.cashComboGambit());
    this.game.events.on('req:nexus', () => this.trySpendNexus());
    this.game.events.on('req:gnome', () => this.trySpendGnome());
    this.events.once('shutdown', () => {
      this.game.events.off('req:gambit');
      this.game.events.off('req:nexus');
      this.game.events.off('req:gnome');
    });

    this.time.delayedCall(80, () => this.levelFlash());
    this.events.on('shutdown', () => this.cleanup());
  }

  /** Live VFX quality update from Settings (works while paused). */
  syncVfxSettings(settings) {
    this.settings = settings;
    applySceneVfx(this, settings);
    this.bg?.applyVfxPreset?.(settings);
  }

  relayout() {
    this.paddle.relayout();
    this.syncPaddleWidth();
    const sx = GAME.WIDTH / (this._layoutW || GAME.WIDTH);
    const sy = GAME.HEIGHT / (this._layoutH || GAME.HEIGHT);

    this.paddle.x = clamp(this.paddle.x * sx, GAME.WALL_X + this.paddle.w / 2, GAME.WIDTH - GAME.WALL_X - this.paddle.w / 2);

    this.balls.forEach((ball) => {
      ball.x = clamp(ball.x * sx, GAME.WALL_X + ball.r, GAME.WIDTH - GAME.WALL_X - ball.r);
      if (ball.stuck) {
        ball.y = this.paddle.top - ball.r;
      } else {
        ball.y *= sy;
      }
      this.syncBallSpeed(ball);
    });

    this.bricks.forEach((br) => {
      br.baseX *= sx;
      br.x = br.baseX;
      br.y *= sy;
      br.w *= sx;
      br.h *= sy;
      br.panel?.setSize?.(br.w, br.h);
      br.drawFx?.();
      br.sync?.();
    });

    this.jardinains.forEach((j) => {
      j.x *= sx;
      j.y *= sy;
      j.syncPosition?.();
    });

    this.bullets.forEach((b) => { b.x *= sx; b.y *= sy; });
    this.powers.forEach((p) => { p.x *= sx; p.y *= sy; p.sync?.(); });
    this.pots.forEach((p) => { p.x *= sx; p.y *= sy; p.sync?.(); });
    this.enemies.forEach((e) => { e.x *= sx; e.y *= sy; });
    this.gems.forEach((g) => { g.x *= sx; g.y *= sy; });

    this.drawArena(this.theme?.wall ?? PAL.accent);
    this.bg?.relayout?.();
    resetGameplayCamera(this);
    this._layoutW = GAME.WIDTH;
    this._layoutH = GAME.HEIGHT;
  }

  cleanup() {
    this.bus?.emit('hud:flash', { text: '', color: '#fff', ms: 0 });
    this.bus?.emit('hud:toast', { text: '', ms: 0 });
    this.bus?.emit('hud:hint', false);
    this.bus?.emit('hud:bulletTime', { active: false, ratio: 0 });
    if (this._draftContainer?.active) this._draftContainer.destroy();
    this._draftContainer = null;
    this.draftOpen = false;
    this._draftQueue = [];
    this._pendingCompleteLevel = false;
    if (this.btFx?.overlay?.active) this.btFx.overlay.destroy();
    if (this.btFx?.streaks?.active) this.btFx.streaks.destroy();
    this.btFx = null;
    resetGameplayCamera(this);
  }

  levelFlash() {
    const t = this.theme?.name || '';
    const band = this.difficulty?.label ?? '';
    const rating = this.difficulty?.rating ?? 1;
    const layout = this.layoutLabel ? `  ·  ${this.layoutLabel}` : '';
    const twist = this.twistLabel ? `  ·  ${this.twistLabel}` : '';
    this.flash(
      (this.isBoss ? 'FORTRESS' : 'LEVEL ' + this.level) + (band ? `  ·  ${band}` : '') + layout + twist + (t ? `  ·  ${t.toUpperCase()}` : ''),
      cssHex(this.isBoss ? PAL.gold : (this.theme?.bg ?? PAL.accent)), 1100,
      'high',
    );
    tierPulse(this, GAME.WIDTH / 2, GAME.HEIGHT * 0.32, rating, cssHex(this.isBoss ? PAL.gold : PAL.accent3));
    microShake(this, 0.003 + rating * 0.0004, 100);
    if (this.challengeSys?.mutator || this.challengeSys?.mutators?.length) {
      this.time.delayedCall(900, () => this.showMutatorIntroCard());
    }
    if (this.goal?.type && this.goal.type !== 'clear') {
      this.time.delayedCall(1400, () => this.showGoalIntroCard());
    }
  }

  showGoalIntroCard() {
    if (this.over || !this.goal || this.goal.type === 'clear') return;
    const W = GAME.WIDTH;
    const card = this.add.text(W / 2, GAME.HEIGHT * 0.52, `${this.goal.label}\n${this.goal.desc}`, {
      ...orbitronStyle(22, '#cfe9ff', { align: 'center', wordWrap: { width: wrapWidth(0.85) } }),
    }).setOrigin(0.5).setDepth(1200).setAlpha(0);
    this.tweens.add({ targets: card, alpha: 1, duration: 280, yoyo: true, hold: 1800, onComplete: () => card.destroy() });
  }

  applyEquippedCosmetics() {
    const eq = MetaProgress.getEquipped();
    const hull = cosmeticById(PADDLE_HULLS, eq.hull);
    const trail = cosmeticById(BALL_TRAILS, eq.trail);
    const theme = cosmeticById(GARDEN_THEMES, eq.theme);
    this.paddle.applyCosmetic(hull.tint);
    this.balls.forEach((b) => b.applyCosmetic(trail.tint, trail.id));
    if (theme?.accent) this.bg?.setAccent?.(theme.accent);
  }

  drawGhostPath(path) {
    if (!path?.length || !this._ghostGfx) return;
    const g = this._ghostGfx;
    g.clear();
    g.lineStyle(2, 0xffffff, 0.22);
    g.beginPath();
    path.forEach((p, i) => {
      if (i === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    });
    g.strokePath();
  }

  recordBallPath() {
    if (this.over || !this.balls.some((b) => !b.stuck)) return;
    this._runPathFrame++;
    if (this._runPathFrame % 4 !== 0) return;
    const b = this.balls[0];
    this._runPath.push({ x: b.x, y: b.y });
    if (this._runPath.length > 120) this._runPath.shift();
  }

  spawnPowerCapsule(x, y, keyOverride) {
    if (this.powers.length >= GAME.MAX_POWERS) return null;
    const seed = this.nextPowerDropSeed();
    const variant = rollCapsuleVariant(this.level, seed);
    let key = keyOverride ?? rollPower(this.level, seed);
    if (variant === 'blessed') key = rollBlessedPower(this.level, seed ^ 0xb1e55);
    if (variant === 'mystery') key = rollPower(this.level, seed ^ 0xbeef);
    const pwW = Math.max(68, GAME.WIDTH * 0.064);
    const ph = pwW * 0.4;
    const capsule = new PowerUp(this, x - pwW / 2, y - ph / 2, key, { variant });
    this.powers.push(capsule);
    rippleRing(this, x, y, { tint: powerFillColor(key), scale: 2, dur: 340 });
    return capsule;
  }

  spawnEscortAnchor() {
    const candidates = this.bricks.filter((b) => b.alive && !b.indestructible && b.type === 'normal');
    if (!candidates.length) return;
    const brick = candidates[Math.floor(Math.random() * candidates.length)];
    brick.escort = true;
    this.escortBrick = brick;
    this.escortGlow = this.add.image(brick.cx, brick.cy, 'orb')
      .setTint(0xffd23d).setDepth(12).setAlpha(0.75).setBlendMode('ADD')
      .setDisplaySize(brick.w * 1.2, brick.h * 1.2);
  }

  spawnBossPerchGnome() {
    const perchBricks = this.bricks.filter((b) =>
      b.alive && !this.brickOccupiedByGnome(b) && (b.type === 'boss' || b.type === 'reinforced' || b.type === 'gold'),
    );
    const brick = perchBricks[0] ?? this.bricks.find((b) => b.alive && !this.brickOccupiedByGnome(b));
    if (!brick) return;
    const j = new Jardinain(this, brick, 'elite', { popping: true });
    this.jardinains.push(j);
    risePop(this, j.c, { peak: 1.25 });
    rippleRing(this, brick.cx, brick.cy, { tint: 0xffd23d, scale: 2.8, dur: 420 });
    this.floatText(brick.cx, brick.y, 'FORTRESS GNOME!', cssHex(PAL.gold), 22);
  }

  showMutatorIntroCard() {
    if (this.over || this.transitioning) return;
    const ids = this.challengeSys?.mutators?.length
      ? this.challengeSys.mutators
      : (this.challengeSys?.mutator ? [this.challengeSys.mutator] : []);
    if (!ids.length) return;
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const card = this.add.container(W / 2, H * 0.38).setDepth(1200);
    const bg = this.add.graphics();
    const cw = Math.min(W * 0.88, 560);
    const ch = 120 + ids.length * 36;
    bg.fillStyle(0x0a0e1a, 0.94);
    bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 18);
    bg.lineStyle(2, 0xffd23d, 0.75);
    bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 18);
    const tag = this.add.text(0, -ch / 2 + uiPx(24, { min: 18, max: 24 }), ids.length > 1 ? 'LEVEL MUTATORS' : 'LEVEL MUTATOR', {
      ...orbitronStyle(14, '#8899aa', { fontStyle: 'bold' }),
    }).setOrigin(0.5);
    card.add([bg, tag]);
    ids.forEach((id, i) => {
      const info = mutatorDisplay(id);
      const t = this.add.text(0, -ch / 2 + uiPx(56, { min: 44, max: 56 }) + i * uiPx(34, { min: 28, max: 34 }), `${info.label} — ${info.desc}`, {
        ...orbitronStyle(15, cssHex(info.color), { align: 'center', wordWrap: { width: cw - 40 } }),
      }).setOrigin(0.5, 0);
      card.add(t);
    });
    card.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });
    this.time.delayedCall(2600, () => {
      if (!card.active) return;
      this.tweens.add({ targets: card, alpha: 0, y: card.y - 24, duration: 320, onComplete: () => card.destroy() });
    });
  }

  drawArena(accent) {
    const W = GAME.WIDTH, H = GAME.HEIGHT, wx = GAME.WALL_X, wt = GAME.WALL_TOP;
    const g = this.arenaGfx;
    g.clear();
    const slab = (x, y, w, h) => { g.fillStyle(0x121830, 1); g.fillRect(x, y, w, h); g.fillStyle(0x222c4a, 1); g.fillRect(x + 2, y + 2, w - 4, h - 4); };
    slab(0, wt, wx, H - wt);
    slab(W - wx, wt, wx, H - wt);
    slab(0, wt - 14, W, 16);
    g.lineStyle(2, accent, 0.55);
    g.lineBetween(wx, wt, wx, H);
    g.lineBetween(W - wx, wt, W - wx, H);
    g.lineBetween(wx, wt, W - wx, wt);
    g.fillStyle(accent, 0.9);
    g.fillCircle(wx, wt, 5); g.fillCircle(W - wx, wt, 5);
  }

  setupInput() {
    this.input.on('pointermove', (p) => {
      if (InputRouter.shouldBlockGameplay() || this.over || this.transitioning || this.draftOpen) return;
      this.paddle.setPointer(p.worldX);
      if (this.balls.some((b) => b.stuck)) {
        const off = clamp(p.worldX - this.paddle.x, -this.paddle.w / 2, this.paddle.w / 2);
        this.balls.forEach((b) => { if (b.stuck) b.stuckOffset = off; });
      }
    });
    this.input.on('pointerdown', (p) => {
      if (InputRouter.shouldBlockGameplay() || this.over || this.transitioning || this.draftOpen) return;
      if (p.y < GAME.WALL_TOP) return;
      const now = this.time.now;
      if (now - (this._lastTapMs ?? 0) < 320 && this.trySpendNexus()) {
        this._lastTapMs = now;
        audio.resume();
        return;
      }
      this._lastTapMs = now;
      audio.resume();
      this.handleTap(p.worldX);
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => {
      if (InputRouter.shouldBlockGameplay() || this.draftOpen) return;
      const now = this.time.now;
      if (now - (this._lastSpaceMs ?? 0) < 320 && this.trySpendNexus()) {
        this._lastSpaceMs = now;
        return;
      }
      this._lastSpaceMs = now;
      this.handleTap(this.paddle.x);
    });
    this.input.keyboard.on('keydown-ENTER', () => { if (!InputRouter.shouldBlockGameplay() && !this.draftOpen) this.handleTap(this.paddle.x); });
    this.input.keyboard.on('keydown-P', () => this.requestPause());
    this.input.keyboard.on('keydown-ESC', () => this.requestPause());
    this._onPauseReq = () => this.requestPause();
    this.game.events.on('req:pause', this._onPauseReq);
    this.events.once('shutdown', () => this.game.events.off('req:pause', this._onPauseReq));
  }

  requestPause() {
    // Always dismiss HUD overlays first — must not depend on guards below.
    this.bus?.emit('hud:flash', { text: '', ms: 0 });
    this.bus?.emit('hud:toast', { text: '', ms: 0 });

    if (this.over || this.transitioning) return;

    const sm = this.scene;
    if (!sm.isActive()) return;
    if (sm.isActive(SCENES.PAUSE)) return;
    if (InputRouter.isOverlayActive()) return;

    // Recover from a stuck paused state (game frozen without a menu overlay).
    if (sm.isPaused() && !this._completingLevel) {
      sm.resume();
    }
    if (sm.isPaused()) return;

    RunPersistence.saveRun(this);
    sm.pause();
    sm.launch(SCENES.PAUSE);
    InputRouter.onOverlayOpen(SCENES.PAUSE);
  }

  handleTap(worldX) {
    if (this.balls.some((b) => b.stuck)) {
      this.releaseBalls();
    }
  }

  releaseBalls() {
    this.balls.forEach((b) => {
      b.release();
      popScale(this, b.halo, { peak: 1.25, dur: 100 });
      launchBurst(this, b.x, b.y, b.tint());
    });
  }

  createEmitters() {
    const mult = this.settings.particleMult ?? 1;
    this.hitEmitter = this.add.particles(0, 0, 'spark-shard', {
      speed: { min: 90, max: 340 },
      scale: { start: 0.85 * mult, end: 0 },
      lifespan: 480,
      angle: { min: 0, max: 360 },
      rotate: { min: -240, max: 240 },
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(30);
    this.explodeEmitter = this.add.particles(0, 0, 'ember', {
      speed: { min: 160, max: 520 },
      scale: { start: 1.1 * mult, end: 0 },
      lifespan: 720,
      blendMode: 'ADD',
      emitting: false,
      tint: 0xffb24d,
    }).setDepth(31);
    this.dustEmitter = this.add.particles(0, 0, 'soft', {
      speed: { min: 20, max: 80 },
      scale: { start: 0.9 * mult, end: 0.2 },
      alpha: { start: 0.28, end: 0 },
      lifespan: 620,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(29);
  }

  burst(x, y, color, count = 8) {
    if (!this.settings.particles) return;
    const mult = this.settings.particleMult ?? 1;
    const n = Math.round(count * mult);
    this.hitEmitter.setParticleTint(color);
    this.hitEmitter.explode(n, x, y);
    this.dustEmitter.setParticleTint(color);
    this.dustEmitter.explode(Math.max(2, Math.round(n * 0.35)), x, y);
  }

  floatText(x, y, msg, color, size = 28) {
    const t = this.add.text(x, y, msg, { ...orbitronStyle(size, color, { fontStyle: 'bold' }) }).setOrigin(0.5).setDepth(41);
    fitTextWidth(t, wrapWidth(0.72), uiPx(14, { min: 12, max: 16 }));
    t.setShadow(0, 0, color, 10, true, true).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 120, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - uiPx(60, { min: 40, max: 60 }), alpha: 0, duration: 720, delay: 80, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  spawnLevel() {
    const { bricks, isBoss, theme, levelSeed, gravityScale, mutator, mutators, goal, difficulty, layoutLabel, twistLabel } = buildLevel(this.level, this.campaignSeed);
    this.difficulty = difficulty;
    this.bounceAccelMult = difficulty.bounceAccelMult;
    this.jardinainPressure = difficulty.gnomePressure;
    this.isBoss = isBoss;
    this.theme = theme;
    this.levelSeed = levelSeed;
    this.layoutLabel = layoutLabel;
    this.twistLabel = twistLabel;
    this.levelGravityScale = gravityScale ?? 1;
    this.goal = goal;
    this.levelKnockouts = 0;
    this.levelStartTime = this.time.now;
    this._livesAtLevelStart = this.lives;
    this.potHitLevel = false;
    this.goalFail = false;
    this.contract = rollContract(this.level, this.levelSeed);
    this.contractDone = false;
    this.potThrowMult = 1;
    this.jugglePointMult = 1;
    this.scoreMultLevel = 1;
    this.gambitAtCombo = 0;
    this.bricks = bricks.map((b) => new Brick(this, b.x, b.y, b.w, b.h, b.type, b.color, this.level, b));
    this.bricks.forEach((br, i) => {
      const spec = bricks[i];
      if (spec.portalLinkIndex != null) br.portalLink = this.bricks[spec.portalLinkIndex] ?? null;
      if (spec.linkedPartnerIndex != null) br.linkedPartner = this.bricks[spec.linkedPartnerIndex] ?? null;
    });
    staggerDropIn(this, this.bricks, { delay: 22, drop: 28, dur: 300 });
    this.initGnomeSpawner();
    this.bricks.forEach((b) => this.telegraphBrick(b));

    this.bg.setAccent(theme.bg);
    this.drawArena(theme.wall);
    let activeMutators = mutators ?? (mutator ? [mutator] : []);
    if (this.level >= 3 && this.level % 7 === 0) {
      const seasonal = seasonalMutatorForDate();
      if (seasonal?.id && !activeMutators.includes(seasonal.id)) {
        activeMutators = [...activeMutators, seasonal.id];
      }
    }
    this.challengeSys.onLevelStart(this.level, isBoss, this.levelSeed, null, activeMutators);
    this.ensureLevelWinnable();
    audio.setLevelMusic(this.level, this.levelSeed, {
      biome: theme.biome ?? 'garden',
      isBoss,
    });
    this.applyBrickDamageSnapshot();

    this.escortBrick = null;
    if (this.escortGlow) { this.escortGlow.destroy(); this.escortGlow = null; }
    if (this.goal?.type === 'escort') this.spawnEscortAnchor();
    if (this.goal?.type === 'bossPerch') this.spawnBossPerchGnome();

    this.maxEnemies = clamp(1 + Math.floor(this.level / 2) + difficulty.enemyCountBonus, 1, 8) + (isBoss ? 2 : 0);
    this.enemySpawnMs = clamp((9000 - this.level * 450) * difficulty.enemySpawnMult, 2600, 9000);
    this.enemyTimer = this.enemySpawnMs * 0.65;
    this.balls.forEach((b) => this.syncBallSpeed(b, { reset: true }));
    this.emitStats();
  }

  initGnomeSpawner() {
    this.gnomePopSeq = 0;
    const pressure = (this.jardinainPressure ?? 1) * (this.difficulty?.gnomePopupMult ?? 1);
    this.gnomeSpawnTimer = rand(
      JARDINAIN.POPUP_MIN_MS * 0.4,
      JARDINAIN.POPUP_MAX_MS * 0.55,
    ) / pressure;
  }

  brickOccupiedByGnome(brick) {
    return this.jardinains.some((j) =>
      !j._destroyed && j.brick === brick &&
      (j.state === JSTATE.IDLE || j.state === JSTATE.POPPING),
    );
  }

  tryPopupJardinain() {
    const rng = mulberry32((this.levelSeed ^ (this.gnomePopSeq++ * 0x9e3779b1) ^ 0x6a8bc7) >>> 0);
    const eligible = this.bricks.filter((b) =>
      b.alive && !b.indestructible && b.revealed && b.type !== 'invisible' && b.type !== 'gold' &&
      !this.brickOccupiedByGnome(b) &&
      (b.type === 'nest' || b.type === 'normal' || b.type === 'reinforced' || b.type === 'silver' || b.type === 'shifting'),
    );
    if (!eligible.length) return false;

    const weighted = [];
    for (const b of eligible) {
      const w = b.type === 'nest' ? 5 : 1;
      for (let i = 0; i < w; i++) weighted.push(b);
    }
    const brick = weighted[Math.floor(rng() * weighted.length)];
    const tier = rollGnomeTier(this.level, () => rng());
    const j = new Jardinain(this, brick, tier, { popping: true });
    this.jardinains.push(j);
    risePop(this, j.c, { peak: 1.2 });
    rippleRing(this, brick.cx, brick.cy, { tint: 0x7eb87a, scale: 2.4, dur: 360 });
    audio.gnomePop?.();
    this.floatText(brick.cx, brick.y + brick.h * 0.5, 'POP!', cssHex(PAL.accent3), 22);
    return true;
  }

  updateGnomeSpawner(dtMs) {
    if (this.over || this.transitioning || this._completingLevel) return;
    if (!this.balls.some((b) => !b.stuck)) return;

    this.gnomeSpawnTimer -= dtMs;
    if (this.gnomeSpawnTimer > 0) return;

    const diff = this.difficulty ?? { gnomeMaxAlive: JARDINAIN.MAX_ALIVE };
    const alive = this.jardinains.filter((j) => !j._destroyed).length;
    const pressure = (this.jardinainPressure ?? 1) * (this.difficulty?.gnomePopupMult ?? 1);

    if (alive >= diff.gnomeMaxAlive) {
      this.gnomeSpawnTimer = rand(2000, 4000) / pressure;
      return;
    }

    if (this.tryPopupJardinain()) {
      this.gnomeSpawnTimer = rand(JARDINAIN.POPUP_MIN_MS, JARDINAIN.POPUP_MAX_MS) / pressure;
    } else {
      this.gnomeSpawnTimer = rand(1500, 2800) / pressure;
    }
  }

  findGnomePerch(fromX) {
    const taken = new Set(
      this.jardinains
        .filter((j) => (j.state === JSTATE.IDLE || j.state === JSTATE.POPPING) && j.brick)
        .map((j) => j.brick),
    );
    const candidates = this.bricks.filter(
      (b) => b.alive && !b.indestructible && b.type !== 'invisible' && b.revealed && !taken.has(b),
    );
    candidates.sort((a, b) => Math.abs(a.cx - fromX) - Math.abs(b.cx - fromX));
    return candidates[0] ?? null;
  }

  airborneGnomeCount() {
    return this.jardinains.filter((j) => !j._destroyed && j.isAirborne).length;
  }

  jugglePoints(n) {
    const chain = Math.min(Math.max(1, n), GAME.JUGGLE_MAX_CHAIN);
    const C = Math.min(GAME.JUGGLE_CONCURRENCY_CAP, Math.max(1, this.airborneGnomeCount()));
    const concMult = 1 + (C - 1) * 0.3;
    return Math.round(GAME.JUGGLE_BASE * (GAME.JUGGLE_EXP ** (chain - 1)) * concMult * (this.jugglePointMult ?? 1) * GAME.GNOME_COMBO_MULT);
  }

  emitBtMeter() {
    this.bus?.emit('hud:btMeter', { value: this.btMeter, max: GAME.BT_METER_MAX });
  }

  addBtMeter(amount) {
    const prev = this.btMeter;
    this.btMeter = Math.min(GAME.BT_METER_MAX, this.btMeter + amount);
    this.emitBtMeter();
    if (prev < GAME.BT_METER_MAX && this.btMeter >= GAME.BT_METER_MAX) {
      this.flash('NEXUS FULL!', '#8ec5ff', 900);
      this.bus?.emit('hud:achieve', { meter: 'nexus' });
      audio.wowHit?.();
      this.requestPowerDraft('nexus');
    }
  }

  settleCameraAfterFx(ms = 100) {
    this.time.delayedCall(ms, () => {
      clearBulletTimeFx(this);
      resetGameplayCamera(this);
    });
  }

  trySpendNexus() {
    if (this.draftOpen) return true;
    if (this.btMeter >= GAME.BT_METER_BURST_COST) {
      this.requestPowerDraft('nexus');
      return true;
    }
    if (this.btMeter < GAME.BT_METER_SPEND) {
      this.bus?.emit('hud:toast', {
        text: this.btMeter > 0 ? `Nexus ${Math.round(this.btMeter)}% — need ${GAME.BT_METER_SPEND}% for slow-mo` : 'Break bricks to fill Nexus',
        ms: 1800,
      });
      return false;
    }
    const spent = this.btMeter;
    this.btMeter = 0;
    this.emitBtMeter();
    const ratio = spent / GAME.BT_METER_MAX;
    const ms = Math.round(GAME.BT_NEXUS_TIME_MS * (0.85 + ratio * 0.75));
    const intensity = GAME.BT_NEXUS_INTENSITY_MIN
      + ratio * (GAME.BT_NEXUS_INTENSITY_MAX - GAME.BT_NEXUS_INTENSITY_MIN);
    this.triggerBulletTime(ms, { intensity, punch: true, player: true, nexus: true, wow: true });
    this.flash('NEXUS SLOW-MO', '#8ec5ff', 500);
    hapticPulse(12);
    return true;
  }

  tryComboBank() {
    if (this.combo < GAME.COMBO_BANK_STEP || this.combo === this.gambitAtCombo) return;
    if (this.combo % GAME.COMBO_BANK_STEP !== 0) return;
    const payout = GAME.COMBO_BANK_PAYOUT * this.comboScoreMult();
    MetaProgress.addTreasury(payout);
    this.floatText(GAME.WIDTH / 2, GAME.HEIGHT * 0.35, `TREASURY +${payout}`, '#ffd23d', 24);
    this.bus?.emit('hud:treasury', { value: MetaProgress.getTreasury() });
    if (this.combo >= GAME.COMBO_GAMBIT_MIN && this.combo !== this.gambitAtCombo) {
      this.gambitAtCombo = this.combo;
      this.bus?.emit('hud:gambit', { combo: this.combo, mult: this.comboScoreMult() });
    }
  }

  cashComboGambit() {
    if (this.combo < GAME.COMBO_GAMBIT_MIN) return;
    const key = rollPower(this.level, this.nextPowerDropSeed());
    if (this.powers.length < GAME.MAX_POWERS) {
      this.spawnPowerCapsule(this.paddle.x, GAME.WALL_TOP + 40, key);
    } else {
      this.applyPower(key);
    }
    this.flash('GAMBIT!', powerColorHex(key), 650);
    this.combo = 0;
    MetaProgress.bumpStat('combosCashed');
  }

  spawnVineBlock(x, y, durMs = 3000) {
    const vine = this.add.rectangle(x, y, BRICK.WIDTH * 0.9, BRICK.HEIGHT * 0.9, 0x336633, 0.55).setDepth(9);
    const until = this.time.now + durMs;
    this.vineBlocks.push({ vine, until, x, y, w: BRICK.WIDTH * 0.9, h: BRICK.HEIGHT * 0.9 });
    this.bricks.forEach((b) => {
      if (b.alive && Math.abs(b.cx - x) < BRICK.WIDTH && Math.abs(b.cy - y) < BRICK.HEIGHT) {
        b.vineUntil = until;
      }
    });
  }

  /** Nexus meter bonus for a clutch edge save — only on paddle bounce near the corner. */
  awardClutchBounce(ball) {
    const rel = Math.abs((ball.x - this.paddle.x) / (this.paddle.w / 2));
    if (rel < 0.78) return;
    this.addBtMeter(GAME.BT_METER_NEAR_MISS_FILL);
    surgeText(this, ball.x, ball.y, 'CLUTCH!', '#8ec5ff', 28);
    rippleRing(this, ball.x, ball.y, { tint: 0x8ec5ff, scale: 2, dur: 320, depth: 32 });
    hitSpark(this, ball.x, ball.y, { tint: 0x8ec5ff, count: 5, spread: 18 });
    audio.clutch?.();
    hapticPulse(6);
  }

  comboScoreMult() {
    if (this.combo < 2) return 1;
    const step = this.difficulty?.comboStep ?? GAME.COMBO_MULT_STEP;
    return Math.min(GAME.COMBO_MULT_MAX, 1 + Math.floor(this.combo / step));
  }

  isTimeFrozen() {
    return this.time.now < this.timeFreezeUntil || this.powerSys.isActive('TimeFreeze');
  }

  fallGravityMult() {
    const hz = this.difficulty?.hazardSpeedMult ?? 1;
    return this.levelGravityScale * this.envSpeedMult() * hz;
  }

  spawnGnomePower(x, y, force = false) {
    if (!force && Math.random() >= GAME.GNOME_DROP_CHANCE) return false;
    const cap = this.spawnPowerCapsule(x, y);
    if (!cap) return false;
    hitSpark(this, x, y, { tint: powerFillColor(cap.key), count: 6, spread: 20 });
    return true;
  }

  emitGnomeStreak() {
    this.bus.emit('hud:gnomeStreak', {
      value: this.gnomeStreak,
      max: GAME.GNOME_STREAK_MAX,
    });
  }

  addGnomeStreak(amount) {
    if (this.draftOpen || this.over) return;
    const prev = this.gnomeStreak;
    this.gnomeStreak = Math.min(GAME.GNOME_STREAK_MAX, this.gnomeStreak + amount);
    this.emitGnomeStreak();
    if (prev < GAME.GNOME_STREAK_MAX && this.gnomeStreak >= GAME.GNOME_STREAK_MAX) {
      this.flash('GNOME STREAK READY!', cssHex(PAL.accent2), 900);
      this.bus?.emit('hud:achieve', { meter: 'gnome' });
      audio.wowHit?.();
      this.requestPowerDraft('gnome');
    }
  }

  trySpendGnome() {
    if (this.draftOpen) return true;
    if (this.gnomeStreak >= GAME.GNOME_STREAK_MAX) {
      this.requestPowerDraft('gnome');
      return true;
    }
    this.bus?.emit('hud:toast', {
      text: this.gnomeStreak > 0
        ? `Gnome ${Math.round(this.gnomeStreak)}% — clear levels to fill faster`
        : 'Knock out Jardinains to fill the Gnome meter',
      ms: 2000,
    });
    return false;
  }

  requestPowerDraft(source = 'gnome') {
    if (this.over) return;
    if (this.transitioning) {
      if (!this._draftQueue.includes(source)) this._draftQueue.push(source);
      return;
    }
    if (this.draftOpen) {
      if (!this._draftQueue.includes(source)) this._draftQueue.push(source);
      return;
    }
    this.openPowerDraft(source);
  }

  flushPendingDrafts() {
    if (this.draftOpen || this.over || this.transitioning || !this._draftQueue.length) return;
    const next = this._draftQueue.shift();
    this.time.delayedCall(400, () => this.openPowerDraft(next));
  }

  openPowerDraft(source = 'gnome') {
    if (this.draftOpen || this.over || this.transitioning) return;
    this.draftOpen = true;
    this._draftSource = source;
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const picks = rollPositivePowerDraft(this.level, this.nextPowerDropSeed(), 3);
    const container = this.add.container(0, 0).setDepth(2100);
    this._draftContainer = container;

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x020408, 0.72);
    container.add(dim);

    const isNexus = source === 'nexus';
    const title = this.add.text(W / 2, H * 0.22, isNexus ? 'NEXUS FULL' : 'GNOME STREAK', {
      ...orbitronStyle(22, '#8899aa', { fontStyle: 'bold' }),
    }).setOrigin(0.5);
    const subtitle = this.add.text(W / 2, H * 0.28, 'PICK ONE POWER', {
      ...orbitronStyle(40, cssHex(isNexus ? PAL.accent : PAL.accent2), { fontStyle: '900' }),
    }).setOrigin(0.5).setShadow(0, 0, cssHex(isNexus ? PAL.accent : PAL.accent2), 16, true, true);
    fitTextWidth(subtitle, wrapWidth(0.9), uiPx(22, { min: 18, max: 26 }));
    container.add([title, subtitle]);

    const btnW = Math.min(W * 0.86, uiPx(520, { max: 520 }));
    const btnH = uiPx(96, { min: 64, max: 96 });
    const gap = uiPx(16, { min: 10, max: 16 });
    const startY = H * 0.42;

    picks.forEach((key, i) => {
      const def = POWERS[key];
      const y = startY + i * (btnH + gap);
      const label = powerDisplayName(key).toUpperCase();
      const btn = makeButton(this, W / 2, y, label, () => this.pickDraftPower(key), {
        width: btnW,
        height: btnH,
        fontSize: '24px',
        color: powerFillColor(key),
        depth: 2101,
      });
      const hint = this.add.text(W / 2, y + btnH * 0.34, def?.desc ?? '', {
        ...orbitronStyle(13, '#a8c4e8', { align: 'center', wordWrap: { width: btnW - 32 } }),
      }).setOrigin(0.5, 0).setDepth(2102);
      container.add(btn);
      container.add(hint);
    });

    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 220 });
    rippleRing(this, W / 2, H * 0.3, { tint: isNexus ? PAL.accent : PAL.accent2, scale: 3.2, dur: 520 });
    audio.wowHit?.();
    hapticPulse(16);
  }

  pickDraftPower(key) {
    if (!this.draftOpen) return;
    this.draftOpen = false;
    if (this._draftSource === 'nexus') {
      this.btMeter = 0;
      this.emitBtMeter();
    } else {
      this.gnomeStreak = 0;
      this.emitGnomeStreak();
    }
    const c = this._draftContainer;
    this._draftContainer = null;
    if (c?.active) {
      this.tweens.add({
        targets: c,
        alpha: 0,
        duration: 180,
        onComplete: () => c.destroy(),
      });
    }
    const deferToNext = this._pendingCompleteLevel;
    if (deferToNext) {
      this._carryOverPower = key;
    } else {
      this.applyPower(key);
    }
    this.settleCameraAfterFx(150);
    const next = this._draftQueue.shift();
    if (next) {
      this.time.delayedCall(320, () => this.openPowerDraft(next));
    } else if (deferToNext) {
      this._pendingCompleteLevel = false;
      this.time.delayedCall(250, () => this.completeLevel());
    }
  }

  onGnomeDislodged(j) {
    const dropped = this.spawnGnomePower(j.x, j.y, Math.random() < GAME.GNOME_DISLODGE_DROP_CHANCE);
    this.floatText(j.x, j.y, dropped ? 'DROPPED!' : 'DISLODGED!', cssHex(PAL.accent3), 22);
  }

  onGnomeJuggle(j, n) {
    const pts = this.jugglePoints(n);
    this.score += pts;
    this.floatText(j.x, j.y, `JUGGLE +${pts}`, '#ffd23d', n > 2 ? 34 : 28);
    this.burst(j.x, j.y, 0xffd23d, 8);
    if (n >= 3) rippleRing(this, j.x, j.y, { tint: 0xffd23d, scale: 2.4, dur: 380 });
    if (n >= 4) {
      microShake(this, 0.005, 90);
      if (this.settings.bulletTime) this.triggerBulletTime(320, { intensity: 0.65 });
    }
    this.cameras.main.shake(80, 0.004);
    audio.juggle?.(n);
    this.addGnomeStreak(GAME.GNOME_STREAK_JUGGLE);
  }

  onGnomeElectricPop(j) {
    const pts = this.jugglePoints(Math.max(1, j.juggleCount + 1));
    this.score += pts;
    this.floatText(j.x, j.y, `ZAP +${pts}`, '#a78bfa', 32);
    this.burst(j.x, j.y, 0xa78bfa, 14);
    radialBlast(this, j.x, j.y, { tint: 0xa78bfa, scale: 3.6 });
    if (this.settings.bulletTime) this.triggerBulletTime(420, { intensity: 0.85, punch: true });
    if (this.spawnGnomePower(j.x, j.y, true)) {
      this.floatText(j.x, j.y, 'POWER!', '#ffd23d', 26);
    }
    this.addGnomeStreak(GAME.GNOME_STREAK_JUGGLE);
  }

  onGnomeKnockout(j) {
    this.levelKnockouts++;
    MetaProgress.unlockCodex('gnomes', j.tier ?? 'normal');
    MetaProgress.bumpStat('knockouts');
    j.brick?.clearHostage?.();
    if (this.challengeSys?.gnomeParliament) this.addGnomeStreak(12);
    this.addBtMeter(GAME.BT_METER_KNOCKOUT_FILL);
    const pts = this.jugglePoints(Math.max(1, j.juggleCount)) + GAME.SCORE_JARDINAIN;
    this.score += pts;
    this.floatText(j.x, j.y, `KNOCKOUT +${pts}`, cssHex(PAL.accent2), 38);
    surgeText(this, j.x, j.y - 28, 'KNOCKOUT!', cssHex(PAL.accent2), 44);
    this.burst(j.x, j.y, PAL.accent2, 20);
    shardBurst(this, j.x, j.y, PAL.accent2, this.settings.reducedFx ? 8 : 14);
    radialBlast(this, j.x, j.y, { tint: PAL.accent2, scale: 5.2, dur: 620 });
    spawnConfetti(this, j.x, j.y, this.settings.reducedFx ? 24 : 48);
    if (this.settings.bulletTime) this.triggerBulletTime(680, { hitStop: true, punch: true, intensity: 1.15, wow: true });
    else {
      this.hitStopRemaining = GAME.HIT_STOP_MS;
      screenPunch(this, 0.07, 90);
    }
    this.cameras.main.shake(160, 0.009);
    audio.wowHit?.();
    audio.explode?.();
    if (this.spawnGnomePower(j.x, j.y, true)) {
      surgeText(this, j.x, j.y - 52, 'POWER!', '#ffd23d', 36);
    }
    this.addGnomeStreak(GAME.GNOME_STREAK_KNOCKOUT);
    this.checkContractProgress(j);
    this.emitStats();
  }

  checkContractProgress(j) {
    const c = this.contract;
    if (!c || this.contractDone) return;
    if (c.id === 'knockoutElite' && c.tier === 'elite' && j.tier === 'elite') {
      this.contractDone = true;
      this.applyPower(rollPower(this.level, this.nextPowerDropSeed()));
      this.flash('CONTRACT!', '#ffd23d', 650, 'high');
    } else if (c.id === 'knockoutElite' && c.tier !== 'elite' && this.levelKnockouts >= (c.target ?? 2)) {
      this.contractDone = true;
      this.applyPower(rollPower(this.level, this.nextPowerDropSeed()));
      this.flash('CONTRACT!', '#ffd23d', 650, 'high');
    } else if (c.id === 'juggleChain' && j.juggleCount >= (c.target ?? 4)) {
      this.contractDone = true;
      this.addGnomeStreak(GAME.GNOME_STREAK_MAX);
      this.flash('JUGGLE CONTRACT!', '#ffd23d', 650, 'high');
    }
  }

  onGnomeEscaped(j) {
    j.brick?.clearHostage?.();
    if (j.juggleCount > 0) {
      this.floatText(j.x, GAME.HEIGHT - 48, 'MISSED!', '#ff8899', 22);
    }
  }

  telegraphBrick(brick) {
    if (this._seenBrickTypes.has(brick.type)) return;
    this._seenBrickTypes.add(brick.type);
    const msgs = {
      gold: 'INDESTRUCTIBLE — route around it',
      steel: 'STEEL — needs Laser, Electric, or Explosive',
      silver: 'ARMORED — multiple hits required',
      explosive: 'EXPLOSIVE — chain reaction',
      nest: 'NEST — Jardinain may pop up here',
      boss: 'BOSS BRICK — 3 hits to destroy',
      reinforced: 'REINFORCED — multiple hits, cracks deepen',
      shifting: 'SHIFTING — glides horizontally',
      portal: 'PORTAL — teleports ball & gnomes',
    };
    if (msgs[brick.type]) this.time.delayedCall(400, () => this.toast(msgs[brick.type], 2200));
  }

  destructiblesLeft() {
    return this.bricks.filter((b) => b.alive && !b.indestructible).length;
  }

  isBallBreakable(br) {
    if (!br?.alive || br.indestructible) return false;
    if (br.type === 'hostage' && !br.hostageCleared) return false;
    if (this.challengeSys?.cannonsOnly && br.type === 'silver') return false;
    if (br.vineUntil > (this.time?.now ?? 0)) return true;
    return true;
  }

  ensureLevelWinnable() {
    if (this.challengeSys?.cannonsOnly) {
      this.bricks.forEach((b) => {
        if (!b.alive || b.type !== 'silver') return;
        b.type = 'reinforced';
        b.indestructible = false;
        b.maxHp = b.hp = clamp(b.hp, 2, 3);
        b.drawFx();
        b.sync?.();
      });
    }
    if (this.bricks.some((b) => this.isBallBreakable(b))) return;
    this.relieveSoftlock(true);
  }

  relieveSoftlock(silent = false) {
    let fixed = false;
    for (const b of this.bricks) {
      if (!b.alive || b.indestructible) continue;
      if (this.isBallBreakable(b)) continue;
      if (b.type === 'hostage') {
        b.clearHostage();
        b.hp = 1;
        b.maxHp = 1;
      } else if (b.type === 'silver') {
        b.type = 'reinforced';
        b.hp = b.maxHp = 2;
      } else {
        b.hp = 1;
      }
      b.drawFx();
      b.sync?.();
      fixed = true;
    }
    if (fixed && !silent) this.toast('Clear path opened', 1400);
  }

  applyBrickDamageSnapshot() {
    const damage = this._resumeData?.brickDamage;
    if (!damage?.length) return;
    damage.forEach(({ i, hp }) => {
      const b = this.bricks[i];
      if (b?.alive && hp > 0 && hp < b.maxHp) {
        b.hp = hp;
        b.drawFx();
      }
    });
    this._resumeData.brickDamage = null;
  }

  syncPaddleWidth() {
    this.paddle.baseW = GAME.PADDLE_BASE_WIDTH;
    let w = this.paddle.baseW * (this.paddle.widthPenaltyMult ?? 1);
    if (this.powerSys.isActive('WideGarden')) w *= POWERS.WideGarden.expandMult ?? 1.55;
    else if (this.powerSys.isActive('Expand')) w *= GAME.PADDLE_EXPAND_MULT;
    if (this.powerSys.isActive('Reduce')) w *= GAME.PADDLE_SHRINK_MULT;
    this.paddle.setWidth(w);
  }

  syncPaddleSpeedMult() {
    let m = 1;
    if (this.powerSys.isActive('FastPaddle')) m *= 1.45;
    if (this.powerSys.isActive('SlowPaddle')) m *= 0.55;
    this.paddle.speedMult = m;
  }

  envSpeedMult() {
    if (this.powerSys.isActive('SpeedUp')) return POWERS.SpeedUp.envSpeed ?? 1.5;
    if (this.powerSys.isActive('SlowDown')) return POWERS.SlowDown.envSpeed ?? 0.5;
    return 1;
  }

  syncBallSpeed(ball, opts = {}) {
    let sp = scaledBallBaseSpeed(this.level);
    if (ball.element === 'frost') sp *= 0.85;
    ball.baseSpeed = sp;

    if (opts.reset || ball.stuck) {
      ball.setSpeed(sp);
      return;
    }

    const cur = Math.hypot(ball.vx, ball.vy);
    if (cur > 0) {
      ball.setSpeed(clamp(cur, GAME.BALL_MIN_SPEED, GAME.BALL_MAX_SPEED));
    } else {
      ball.setSpeed(sp);
    }
  }

  clearOtherCannons(keepKey) {
    for (const k of this.powerSys.keys()) {
      if (k !== keepKey && powerHasCannon(k)) this.powerSys.clear(k);
    }
  }

  clearOtherBallMods(keepKey) {
    for (const k of this.powerSys.keys()) {
      if (k !== keepKey && powerHasBallMod(k)) this.powerSys.clear(k);
    }
  }

  setCannonFromPower(key) {
    const def = POWERS[key];
    if (!def?.cannon) return;
    this.clearOtherCannons(key);
    this.paddle.setCannon(def.cannon);
  }

  applyActiveStateToBall(ball) {
    ball.through = false;
    ball.bomb = false;
    ball.setMega(false);
    ball.wrap = false;
    ball.chargeShot = false;
    ball.missileMode = false;
    ball.gravityMode = false;
    ball.echoMode = false;
    ball.heavyMode = false;

    const modKey = this.activeBallMod && this.powerSys.isActive(this.activeBallMod) && powerHasBallMod(this.activeBallMod)
      ? this.activeBallMod
      : findActiveBallModKey(this.powerSys);

    if (modKey === 'ExplosiveBall') {
      this.activeBallMod = modKey;
      ball.bomb = true;
      ball.clearElement();
    } else if (modKey === 'NukeBall') {
      this.activeBallMod = modKey;
      ball.bomb = false;
      ball.setElement('nuke');
    } else if (modKey && POWERS[modKey]?.ballMod) {
      this.activeBallMod = modKey;
      ball.bomb = false;
      const mod = POWERS[modKey].ballMod;
      if (mod === 'teleport') ball.through = true;
      else if (mod === 'mega') ball.setMega(true);
      else if (mod === 'heavy') {
        ball.heavyMode = true;
        if (!ball.stuck) ball.setSpeed(Math.max(GAME.BALL_MIN_SPEED, ball.speed * 0.55));
      } else if (mod === 'wrap') ball.wrap = true;
      else if (mod === 'charge') ball.chargeShot = true;
      else if (mod === 'missile') ball.missileMode = true;
      else if (mod === 'gravity') ball.gravityMode = true;
      else if (mod === 'echo') ball.echoMode = true;
      else ball.setElement(mod);
    } else {
      this.activeBallMod = null;
      ball.bomb = false;
      ball.clearElement();
    }
    this.syncBallSpeed(ball);
  }

  applyPowerSideEffects(key, silent = false) {
    if (powerHasCannon(key)) {
      this.setCannonFromPower(key);
    } else if (powerHasBallMod(key)) {
      this.clearOtherBallMods(key);
      this.activeBallMod = key;
    }

    switch (key) {
      case 'Laser':
      case 'LaserII':
      case 'FireCannon':
      case 'IceCannon':
      case 'ShockCannon':
      case 'NapalmCannon':
        break;
      case 'Expand':
      case 'WideGarden':
      case 'Reduce':
        this.syncPaddleWidth();
        break;
      case 'Catch':
      case 'SuperCatch':
        this.paddle.sticky = true;
        break;
      case 'Magnet': this.paddle.magnet = true; break;
      case 'FastPaddle':
      case 'SlowPaddle': this.syncPaddleSpeedMult(); break;
      case 'Flip': this.controlsInverted = true; break;
      case 'SpeedUp':
        this.balls.forEach((b) => {
          if (!b.stuck) b.setSpeed(Math.min(GAME.BALL_MAX_SPEED, b.speed * 1.2));
        });
        break;
      case 'SlowDown':
        this.balls.forEach((b) => {
          if (!b.stuck) b.setSpeed(Math.max(GAME.BALL_MIN_SPEED, b.speed * 0.72));
        });
        break;
      case 'ExplosiveBall':
      case 'NukeBall':
      case 'FrozenBall':
      case 'ElectricBall':
      case 'ElectricBallII':
      case 'MegaBall':
      case 'HeavyBall':
      case 'Teleport':
      case 'Missile':
      case 'Gravity':
      case 'Echo':
      case 'ChargeShot':
      case 'Wrap':
        this.balls.forEach((b) => {
          this.chaosKickBall(b, key);
          this.applyActiveStateToBall(b);
        });
        break;
      case 'TimeFreeze':
        this.timeFreezeUntil = this.time.now + (POWERS.TimeFreeze.dur ?? 5000);
        break;
      case 'BlackHole':
        this.startBlackHole();
        break;
      case 'BrickFreeze':
        this.freezeMovingBricks(POWERS.BrickFreeze.dur ?? 10000);
        break;
      case 'Squeeze':
        this.applySqueeze(true);
        break;
      case 'Shield':
      case 'ShieldII':
        this.shieldHitsLeft = POWERS[key]?.shieldHits ?? 1;
        break;
    }
    // Always sync ball modifiers after any power change (covers resume + edge cases).
    this.balls.forEach((b) => this.applyActiveStateToBall(b));
  }

  /** Initial velocity nudge when chaos ball mods activate. */
  chaosKickBall(ball, key) {
    if (ball.stuck) return;
    const sp = ball.speed || ball.baseSpeed;
    const ang = Math.atan2(ball.vy, ball.vx);
    switch (key) {
      case 'Missile':
        ball.vx += Math.cos(ang + Math.PI * 0.42) * sp * 0.28;
        ball.vy += Math.sin(ang + Math.PI * 0.42) * sp * 0.28;
        break;
      case 'Gravity':
        ball.vy += sp * 0.22;
        ball.vx += (Math.random() - 0.5) * sp * 0.18;
        break;
      case 'Wrap':
        ball.vx *= 1.12;
        break;
      case 'Echo':
        ball.echoAngle = Math.random() * Math.PI * 2;
        break;
      default:
        break;
    }
  }

  playPowerAcquireFx(key, def, opts = {}) {
    const { skipPunch = false } = opts;
    const neg = def.polarity === 'neg';
    const tint = powerFillColor(key);
    const px = this.paddle.x;
    const py = this.paddle.top;
    const big = def.kind === 'instant' || def.bulletTime || key === 'BallSplitter';

    powerAcquireBurst(this, px, py, { tint, neg, big });
    popScale(this, this.paddle.body, { peak: neg ? 0.92 : 1.1, dur: neg ? 140 : 120, from: neg ? 1.05 : 0.94 });

    if (neg) {
      impactFlash(this, PAL.powerNeg, 0.28);
      microShake(this, 0.014, 180);
      if (!skipPunch) screenPunch(this, 0.045, 110);
      surgeText(this, px, py - 52, 'CURSED!', cssHex(PAL.powerNeg), 34);
      wobble(this, this.paddle.body, { angle: 14, dur: 300, repeat: 2 });
      this.balls.forEach((b) => {
        if (!b.stuck) wobble(this, b.core, { angle: 8, dur: 260, repeat: 1 });
      });
      this.settleCameraAfterFx(120);
      return;
    }

    if (!skipPunch) screenPunch(this, big ? 0.065 : 0.032, big ? 95 : 75);
    if (big) {
      radialBlast(this, px, py, { tint, scale: 4.2, dur: 520 });
      spawnConfetti(this, px, py - 20, this.settings.reducedFx ? 16 : 32);
      impactFlash(this, tint, 0.15);
    }
    if (CANNON_TYPES.includes(key)) {
      launchBurst(this, px, py, tint);
      shardBurst(this, px, py - 16, tint, this.settings.reducedFx ? 5 : 9);
    } else if (BALL_MODS.includes(key)) {
      this.balls.forEach((b) => {
        rippleRing(this, b.x, b.y, { tint, scale: 2.4, dur: 360 });
        risePop(this, b.core, { peak: 1.35, dur: 220 });
      });
    } else if (def.kind === 'timed') {
      rippleRing(this, px, py, { tint, scale: 2.8, dur: 440 });
    }
    powerPickupFx(this, key, px, py, def);
    this.settleCameraAfterFx(big ? 130 : 95);
  }

  applyPower(rawKey) {
    const key = resolvePowerKey(rawKey);
    const def = POWERS[key];
    if (!def) return;

    const fused = fusionTarget(key);
    if (fused && this.powerSys.isActive(key)) {
      this.powerSys.clear(key);
      this.flash('FUSION!', powerColorHex(fused), 700);
      this.applyPower(fused);
      return;
    }

    MetaProgress.unlockCodex('powers', key);

    if (key === 'Flip' && this.controlsInverted && this.powerSys.isActive('Flip')) {
      this.controlsInverted = false;
      this.powerSys.clear('Flip');
      this.flash('CONTROLS FIXED', cssHex(PAL.powerPos), 600);
      return;
    }

    if (powerHasBallMod(key)) this.clearOtherBallMods(key);
    if (powerHasCannon(key)) this.clearOtherCannons(key);

    if (!this._seenPowers.has(key)) {
      this._seenPowers.add(key);
      this.bus.emit('hud:toast', { text: def.desc, ms: 2200 });
    }

    const neg = def.polarity === 'neg';
    if (neg) {
      hapticPulse(20);
      if (!this._firstNegativeRun) {
        this._firstNegativeRun = true;
        this.cameras.main.setAlpha(0.55);
        this.time.delayedCall(500, () => this.cameras.main.setAlpha(this.challengeSys?.mutators?.includes('LowVisibility') ? 0.88 : 1));
      }
    }
    if (this.settings.flashText) this.flash(powerPillLabel(key), powerColorHex(key), 650);
    audio.powerPickup?.(key);
    const willBt = def.bulletTime && this.settings.bulletTime;
    if (willBt) this.triggerBulletTime(undefined, { punch: false, intensity: 0.9 });
    if (def.kind === 'timed') this.powerSys.activate(key, def.dur);
    if (powerHasBallMod(key)) this.activeBallMod = key;

    switch (key) {
      case 'BallSplitter': this.doMulti(); break;
      case 'ExtraPaddle':
        this.lives++;
        this.bus.emit('hud:life');
        rippleRing(this, this.paddle.x, this.paddle.y, { tint: powerFillColor('ExtraPaddle'), scale: 3, dur: 480 });
        break;
      case 'InstantWin':
        this.forceClearDestructibles();
        this.flash('LEVEL CLEAR!', cssHex(PAL.accent2), 650, 'high');
        this.time.delayedCall(250, () => {
          if (!this.transitioning && !this.draftOpen) this.completeLevel();
        });
        break;
      case 'Earthquake': this.doEarthquake(); break;
      case 'Shuffle': this.doShuffle(); break;
      case 'Joker': this.doJoker(); break;
      case 'GnomeRush': this.doGnomeRush(); break;
      case 'Shield':
      case 'ShieldII':
        this.shieldHitsLeft = def.shieldHits ?? 1;
        break;
      default: this.applyPowerSideEffects(key);
    }
    RunPersistence.saveRun(this);
    this.playPowerAcquireFx(key, def, { skipPunch: willBt });
  }

  onPowerExpire(key) {
    key = resolvePowerKey(key);
    if (powerHasCannon(key)) {
      const active = findActiveCannonKey(this.powerSys);
      if (!active) this.paddle.setCannon(null);
      else this.setCannonFromPower(active);
    }
    switch (key) {
      case 'Laser':
      case 'LaserII':
      case 'FireCannon':
      case 'IceCannon':
      case 'ShockCannon':
      case 'NapalmCannon':
        break;
      case 'Expand':
      case 'WideGarden':
      case 'Reduce':
        this.syncPaddleWidth();
        break;
      case 'Catch':
      case 'SuperCatch':
        this.paddle.sticky = false;
        break;
      case 'Magnet': this.paddle.magnet = false; break;
      case 'FastPaddle':
      case 'SlowPaddle': this.syncPaddleSpeedMult(); break;
      case 'Flip': this.controlsInverted = false; break;
      case 'SpeedUp':
      case 'SlowDown':
        this.balls.forEach((b) => b.setSpeed(b.baseSpeed));
        break;
      case 'TimeFreeze': this.timeFreezeUntil = 0; break;
      case 'BlackHole': this.stopBlackHole(); break;
      case 'Squeeze': this.applySqueeze(false); break;
      case 'Shield':
      case 'ShieldII':
        this.shieldHitsLeft = 0;
        break;
      case 'ExplosiveBall':
      case 'NukeBall':
      case 'FrozenBall':
      case 'ElectricBall':
      case 'ElectricBallII':
      case 'MegaBall':
      case 'HeavyBall':
      case 'Teleport':
      case 'Missile':
      case 'Gravity':
      case 'Echo':
      case 'ChargeShot':
      case 'Wrap':
        if (this.activeBallMod === key) {
          this.activeBallMod = findActiveBallModKey(this.powerSys);
        }
        break;
    }
    this.balls.forEach((b) => this.applyActiveStateToBall(b));
  }

  doEarthquake() {
    audio.explode?.();
    this.cameras.main.shake(450, 0.018);
    explosiveImpactFx(this, GAME.WIDTH / 2, GAME.HEIGHT * 0.35, PAL.accent3, { scale: 5, shake: 0.016, shards: 18 });
    this.flash('EARTHQUAKE!', cssHex(PAL.accent3), 800);
    this.jardinains.forEach((j) => {
      if (j._destroyed) return;
      if (j.state === JSTATE.IDLE) j.dislodge(false);
      else if (j.state === JSTATE.POPPING) {
        j.brick = null;
        j.enterFalling(-JARDINAIN.DISLODGE_SPEED * 0.55);
      }
    });
  }

  doGnomeRush() {
    this.flash('GNOME RUSH!', cssHex(PAL.powerNeg), 750);
    microShake(this, 0.016, 260);
    for (let i = 0; i < 2; i++) {
      this.time.delayedCall(i * 180, () => this.tryPopupJardinain());
    }
  }

  doJoker() {
    const pool = POWER_KEYS.filter((k) => k !== 'Joker' && !POWERS[k].joker);
    if (!pool.length) return;
    const pickKey = pool[(Math.random() * pool.length) | 0];
    this.flash(`JOKER → ${pickKey.replace(/([A-Z])/g, ' $1').trim()}`, powerColorHex('Joker'), 900);
    this.time.delayedCall(120, () => this.applyPower(pickKey));
  }

  doShuffle() {
    const types = ['normal', 'silver', 'reinforced', 'explosive', 'nest', 'shifting'];
    this.bricks.forEach((b) => {
      if (!b.alive || b.indestructible || b.type === 'boss' || b.type === 'portal') return;
      b.type = types[(Math.random() * types.length) | 0];
      b.maxHp = b.hp = 1;
      b.drawFx();
    });
    this.flash('SHUFFLE!', powerColorHex('Shuffle'), 700);
  }

  forceClearDestructibles() {
    for (const b of this.bricks) {
      if (!b.alive || b.indestructible) continue;
      b.alive = false;
      b.panel?.destroy();
      b.fx?.destroy();
      b.badge?.destroy();
      b.crackImg?.destroy();
    }
    this.bricks = this.bricks.filter((b) => b.alive);
    this.emitStats();
  }

  startBlackHole() {
    const alive = this.bricks.filter((b) => b.alive && !b.indestructible);
    if (!alive.length) return;
    const center = pick(alive);
    this.blackHole = { x: center.cx, y: center.cy, pulse: 0 };
    this._bhRing?.destroy();
    this._bhRing = this.add.image(center.cx, center.cy, 'ring')
      .setDepth(9).setTint(0x331122).setAlpha(0.22).setScale(0.65).setBlendMode('ADD');
    this.tweens.add({
      targets: this._bhRing,
      scale: 0.85,
      alpha: 0.12,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  pullBlackHole() {
    if (!this.blackHole || !this.powerSys.isActive('BlackHole')) return;
    const { x, y } = this.blackHole;
    const R = 120;
    for (const b of this.bricks) {
      if (!b.alive || b.indestructible) continue;
      const d = Math.hypot(b.cx - x, b.cy - y);
      if (d < R) {
        b.x += (x - b.cx) * 0.05;
        b.y += (y - b.cy) * 0.05;
        b.baseX = b.x;
        if (d < 30 && b.hit(99)) this.destroyBrick(b, false);
      }
    }
    if (this._bhRing?.active) this._bhRing.setPosition(x, y);
    this.blackHole.pulse++;
  }

  stopBlackHole() {
    this._bhRing?.destroy();
    this._bhRing = null;
    this.blackHole = null;
  }

  freezeMovingBricks(ms) {
    this.bricks.forEach((b) => {
      if (b.alive && (b.moving || b.type === 'shifting')) this.statusSys.freezeBrick(b, ms);
    });
    this.flash('BRICK FREEZE', powerColorHex('BrickFreeze'), 600);
  }

  applySqueeze(on) {
    if (on) {
      if (this.squeezeActive) return;
      this.squeezeActive = true;
      this._squeezeOrig = this.bricks.map((b) => ({
        b, w: b.w, h: b.h, x: b.x, y: b.y, baseX: b.baseX, moveAmp: b.moveAmp,
      }));
      this.bricks.forEach((br) => {
        if (!br.alive) return;
        const cx = br.x + br.w / 2;
        const cy = br.y + br.h / 2;
        br.w *= 0.7;
        br.h *= 0.7;
        br.x = cx - br.w / 2;
        br.y = cy - br.h / 2;
        br.baseX = br.x;
        br.moveAmp *= 0.7;
        br.panel?.setSize?.(br.w, br.h);
        br.drawFx?.();
        br.sync?.();
      });
    } else if (this.squeezeActive && this._squeezeOrig) {
      this._squeezeOrig.forEach(({ b, w, h, x, y, baseX, moveAmp }) => {
        if (!b.alive) return;
        b.w = w;
        b.h = h;
        b.x = x;
        b.y = y;
        b.baseX = baseX;
        b.moveAmp = moveAmp;
        b.panel?.setSize?.(b.w, b.h);
        b.drawFx?.();
        b.sync?.();
      });
      this.squeezeActive = false;
      this._squeezeOrig = null;
    }
  }

  updateEchoOrbs(ball, dtSec) {
    if (!ball.echoMode) return;
    ball.echoAngle += dtSec * GAME.ECHO_ORBIT_SPEED;
    const orbitR = ball.r * GAME.ECHO_ORBIT_RADIUS;
    const count = GAME.ECHO_ORBIT_COUNT;
    ball._echoCd = ball._echoCd ?? new Map();
    const now = this.time.now;
    for (let i = 0; i < count; i++) {
      const a = ball.echoAngle + (i * Math.PI * 2) / count;
      const ex = ball.x + Math.cos(a) * orbitR;
      const ey = ball.y + Math.sin(a) * orbitR;
      for (const br of this.bricks) {
        if (!br.alive || br.indestructible) continue;
        if ((ball._echoCd.get(br) ?? 0) > now) continue;
        const hitR = orbitR * 0.5 + Math.min(br.w, br.h) * 0.35;
        if (Math.hypot(ex - br.cx, ey - br.cy) > hitR) continue;
        if (br.hit(1)) {
          this.destroyBrick(br, true, ball);
          ball._echoCd.set(br, now + 140);
        }
      }
    }
  }

  fireCannons(worldX) {
    if (this.paddle.stunned || !this.paddle.cannonType) return;
    const now = this.time.now;
    const t = this.paddle.cannonType;
    const y = this.paddle.top;

    if (t === 'laser') {
      if (now < this.cannonCooldown) return;
      this.cannonCooldown = now + GAME.CANNON_FIRE_MS.laser;
      const laserKey = this.powerSys.isActive('LaserII') ? 'LaserII' : 'Laser';
      const widthMult = POWERS[laserKey]?.laserWidth ?? 1;
      const spread = 13 * widthMult;
      this.spawnProjectile(this.paddle.left + spread, y, { type: 'laser', vy: -GAME.LASER_BULLET_SPEED, laserWidth: widthMult });
      this.spawnProjectile(this.paddle.right - spread, y, { type: 'laser', vy: -GAME.LASER_BULLET_SPEED, laserWidth: widthMult });
      if (widthMult > 1.2) {
        this.spawnProjectile(this.paddle.x, y, { type: 'laser', vy: -GAME.LASER_BULLET_SPEED * 1.04, laserWidth: widthMult * 0.85 });
      }
      audio.laser();
    } else if (t === 'fire') {
      if (now < this.cannonCooldown) return;
      this.cannonCooldown = now + GAME.CANNON_FIRE_MS.fire;
      const jitter = rand(-80, 80);
      this.spawnProjectile(this.paddle.x + jitter * 0.3, y, { type: 'fire', vx: jitter * 0.5, vy: -500 });
      audio.fireHit?.() ?? audio.blip(320);
    } else if (t === 'ice') {
      if (now < this.cannonCooldown) return;
      this.cannonCooldown = now + GAME.CANNON_FIRE_MS.ice;
      this.spawnProjectile(this.paddle.x, y, { type: 'ice', vy: -1180 });
      audio.frostHit?.() ?? audio.blip(880);
    } else if (t === 'shock') {
      if (now < this.cannonCooldown) return;
      this.cannonCooldown = now + GAME.CANNON_FIRE_MS.shock;
      const rel = clamp((worldX - this.paddle.x) / (this.paddle.w / 2), -1, 1);
      this.spawnProjectile(this.paddle.x, y, { type: 'shock', vx: rel * 440, vy: -820, bounces: 4 });
      audio.blip(660);
    } else if (t === 'napalm') {
      if (now < this.cannonCooldown) return;
      this.cannonCooldown = now + GAME.CANNON_FIRE_MS.napalm;
      const jitter = rand(-60, 60);
      this.spawnProjectile(this.paddle.x + jitter * 0.25, y, { type: 'napalm', vx: jitter * 0.4, vy: -480 });
      audio.fireHit?.() ?? audio.blip(280);
    }
  }

  spawnProjectile(x, y, opts) {
    if (this.bullets.length < GAME.MAX_BULLETS) this.bullets.push(new Bullet(this, x, y, opts));
  }

  doMulti() {
    const maxBalls = navigator.maxTouchPoints > 0 ? GAME.MAX_BALLS_MOBILE : GAME.MAX_BALLS;
    const src = [...this.balls];
    src.forEach((main) => {
      if (this.balls.length >= maxBalls) return;
      const nb = new Ball(this, this.paddle, this.balls.length);
      nb.stuck = false; nb.x = main.x; nb.y = main.y;
      nb.vx = main.vx; nb.vy = main.vy;
      nb.setSpeed(main.speed);
      this.applyActiveStateToBall(nb);
      this.balls.push(nb);
      launchBurst(this, nb.x, nb.y, powerFillColor('BallSplitter'));
    });
    screenPunch(this, 0.05, 90);
  }

  triggerBulletTime(ms = GAME.BULLET_TIME_MS, opts = {}) {
    const { hitStop = false, punch = false, intensity = 1, wow = false, player = false, nexus = false } = opts;
    if (!this.settings.bulletTime && !hitStop && !player) return;
    if (hitStop) this.hitStopRemaining = Math.max(this.hitStopRemaining, GAME.HIT_STOP_MS);
    if (punch) screenPunch(this, wow ? 0.09 : 0.045);
    if (wow) impactFlash(this, nexus ? 0x4488ff : PAL.accent2, nexus ? 0.14 : 0.18);
    if (this.bulletTimeRemaining <= 0) audio.bulletTime();
    if (nexus) {
      this._nexusSlowMo = true;
      this._nexusBtMs = ms;
    }
    this.bulletTimePeak = Math.max(this.bulletTimePeak, intensity);
    this.bulletTimeRemaining = Math.max(this.bulletTimeRemaining, ms);
    this.bus?.emit('hud:bulletTime', { active: true, ratio: 1, nexus });
  }

  /** Fire cannon shot — smaller blast than explosive ball. */
  fireBlastAt(x, y, radiusMult = 1) {
    audio.fireHit?.();
    fireImpactFx(this, x, y, { tint: PAL.powerFire });
    this.cameras.main.shake(100, 0.005);
    if (this.settings.particles) this.burst(x, y, PAL.powerFire, 10);
    this.spawnRipple(x, y, PAL.powerFire);
    const R = GAME.EXPLODE_RADIUS * 0.75 * radiusMult;
    for (const b of this.bricks) {
      if (!b.alive || b.indestructible) continue;
      if (Math.hypot(b.cx - x, b.cy - y) < R && b.hit(99)) this.destroyBrick(b, false);
    }
  }

  /** Electric ball / shock — one-hit any brick type. */
  electricHitBrick(br, ball) {
    audio.cannonHit?.();
    electricImpactFx(this, br.cx, br.cy);
    this.spawnRipple(br.cx, br.cy, 0xa78bfa);
    if (this.settings.particles) this.burst(ball.x, ball.y, 0xa78bfa, 8);
    br.frostMarked = false;
    if (br.indestructible) {
      br.alive = false;
      this.destroyBrick(br, true, ball);
      return;
    }
    if (br.hit(999)) this.destroyBrick(br, true, ball);
    if (this.powerSys.isActive('ElectricBallII')) {
      for (const nb of this.bricks) {
        if (!nb.alive || nb === br || nb.indestructible) continue;
        if (Math.hypot(nb.cx - br.cx, nb.cy - br.cy) < br.w * 2.2 && nb.hit(2)) this.destroyBrick(nb, true, ball);
      }
    }
  }

  explodeGrid3x3(center, ball = null) {
    audio.explode();
    this.cameras.main.shake(200, 0.009);
    explosiveImpactFx(this, center.cx, center.cy, PAL.explosive, { scale: 3.6, shake: 0.009, shards: 14 });
    if (this.settings.particles) this.explodeEmitter.explode(26, center.cx, center.cy);
    this.spawnRipple(center.cx, center.cy, PAL.explosive);
    const cellW = center.w + BRICK.GAP;
    const cellH = center.h + BRICK.GAP;
    for (const b of this.bricks) {
      if (!b.alive || b.indestructible) continue;
      const colD = Math.round(Math.abs(b.cx - center.cx) / cellW);
      const rowD = Math.round(Math.abs(b.cy - center.cy) / cellH);
      if (colD <= 1 && rowD <= 1 && b.hit(99)) this.destroyBrick(b, true, ball);
    }
  }

  /** Nuke ball — cross-shaped row + column wipe. */
  explodeCrossAt(center, ball = null) {
    audio.explode();
    this.cameras.main.shake(320, 0.014);
    screenPunch(this, 0.08, 100);
    radialBlast(this, center.cx, center.cy, { tint: 0xff2244, scale: 5.5, dur: 680 });
    if (this.settings.bulletTime) this.triggerBulletTime(620, { intensity: 1.1, wow: true, hitStop: true });
    if (this.settings.particles) this.explodeEmitter.explode(40, center.cx, center.cy);
    this.spawnRipple(center.cx, center.cy, 0xff2244);
    for (const b of this.bricks) {
      if (!b.alive) continue;
      const sameRow = Math.abs(b.cy - center.cy) < center.h * 0.55;
      const sameCol = Math.abs(b.cx - center.cx) < center.w * 0.55;
      if (sameRow || sameCol) {
        if (b.indestructible) { b.alive = false; this.destroyBrick(b, true, ball); }
        else if (b.hit(99)) this.destroyBrick(b, true, ball);
      }
    }
  }

  chainExplosiveProximity(brick) {
    for (const b of this.bricks) {
      if (!b.alive || b.indestructible || b === brick) continue;
      if (b.color !== brick.color) continue;
      if (this.statusSys.gridDistance(brick, b) <= 2 && b.hit(1)) this.destroyBrick(b, false);
    }
  }

  teleportEntityToPortal(entity, entryPortal) {
    const exit = entryPortal?.portalLink;
    if (!exit?.alive || exit === entryPortal) return false;

    const now = this.time?.now ?? 0;
    if ((entity._portalGraceUntil ?? 0) > now) return false;

    const pos = this.portalExitPosition(exit, entryPortal, entity);
    entity.x = pos.x;
    entity.y = pos.y;
    entity._portalGraceUntil = now + GAME.PORTAL_GRACE_MS;
    entity.syncPosition?.();
    entity.sync?.();
    this.spawnRipple(exit.cx, exit.cy, 0x72f2eb);
    audio.blip(660);
    return true;
  }

  /** Place entity outside exit portal AABB along tunnel / velocity vector. */
  portalExitPosition(exit, entry, entity) {
    let nx = exit.cx - entry.cx;
    let ny = exit.cy - entry.cy;
    const tunnel = Math.hypot(nx, ny);
    if (tunnel > 10) {
      nx /= tunnel;
      ny /= tunnel;
    } else if (entity.vx != null && entity.vy != null) {
      const sp = Math.hypot(entity.vx, entity.vy);
      if (sp > 1) {
        nx = entity.vx / sp;
        ny = entity.vy / sp;
      } else {
        nx = 0;
        ny = -1;
      }
    } else {
      nx = 0;
      ny = -1;
    }

    const pad = (entity.r ?? 10) + 8;
    const halfW = exit.w / 2 + pad;
    const halfH = exit.h / 2 + pad;
    const scale = Math.abs(nx) > Math.abs(ny) ? halfW / Math.max(Math.abs(nx), 0.001)
      : halfH / Math.max(Math.abs(ny), 0.001);

    return {
      x: exit.cx + nx * scale,
      y: exit.cy + ny * scale,
    };
  }

  tryBallPortal(ball, entryPortal) {
    if (!entryPortal?.portalLink?.alive) return false;
    if (ball._portalGraceUntil > (this.time?.now ?? 0)) return false;
    return this.teleportEntityToPortal(ball, entryPortal);
  }

  trackStuckBall(ball, dtMs) {
    const sample = `${(ball.x / 8) | 0},${(ball.y / 8) | 0},${(ball.vx * 50) | 0},${(ball.vy * 50) | 0}`;
    if (!ball._stuckHist) { ball._stuckHist = []; ball._stuckMs = 0; }
    ball._stuckHist.push(sample);
    if (ball._stuckHist.length > 12) ball._stuckHist.shift();
    const stagnant = ball._stuckHist.length >= 10 && ball._stuckHist.every((s) => s === sample);
    if (stagnant) {
      ball._stuckMs += dtMs;
      if (ball._stuckMs >= GAME.STUCK_LOOP_MS) {
        this.nudgeBallOutOfOrbit(ball);
        ball._stuckMs = 0;
        ball._stuckHist = [];
      }
    } else {
      ball._stuckMs = 0;
    }
  }

  nudgeBallOutOfOrbit(ball) {
    const sp = Math.hypot(ball.vx, ball.vy) || ball.speed;
    const sign = ball.x < GAME.WIDTH / 2 ? 1 : -1;
    const ang = Math.atan2(ball.vy, ball.vx) + sign * GAME.STUCK_ANGLE_NUDGE;
    ball.vx = Math.cos(ang) * sp;
    ball.vy = Math.sin(ang) * sp;
    if (ball.vy > -sp * GAME.BALL_MIN_VERTICAL_RATIO) {
      ball.vy = -sp * GAME.BALL_MIN_VERTICAL_RATIO;
      ball.vx = sign * Math.sqrt(Math.max(0, sp * sp - ball.vy * ball.vy));
    }
    ball.enforceMinVertical();
  }

  brickPenetration(ball, br) {
    const ballLeft = ball.x - ball.r;
    const ballRight = ball.x + ball.r;
    const ballTop = ball.y - ball.r;
    const ballBottom = ball.y + ball.r;

    if (ballRight <= br.x || ballLeft >= br.x + br.w || ballBottom <= br.y || ballTop >= br.y + br.h) {
      return null;
    }

    const oLeft = ballRight - br.x;
    const oRight = br.x + br.w - ballLeft;
    const oTop = ballBottom - br.y;
    const oBottom = br.y + br.h - ballTop;
    const oX = Math.min(oLeft, oRight);
    const oY = Math.min(oTop, oBottom);

    if (Math.abs(oX - oY) <= 3) {
      let dx = ball.x - br.cx;
      let dy = ball.y - br.cy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      return { nx: dx, ny: dy, depth: Math.max(oX, oY), corner: true };
    }

    if (oX < oY) {
      return { nx: oLeft < oRight ? -1 : 1, ny: 0, depth: oX, corner: false };
    }
    return { nx: 0, ny: oTop < oBottom ? -1 : 1, depth: oY, corner: false };
  }

  resolveBallBrickCollision(ball, br, pen) {
    const pad = 1.5;
    const { nx, ny, depth, corner } = pen;

    if (corner) {
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;
      }
      ball.x += nx * (depth + pad);
      ball.y += ny * (depth + pad);
      return;
    }

    if (nx !== 0) {
      ball.vx = nx * Math.abs(ball.vx);
      ball.x = nx < 0 ? br.x - ball.r - pad : br.x + br.w + ball.r + pad;
    } else {
      ball.vy = ny * Math.abs(ball.vy);
      ball.y = ny < 0 ? br.y - ball.r - pad : br.y + br.h + ball.r + pad;
    }
  }

  guardBrickOrbit(ball, br) {
    if (ball.x + ball.r <= br.x || ball.x - ball.r >= br.x + br.w
      || ball.y + ball.r <= br.y || ball.y - ball.r >= br.y + br.h) {
      ball._orbitBrick = null;
      ball._orbitHits = 0;
      return;
    }
    if (ball._orbitBrick === br) {
      ball._orbitHits = (ball._orbitHits ?? 0) + 1;
    } else {
      ball._orbitBrick = br;
      ball._orbitHits = 1;
    }

    if (ball._orbitHits < 10) return;

    let dx = ball.x - br.cx;
    let dy = ball.y - br.cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const sp = Math.hypot(ball.vx, ball.vy) || ball.speed;
    ball.vx = dx * sp * 0.82;
    ball.vy = -Math.abs(sp * 0.78);
    ball.enforceMinVertical();
    ball.x += dx * 6;
    ball.y += dy * 6;
    ball._orbitHits = 0;
  }

  handleProjectileHit(p) {
    if (p.type === 'anchor') {
      this.paddle.applyAnchorShrink();
      this.syncPaddleWidth();
      this.toast('Anchor hit — paddle shrunk', 1400);
      audio.lose();
    } else if (p.type === 'phone') {
      if (Math.random() < 0.5) {
        this.controlsInverted = true;
        this.time.delayedCall(GAME.PHONE_SCRAMBLE_MS, () => {
          if (!this.powerSys.isActive('Flip')) this.controlsInverted = false;
        });
        this.toast('Controls scrambled!', 1400);
      } else {
        this.uiScrambleUntil = this.time.now + GAME.PHONE_SCRAMBLE_MS;
        this._uiScrambleTimer?.remove(false);
        this.bus.emit('hud:scramble', true);
        this._uiScrambleTimer = this.time.delayedCall(GAME.PHONE_SCRAMBLE_MS, () => {
          this.uiScrambleUntil = 0;
          this._uiScrambleTimer = null;
          this.bus.emit('hud:scramble', false);
        });
        this.toast('HUD glitch — stats flicker briefly', 1200);
      }
    } else {
      this.paddle.stun(GAME.POT_STUN_MS);
      wobble(this, this.paddle.body, { angle: 5, dur: 180, repeat: 0 });
      rippleRing(this, this.paddle.x, this.paddle.y, { tint: 0xc8773f, scale: 1.8, dur: 260 });
      this.toast('Potted!', 900);
      audio.lose();
    }
    this.burst(p.x, p.y, 0xc8773f, 8);
  }

  explodeAt(x, y) {
    audio.explode();
    this.cameras.main.shake(240, 0.012);
    screenPunch(this, 0.06, 85);
    radialBlast(this, x, y, { tint: PAL.explosive, scale: 4.8, dur: 580 });
    if (this.settings.bulletTime) this.triggerBulletTime(520, { intensity: 0.95, punch: false });
    if (this.settings.particles) this.explodeEmitter.explode(32, x, y);
    this.spawnRipple(x, y);
    this.bricks.forEach((b) => {
      if (!b.alive || b.type === 'gold') return;
      if (Math.hypot(b.cx - x, b.cy - y) < GAME.EXPLODE_RADIUS) {
        if (b.hit(99)) { this.score += GAME.SCORE_EXPLODE_CHAIN; if (this.settings.particles) this.burst(b.cx, b.cy, b.color, 4); }
      }
    });
  }

  spawnRipple(x, y, tint = 0xffb24d) {
    const ring = this.add.image(x, y, 'ring').setDepth(32).setTint(tint).setBlendMode('ADD').setScale(0.1).setAlpha(0.9);
    this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  bounceBallOffBrick(ball, br, passThrough) {
    if (passThrough) return;
    if (br.type === 'mirror') {
      ball.vx = (Math.random() - 0.5) * Math.abs(ball.speed) * 1.2;
      ball.vy *= -1;
      ball.enforceMinVertical();
      const pen = this.brickPenetration(ball, br);
      if (pen) this.resolveBallBrickCollision(ball, br, pen);
      return;
    }
    if (br.type === 'moss') ball.setSpeed(ball.speed * 0.78);

    const pen = this.brickPenetration(ball, br);
    if (!pen) return;

    this.resolveBallBrickCollision(ball, br, pen);
    ball.enforceMinVertical();

    if (br.indestructible || br.hp > 0) {
      this.guardBrickOrbit(ball, br);
    }

    if (br.alive && br.panel?.active) {
      brickNudge(this, br.panel, pen.nx, pen.ny);
      hitSpark(this, ball.x, ball.y, { tint: br.color, count: 3, spread: 14 });
    }
  }

  destroyBrick(brick, fromBall, ball = null) {
    if (brick.type === 'hostage' && !brick.hostageCleared) return;
    if (this.goal?.type === 'escort' && brick.escort) {
      this.goalFail = true;
      this.flash('ESCORT LOST!', '#ff8899', 900);
      if (this.escortGlow) { this.escortGlow.destroy(); this.escortGlow = null; }
      this.escortBrick = null;
    }
    if (fromBall && this.challengeSys?.cannonsOnly && brick.type === 'silver' && !this.paddle.hasCannon) return;

    this._lastBrickBreakAt = this.time.now;
    const exploded = brick.type === 'explosive' || brick.type === 'seedpod';
    brick.alive = false;
    MetaProgress.unlockCodex('bricks', brick.type);
    this.challengeSys.onBrickDestroyed(brick);

    this.jardinains.forEach((j) => {
      if (j.brick === brick && j.state === JSTATE.IDLE) j.onHostDestroyed();
    });

    const base = brick.type === 'silver' || brick.type === 'boss' || brick.type === 'reinforced'
      ? GAME.SCORE_SILVER : GAME.SCORE_BRICK;
    audio.brickBreak?.(brick.type, fromBall ? this.combo : 0, brick.hp) ?? audio.brick(fromBall ? this.combo : 0);
    if (fromBall) {
      this.combo++;
      this.addBtMeter(GAME.BT_METER_COMBO_FILL);
      this.tryComboBank();
      this.checkComboWow();
      const mult = this.comboScoreMult();
      const pts = Math.round(base * mult * (this.scoreMultLevel ?? 1));
      this.score += pts;
      this.floatText(brick.cx, brick.cy, mult > 1 ? `+${pts} x${mult}` : `+${pts}`, mult > 1 ? '#ffd23d' : '#e8eefc', mult > 1 ? 32 : 24);
    } else { this.score += base; }

    if (ball?.element === 'frost') audio.frostHit?.();
    if (brick.frostMarked) this.statusSys.spreadFrostFrom(brick);

    if (this.settings.particles) this.burst(brick.cx, brick.cy, brick.color, 9);
    let breakStyle = 'normal';
    if (exploded || ball?.element === 'explosive') breakStyle = 'explosive';
    else if (ball?.element === 'nuke') breakStyle = 'nuke';
    else if (ball?.element === 'frost') breakStyle = 'frost';
    else if (ball?.element === 'electric') breakStyle = 'electric';
    brickBreakFx(this, brick.cx, brick.cy, brick.color, {
      reduced: this.settings.reducedFx,
      particles: this.settings.particles,
      style: breakStyle,
    });
    if (brick.panel?.active) {
      this.tweens.add({
        targets: brick.panel,
        scaleX: 0.2,
        scaleY: 0.2,
        alpha: 0,
        angle: rand(-18, 18),
        duration: 160,
        ease: 'Cubic.easeIn',
      });
    }
    if (exploded) {
      this.explodeAt(brick.cx, brick.cy);
      this.chainExplosiveProximity(brick);
    }

    if (brick.type === 'beehive') {
      const eligible = this.bricks.find((b) => b.alive && b.type === 'normal' && !this.brickOccupiedByGnome(b));
      if (eligible) {
        const j = new Jardinain(this, eligible, 'normal', { popping: true });
        this.jardinains.push(j);
        this.floatText(brick.cx, brick.cy, 'HIVE!', '#ffcc44', 20);
      }
    }
    if (brick.type === 'seedpod') {
      for (let i = -1; i <= 1; i++) {
        const nb = new Brick(this, brick.x + i * (brick.w * 0.35), brick.y + brick.h * 0.2, brick.w * 0.55, brick.h * 0.55, 'normal', brick.color, this.level);
        this.bricks.push(nb);
      }
    }
    if (brick.linkedPartner?.alive && fromBall && this.combo >= 2) {
      this.score += 80;
      this.floatText(brick.cx, brick.cy - 24, 'LINKED +80', '#aa88ff', 20);
    }

    if (Math.random() < 0.06 && this.gems.length < 12 && (brick.type === 'silver' || brick.type === 'reinforced')) {
      const val = brick.type === 'silver' ? 220 : GEM_VALUE;
      const gm = new Gem(this, brick.cx, brick.cy, val, 0x9ff0ff);
      spinIn(this, gm.sprite);
      this.gems.push(gm);
    }
    this.tryBrickPowerDrop(brick);
  }

  dropChance() {
    return clamp(
      GAME.BRICK_DROP_CHANCE_BASE + this.level * 0.002,
      GAME.BRICK_DROP_CHANCE_BASE,
      GAME.BRICK_DROP_CHANCE_MAX,
    );
  }

  tryBrickPowerDrop(brick) {
    if (brick.type !== 'silver' && brick.type !== 'explosive' && brick.type !== 'reinforced') return;
    if (Math.random() >= this.dropChance()) return;
    const cap = this.spawnPowerCapsule(brick.cx, brick.cy);
    if (!cap) return;
    this.floatText(brick.cx, brick.cy - 20, 'DROP!', powerColorHex(cap.key), 18);
  }

  /** Unique seed per capsule drop — reusing levelSeed alone repeats the same power every time. */
  nextPowerDropSeed() {
    const seq = this.powerDropSeq++;
    return (this.levelSeed ^ (seq * 2654435761) ^ (this.level * 7919)) >>> 0;
  }

  ballLost(ball) {
    ball.destroy();
    this.balls = this.balls.filter((b) => b !== ball);
    if (this.balls.length > 0) return;
    audio.lose();
    hapticPulse(40);
    microShake(this, 0.012, 220);
    this.combo = 0; this.lives--; this.bus.emit('hud:life');
    this.gnomeStreak = 0;
    this.emitGnomeStreak();
    this.powerSys.clearAll(); this.paddle.reset();
    RunPersistence.saveRun(this);
    if (this.lives <= 0) { this.gameOver(); return; }
    this.flash(pick(GAME_OVER_MESSAGES), '#ff5a6e', 1000, 'high');
    this.balls.push(new Ball(this, this.paddle, this.balls.length));
    this.balls.forEach((b) => { this.syncBallSpeed(b, { reset: true }); });
  }

  checkComboWow() {
    const milestones = [8, 16, 24, 32];
    if (!milestones.includes(this.combo)) return;
    const mult = this.comboScoreMult();
    surgeText(this, GAME.WIDTH / 2, GAME.HEIGHT * 0.38, `COMBO SURGE x${mult}`, '#ffd23d', 40);
    comboFlare(this, GAME.WIDTH / 2, GAME.HEIGHT * 0.42, 0xffd23d, this.combo);
    rippleRing(this, GAME.WIDTH / 2, GAME.HEIGHT * 0.42, { tint: 0xffd23d, scale: 3.6, dur: 500 });
    if (this.combo >= 16 && !this.settings.reducedFx) {
      impactFlash(this, 0xff44aa, 0.12);
      microShake(this, 0.008, 140);
    }
    if (this.settings.bulletTime) this.triggerBulletTime(360, { intensity: 0.75, punch: true });
    audio.wowHit?.();
    hapticPulse(12);
  }

  canCompleteLevel() {
    return this.destructiblesLeft() <= 0;
  }

  evaluateStars() {
    const elapsed = (this.time.now - this.levelStartTime) / 1000;
    const par = GAME.STAR_PAR_TIME_BASE + this.level * GAME.STAR_PAR_TIME_PER_LEVEL;
    let stars = 1;
    if (elapsed <= par) stars++;
    if (this.lives >= (this._livesAtLevelStart ?? GAME.STARTING_LIVES)) stars++;
    if (this.levelKnockouts >= 1) stars++;
    return Math.min(3, stars);
  }

  stunPaddle(msg) {
    this.potHitLevel = true;
    if (this.goal?.type === 'silence') this.goalFail = true;
    if (this.contract?.id === 'noPotHit') this.contractDone = false;
    this.paddle.stun(GAME.PADDLE_STUN_MS);
    this.combo = 0;
    impactFlash(this, 0xff5a6e, 0.14);
    wobble(this, this.paddle.body, { angle: 6, dur: 220, repeat: 0 });
    rippleRing(this, this.paddle.x, this.paddle.y, { tint: PAL.danger, scale: 2, dur: 280 });
    if (this.settings.bulletTime) this.triggerBulletTime(320, { intensity: 0.55 });
    if (this.settings.flashText) this.flash(msg, '#ff5a6e', 450);
    this.score = Math.max(0, this.score - GAME.SCORE_STUN_PENALTY);
    audio.lose();
  }

  gameOver() {
    this.over = true;
    MetaProgress.saveLastRunPath(this._runPath);
    RunPersistence.clearRun();
    const hs = SaveManager.getHighScore();
    if (this.score > hs) SaveManager.setHighScore(this.score);
    this.scene.pause();
    this.scene.launch(SCENES.GAMEOVER, { score: this.score, highScore: Math.max(hs, this.score), continues: this.continues, message: pick(GAME_OVER_MESSAGES) });
    InputRouter.onOverlayOpen(SCENES.GAMEOVER);
  }

  doContinue() {
    if (this.continues <= 0) { this.doRestart(); return; }
    this.continues--; this.lives = GAME.STARTING_LIVES; this.over = false;
    this.powerSys.clearAll(); this.paddle.reset();
    this.balls.forEach((b) => b.destroy()); this.balls = [new Ball(this, this.paddle, 0)];
    this.applyEquippedCosmetics();
    InputRouter.onOverlayClose();
    this.scene.resume(); this.emitStats();
    RunPersistence.saveRun(this);
  }

  /** Resume after watching a rewarded ad (or bypass when ads unavailable). */
  doVideoContinue() {
    this.over = false;
    this.lives = GAME.STARTING_LIVES;
    this.powerSys.clearAll();
    this.paddle.reset();
    this.balls.forEach((b) => b.destroy());
    this.balls = [new Ball(this, this.paddle, 0)];
    this.applyEquippedCosmetics();
    InputRouter.onOverlayClose();
    this.scene.resume();
    this.emitStats();
    RunPersistence.saveRun(this);
  }

  doReviveWithPowers() {
    this.over = false;
    this.lives = 1;
    this.powerSys.clearAll();
    this.paddle.reset();
    this.balls.forEach((b) => b.destroy());
    this.balls = [new Ball(this, this.paddle, 0)];
    this.applyEquippedCosmetics();
    rollPowerDraft(this.level, this.nextPowerDropSeed(), 2).forEach((k) => this.applyPower(k));
    this.flash('REVIVED!', cssHex(PAL.accent2), 650, 'high');
    InputRouter.onOverlayClose();
    this.scene.resume();
    this.emitStats();
    RunPersistence.saveRun(this);
  }

  doRestart() {
    RunPersistence.clearRun();
    this.scene.stop(SCENES.HUD);
    this.scene.start(SCENES.GAME, { newGame: true });
  }

  doResume() { InputRouter.onOverlayClose(); this.scene.resume(); }

  async completeLevel() {
    if (this._completingLevel) return;
    if (this.draftOpen) {
      this._pendingCompleteLevel = true;
      return;
    }
    if (!this.canCompleteLevel()) {
      this.flash('GOAL INCOMPLETE', '#ff8899', 800, 'high');
      return;
    }
    // Meter bonuses before transition lock so a full meter can open the draft overlay.
    this.addGnomeStreak(GAME.GNOME_STREAK_LEVEL_BONUS);
    this.addBtMeter(GAME.BT_METER_LEVEL_FILL);
    if (this.draftOpen) {
      this._pendingCompleteLevel = true;
      return;
    }
    this._completingLevel = true;
    this.transitioning = true;
    this.combo = 0;
    const stars = this.evaluateStars();
    const levelKey = `L${this.level}`;
    MetaProgress.setStars(levelKey, stars);
    MetaProgress.addTreasury(stars * 50);
    const gemsEarned = gemsForLevelClear(this.level, stars);
    MetaProgress.addGems(gemsEarned);
    MetaProgress.bumpStat('levelsCleared');
    if (this.contract?.id === 'noPotHit' && !this.potHitLevel) {
      this.contractDone = true;
      this.applyPower(rollPower(this.level, this.nextPowerDropSeed()));
    }
    const bonus = Math.round((GAME.SCORE_LEVEL_CLEAR + this.lives * 200) * (this.scoreMultLevel ?? 1));
    this._lastLevelBonus = bonus;
    this.score += bonus;
    if (this.score > SaveManager.getHighScore()) SaveManager.setHighScore(this.score);
    audio.levelUp();
    if (this.isBoss) {
      const wx = GAME.WALL_X;
      const wt = GAME.WALL_TOP;
      const W = GAME.WIDTH;
      const H = GAME.HEIGHT;
      audio.fortressShatter?.();
      microShake(this, 0.014, 220);
      screenPunch(this, 0.11, 150);
      impactFlash(this, PAL.accent2, 0.18);
      const shardN = this.settings.reducedFx ? 6 : 12;
      shardBurst(this, wx + 8, wt + 48, PAL.accent2, shardN);
      shardBurst(this, W - wx - 8, wt + 48, PAL.accent2, shardN);
      shardBurst(this, W / 2, wt + 24, 0xffd23d, this.settings.reducedFx ? 8 : 16);
      this.tweens.add({
        targets: this.arenaGfx,
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: 0,
        duration: 520,
        ease: 'Cubic.easeOut',
      });
    }
    spawnConfetti(this, GAME.WIDTH / 2, GAME.HEIGHT * 0.35, this.settings.reducedFx ? 28 : 56);
    radialBlast(this, GAME.WIDTH / 2, GAME.HEIGHT * 0.35, { tint: PAL.accent2, scale: 5, dur: 640 });
    if (this.settings.bulletTime) this.triggerBulletTime(550, { punch: true, intensity: 1, wow: true });
    RunPersistence.saveRun(this);
    this.scene.pause();
    this.tweens.killTweensOf(this.paddle.body);
    this.paddle.body?.setAngle(0);
    this.paddle.body?.setScale(1);
    try {
      await Monetization.maybeShowLevelInterstitial();
    } catch (e) {
      console.warn('[Game] interstitial skipped', e);
    }
    try {
      this.scene.launch(SCENES.LEVEL_COMPLETE, {
        level: this.level, message: pick(LEVEL_CLEARED_MESSAGES), bonus, score: this.score, stars,
        goal: this.goal?.label, treasury: MetaProgress.getTreasury(),
        gemsEarned, gems: MetaProgress.getGems(),
      });
      InputRouter.onOverlayOpen(SCENES.LEVEL_COMPLETE);
    } catch (e) {
      console.warn('[Game] level complete overlay failed', e);
      this._completingLevel = false;
      this.transitioning = false;
      this.scene.resume();
    }
  }

  applyLevelBonusDouble() {
    const bonus = this._lastLevelBonus ?? 0;
    if (!bonus || this._bonusDoubled) return false;
    this._bonusDoubled = true;
    this.score += bonus;
    if (this.score > SaveManager.getHighScore()) SaveManager.setHighScore(this.score);
    RunPersistence.saveRun(this);
    return true;
  }

  startNextLevel() {
    this.level++;
    const nd = difficultyFor(this.level);
    if (this.level > 1 && this.level % nd.lifeRewardEvery === 0) this.lives++;
    this.powerDropSeq = 0;
    this.powerSys.clearAll();
    this.statusSys.clear();
    this.stopBlackHole();
    this.applySqueeze(false);
    this.bricks.forEach((b) => b.destroy()); this.bricks = [];
    this.bullets.forEach((b) => b.destroy()); this.bullets = [];
    this.powers.forEach((p) => p.destroy()); this.powers = [];
    this.pots.forEach((p) => p.destroy()); this.pots = [];
    this.jardinains.forEach((j) => j.destroy()); this.jardinains = [];
    this.enemies.forEach((e) => e.destroy()); this.enemies = [];
    this.gems.forEach((gm) => gm.destroy()); this.gems = [];
    this.balls.forEach((b) => b.destroy());
    this.paddle.reset();
    this.balls = [new Ball(this, this.paddle, 0)];
    this.balls.forEach((b) => b.resetToLevelBase());
    this.applyEquippedCosmetics();
    this.spawnLevel();
    this._completingLevel = false;
    this._bonusDoubled = false;
    this.transitioning = false;
    InputRouter.onOverlayClose();
    this.scene.resume();
    this.levelFlash();
    this.emitStats();
    RunPersistence.saveRun(this);
    if (this._carryOverPower) {
      const k = this._carryOverPower;
      this._carryOverPower = null;
      this.applyPower(k);
    }
    this.flushPendingDrafts();
  }

  emitStats() {
    const nestsLeft = this.bricks.filter((b) => b.alive && b.type === 'nest').length;
    this.bus?.emit('hud:stats', {
      score: this.score, lives: this.lives, level: this.level,
      bricksLeft: this.destructiblesLeft(), combo: this.combo,
      difficulty: this.difficulty?.rating ?? 1,
      band: this.difficulty?.label ?? '',
      goalText: goalProgressText(this.goal, {
        knockouts: this.levelKnockouts,
        potHit: this.potHitLevel,
        nestsLeft,
        escortLost: this.goalFail && this.goal?.type === 'escort',
      }),
    });
  }

  toast(text, ms = 1600) {
    if (!text) {
      this.bus?.emit('hud:toast', { text: '', ms: 0 });
      return;
    }
    this.bus?.emit('hud:toast', { text, ms });
  }

  flash(text, color, ms = 580, priority = 'normal') {
    if (!text) {
      this.bus?.emit('hud:flash', { text: '', color: color ?? '#fff', ms: 0 });
      return;
    }
    const now = this.time?.now ?? 0;
    if (priority !== 'high') {
      const gap = now - (this._lastFlashAt ?? 0);
      const minGap = this.settings.flashMinGap ?? 480;
      if (gap < minGap) {
        this.toast(text, Math.min(ms, 1400));
        return;
      }
      if (text === this._lastFlashText && gap < minGap * 2) return;
    }
    this._lastFlashText = text;
    this._lastFlashAt = now;
    this.bus?.emit('hud:flash', { text, color, ms });
  }

  nearestDestructible(fromX, fromY) {
    let best = null, bestD = Infinity;
    for (const b of this.bricks) {
      if (!b.alive || b.indestructible) continue;
      const d = Math.hypot(b.cx - fromX, b.cy - fromY);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  tickBulletTime(realDt) {
    if (!this.sys?.isActive() || this.scene?.isPaused?.() && this.over) return;
    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= realDt;
      this.timeScale = 0;
      if (this.settings.bulletTime) setBulletTimeIntensity(this, this.bulletTimePeak * 0.85);
      return;
    }

    const target = this.bulletTimeRemaining > 0
      ? (this._nexusSlowMo ? GAME.BT_NEXUS_TIME_SCALE : GAME.BULLET_TIME_SCALE)
      : 1;
    const ramp = Math.min(1, realDt / GAME.BULLET_TIME_RAMP_MS);
    this.timeScale += (target - this.timeScale) * ramp;

    if (this.bulletTimeRemaining > 0) {
      this.bulletTimeRemaining -= realDt;
      const refMs = this._nexusSlowMo ? (this._nexusBtMs || GAME.BT_NEXUS_TIME_MS) : GAME.BULLET_TIME_MS;
      const ratio = clamp(this.bulletTimeRemaining / refMs, 0, 1);
      const fadeOut = this.bulletTimeRemaining <= 0 ? 0 : Math.max(this._nexusSlowMo ? 0.5 : 0.35, ratio);
      if (this.settings.bulletTime) setBulletTimeIntensity(this, this.bulletTimePeak * fadeOut);
      this.bus?.emit('hud:bulletTime', { active: true, ratio: fadeOut, nexus: this._nexusSlowMo });
      if (this.bulletTimeRemaining <= 0) {
        this.bulletTimePeak = 1;
        this._nexusSlowMo = false;
        this._nexusBtMs = 0;
        resetGameplayCamera(this);
        setBulletTimeIntensity(this, 0);
        this.bus?.emit('hud:bulletTime', { active: false, ratio: 0 });
      }
    } else if ((this.btFx?.intensity ?? 0) > 0.001 || (this.btFx?.overlay?.alpha ?? 0) > 0.01) {
      setBulletTimeIntensity(this, 0);
    }
  }

  update(time, delta) {
    const realDt = delta;
    this.tickBulletTime(realDt);
    this.bg.update(realDt / 1000, this.isBoss);
    if (this.over || this.scene.isPaused()) return;
    if (this.transitioning && !this._completingLevel) return;
    if (this.draftOpen) {
      this.paddle.sync();
      this.balls.forEach((b) => b.sync());
      return;
    }

    const ts = this.timeScale;
    const dtSec = Math.min(realDt / 1000, 1 / 20) * ts;
    const dtMs = realDt * ts;
    this.frame++;

    this.powerSys.tick(dtMs);
    this.statusSys.tick();
    if (this.blackHole && this.powerSys.isActive('BlackHole') && this.frame % 18 === 0) {
      this.pullBlackHole();
    }
    this.challengeSys.update(dtMs, this.combo);

    const inv = this.controlsInverted ? -1 : 1;
    if (this.cursors.left.isDown) this.paddle.moveByKeyboard(-1 * inv, realDt / 1000, ts);
    if (this.cursors.right.isDown) this.paddle.moveByKeyboard(1 * inv, realDt / 1000, ts);

    if (this.paddle.hasCannon && !this.paddle.stunned) {
      const aimX = this.paddle.cannonType === 'shock'
        ? (this.nearestDestructible(this.paddle.x, this.paddle.top)?.cx ?? this.paddle.x)
        : this.paddle.x;
      this.fireCannons(aimX);
    }

    const inPlay = this.balls.some((b) => !b.stuck);
    if (inPlay) {
      this.enemyTimer -= dtMs;
      if (this.enemyTimer <= 0 && this.enemies.length < this.maxEnemies) {
        this.enemyTimer = rand(this.enemySpawnMs * 0.7, this.enemySpawnMs * 1.3);
        const x = rand(GAME.WALL_X + 60, GAME.WIDTH - GAME.WALL_X - 60);
        const e = Enemy.random(this, x, this.level);
        dropIn(this, e.gfx, { fromY: e.y - 56 });
        dropIn(this, e.glow, { fromY: e.y - 56 });
        this.enemies.push(e);
      }
    }

    this.bricks.forEach((b) => b.update(dtSec));
    this.updateGnomeSpawner(dtMs);
    this.updateJardinains(dtMs, dtSec);
    this.updateEnemies(dtSec);
    this.updateBalls(dtSec);
    this.recordBallPath();
    this.updateBullets(dtSec, ts);
    this.updatePots(dtSec, ts);
    this.updatePowers(dtSec, ts);
    this.updateGems(dtSec, ts);

    const before = this.bricks.length;
    this.bricks = this.bricks.filter((b) => { if (!b.alive) { b.destroy(); return false; } return true; });
    if (this.bricks.length !== before) this.emitStats();

    this.paddle.sync();
    this.balls.forEach((b) => b.sync());
    this.bricks.forEach((b) => b.sync());
    this.bullets.forEach((b) => b.sync());
    this.pots.forEach((p) => p.sync());
    this.enemies.forEach((e) => e.sync());
    this.gems.forEach((gm) => gm.sync());
    this.powers.forEach((p) => p.sync());
    if (this.escortGlow && this.escortBrick?.alive) {
      this.escortGlow.setPosition(this.escortBrick.cx, this.escortBrick.cy);
    }
    this.renderFx();

    const anyStuck = this.balls.some((b) => b.stuck);
    if (anyStuck !== this._hintShown) { this._hintShown = anyStuck; this.bus.emit('hud:hint', anyStuck); }

    if (this.destructiblesLeft() === 0 && !this._completingLevel) {
      this.completeLevel();
      return;
    }
    if (this.destructiblesLeft() > 0) {
      const left = this.bricks.filter((b) => b.alive && !b.indestructible);
      if (!left.some((b) => this.isBallBreakable(b))) {
        this.relieveSoftlock();
      } else if (!this._lastBrickBreakAt) {
        this._lastBrickBreakAt = this.time.now;
      } else if (this.time.now - this._lastBrickBreakAt > 28000) {
        this.relieveSoftlock();
        this._lastBrickBreakAt = this.time.now;
      }
    }
    this.emitStats();
  }

  updateJardinains(dtMs, dtSec) {
    const env = this.envSpeedMult();
    const throwScale = Math.max(0.45, (1 - this.level * 0.04) * (this.jardinainPressure ?? 1) * env * (this.difficulty?.gnomeThrowMult ?? 1));
    for (let i = this.jardinains.length - 1; i >= 0; i--) {
      const j = this.jardinains[i];
      if (j._destroyed) { this.jardinains.splice(i, 1); continue; }
      if (this.statusSys.isFrozen(j)) continue;
      const frozen = this.isTimeFrozen();

      const throwResult = j.update(dtMs * throwScale, dtSec, env, frozen);
      if (throwResult === 'throw' && this.pots.length < 8) {
        const payload = j.createThrowPayload(this.paddle.x);
        this.pots.push(new GnomeProjectile(this, j.x, j.y, this.paddle.x, {
          ...payload,
          gravityScale: payload.gravityScale * this.levelGravityScale,
        }));
        wobble(this, j.c, { angle: 10, dur: 160, repeat: 0 });
        hitSpark(this, j.x, j.y - j.r, { tint: 0xc84040, count: 4, spread: 16 });
        audio.blip(220);
      }

      if (!frozen && (j.state === JSTATE.FALLING || j.state === JSTATE.CAPTURED)) {
        if (j.hitsPaddle(this.paddle)) {
          j.onPaddleCatch(this.paddle);
        } else if (j.hitFloor()) {
          j.beginExitFall();
        }
      }
    }
  }

  updateEnemies(dtSec) {
    const env = this.envSpeedMult();
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e._d) { this.enemies.splice(i, 1); continue; }
      const res = e.update(dtSec * env, this.paddle);
      if (res === 'attack') { this.stunPaddle('HIT!'); this.burst(e.x, e.y, e.color, 8); e.destroy(); this.enemies.splice(i, 1); }
      else if (res === 'gone') { e.destroy(); this.enemies.splice(i, 1); }
    }
  }

  killEnemy(e) {
    e.kill();
    this.score += SCORE_ENEMY;
    this.floatText(e.x, e.y, `+${SCORE_ENEMY}`, '#' + e.color.toString(16).padStart(6, '0'), 28);
    this.burst(e.x, e.y, e.color, 12);
    this.cameras.main.shake(120, 0.006);
    audio.blip(660);
  }

  applyBallSteering(ball, dtSec) {
    if (!ball.missileMode && !ball.gravityMode) return;

    const px = this.paddle.x;
    const py = this.paddle.top - ball.r * 0.5;
    const dx = px - ball.x;
    const dy = py - ball.y;
    const dist = Math.max(48, Math.hypot(dx, dy));
    const nx = dx / dist;
    const ny = dy / dist;
    const tanX = -ny;
    const tanY = nx;
    const baseSp = ball.speed || ball.baseSpeed;
    ball._steerPhase = (ball._steerPhase ?? 0) + dtSec * (ball.missileMode ? 8 : 5.5);

    if (ball.missileMode) {
      const radial = baseSp * GAME.STEER_MISSILE_RADIAL;
      const swirl = Math.sin(ball._steerPhase) * GAME.STEER_SWIRL_MISSILE * baseSp * 0.01;
      ball.vx += (nx * radial + tanX * swirl) * dtSec;
      ball.vy += (ny * radial + tanY * swirl) * dtSec;
    }
    if (ball.gravityMode) {
      const radial = baseSp * GAME.STEER_GRAVITY_RADIAL;
      const swirl = Math.sin(ball._steerPhase) * GAME.STEER_SWIRL_GRAVITY * baseSp * 0.01;
      ball.vy += baseSp * GAME.STEER_GRAVITY_EXTRA_Y * dtSec;
      ball.vx += (nx * radial + tanX * swirl) * dtSec;
      ball.vy += (ny * radial + tanY * swirl) * dtSec;
    }

    ball.clampToSpeed({
      minMult: GAME.STEER_SPEED_MIN,
      maxMult: GAME.STEER_SPEED_MAX,
    });
  }

  resolveBallWalls(ball, lw, rw, tw) {
    if (ball.wrap) {
      if (ball.x < lw + ball.r) {
        ball.x = rw - ball.r;
        ball.vx = Math.abs(ball.vx) * 1.04;
        hitSpark(this, ball.x, ball.y, { tint: 0xffe156, count: 3, spread: 14 });
        audio.wall();
      } else if (ball.x >= rw - ball.r) {
        ball.x = lw + ball.r;
        ball.vx = -Math.abs(ball.vx) * 1.04;
        hitSpark(this, ball.x, ball.y, { tint: 0xffe156, count: 3, spread: 14 });
        audio.wall();
      }
    } else {
      if (ball.x <= lw + ball.r) {
        ball.x = lw + ball.r;
        if (ball.vx < 0) ball.vx = -ball.vx;
        hitSpark(this, ball.x, ball.y, { tint: PAL.accent, count: 2, spread: 10 });
        audio.wall();
      } else if (ball.x >= rw - ball.r) {
        ball.x = rw - ball.r;
        if (ball.vx > 0) ball.vx = -ball.vx;
        hitSpark(this, ball.x, ball.y, { tint: PAL.accent, count: 2, spread: 10 });
        audio.wall();
      }
    }
    if (ball.y < tw + ball.r) {
      ball.y = tw + ball.r;
      ball.vy = Math.abs(ball.vy);
      hitSpark(this, ball.x, ball.y, { tint: PAL.accent3, count: 2, spread: 10 });
      audio.wall();
    }
  }

  bounceBallOnPaddle(ball) {
    const rel = clamp((ball.x - this.paddle.x) / (this.paddle.w / 2), -1, 1);
    const ang = rel * GAME.MAX_BOUNCE_ANGLE;
    const sp = Math.hypot(ball.vx, ball.vy) || ball.speed;
    ball.vx = sp * Math.sin(ang);
    ball.vy = -Math.abs(sp * Math.cos(ang));
    ball.y = this.paddle.top - ball.r;
    ball.enforceMinVertical();
    ball.accelerateOnBounce();
    this.combo = 0;
    audio.paddle();
    squashStretch(this, this.paddle.body);
    hitSpark(this, ball.x, this.paddle.top, { tint: this.paddle.glowColor(), count: 5, spread: 18 });
    if (this.settings.particles) this.burst(ball.x, this.paddle.top, this.paddle.glowColor(), 4);
    if (this.paddle.sticky) {
      ball.stuck = true;
      ball.stuckOffset = clamp(ball.x - this.paddle.x, -this.paddle.w / 2, this.paddle.w / 2);
    }
    this.awardClutchBounce(ball);
    return true;
  }

  tryPaddleBounce(ball, prevY) {
    if (ball.vy <= 0) return false;
    if (ball.x + ball.r <= this.paddle.left || ball.x - ball.r >= this.paddle.right) return false;
    const crossedTop = prevY + ball.r <= this.paddle.top && ball.y + ball.r >= this.paddle.top;
    const overlapping = ball.y + ball.r > this.paddle.top && ball.y - ball.r < this.paddle.y + this.paddle.h / 2;
    if (!crossedTop && !overlapping) return false;
    return this.bounceBallOnPaddle(ball);
  }

  updateBalls(dtSec) {
    const lw = GAME.WALL_X, rw = GAME.WIDTH - GAME.WALL_X, tw = GAME.WALL_TOP;
    const env = this.envSpeedMult();
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (ball.stuck) {
        ball.x = clamp(this.paddle.x + ball.stuckOffset, lw + ball.r, rw - ball.r);
        ball.y = this.paddle.top - ball.r;
        continue;
      }

      this.applyBallSteering(ball, dtSec);

      const mx = ball.vx * dtSec * env;
      const my = ball.vy * dtSec * env;
      const dist = Math.hypot(mx, my);
      const steps = Math.max(1, Math.min(8, Math.ceil(dist / Math.max(4, ball.r * 0.45))));
      const sx = mx / steps;
      const sy = my / steps;
      let paddleHit = false;
      for (let s = 0; s < steps && !paddleHit; s++) {
        const prevY = ball.y;
        ball.x += sx;
        ball.y += sy;
        this.resolveBallWalls(ball, lw, rw, tw);
        if (this.tryPaddleBounce(ball, prevY)) paddleHit = true;
      }

      if ((this.powerSys.isActive('Shield') || this.powerSys.isActive('ShieldII')) && ball.y + ball.r > GAME.HEIGHT - 18) {
        ball.vy = -Math.abs(ball.vy); ball.y = GAME.HEIGHT - 18 - ball.r;
        this.shieldHitsLeft = (this.shieldHitsLeft || 1) - 1;
        if (this.shieldHitsLeft <= 0) {
          this.powerSys.clear('Shield');
          this.powerSys.clear('ShieldII');
        }
      }

      if (ball.y > GAME.HEIGHT + ball.r) { this.ballLost(ball); continue; }

      for (const j of this.jardinains) {
        if (!j.hitBy(ball)) continue;
        if (ball.element === 'electric') {
          j.onElectricPop();
          ball.vy = -Math.abs(ball.vy);
          break;
        }
        if (j.state === JSTATE.IDLE) {
          if (ball.element === 'frost') this.statusSys.freezeJardinain(j);
          j.dislodge(true, ball.vy);
          wobble(this, j.c, { angle: 14, dur: 240 });
          ball.vy = -Math.abs(ball.vy);
          this.burst(j.x, j.y, 0x7eb87a, 10);
          audio.blip(880);
          break;
        }
        if ((j.state === JSTATE.FALLING || j.state === JSTATE.CAPTURED) && j.hitCooldown <= 0) {
          j.onBallJuggle(ball);
          if (j._destroyed) break;
          break;
        }
      }

      for (const e of this.enemies) {
        if (e.hitBy(ball.x, ball.y, ball.r)) { this.killEnemy(e); ball.vy = -Math.abs(ball.vy); break; }
      }

      this.ballBricks(ball);
      this.updateEchoOrbs(ball, dtSec);
      this.trackStuckBall(ball, dtSec * 1000);
    }
  }

  ballBricks(ball) {
    const dmg = ball.mega ? 2 : 1;
    for (const br of this.bricks) {
      if (!br.alive) continue;
      if (ball.x + ball.r > br.x && ball.x - ball.r < br.x + br.w && ball.y + ball.r > br.y && ball.y - ball.r < br.y + br.h) {
        if (!br.revealed) br.reveal();

        if (ball.through) {
          if (ball.chargeShot) {
            if (br.hit(999)) this.destroyBrick(br, true, ball);
            ball.chargeShot = false;
          } else if (ball.element === 'electric') {
            this.electricHitBrick(br, ball);
          } else if (!br.indestructible) {
            if (br.hit(dmg)) this.destroyBrick(br, true, ball);
          } else {
            br.clang();
          }
          continue;
        }

        if (ball.chargeShot) {
          if (br.hit(999)) this.destroyBrick(br, true, ball);
          ball.chargeShot = false;
          this.bounceBallOffBrick(ball, br, false);
          break;
        }

        if (ball.bomb) {
          this.explodeGrid3x3(br, ball);
          if (this.settings.particles) this.burst(ball.x, ball.y, PAL.explosive, 6);
          this.bounceBallOffBrick(ball, br, false);
          break;
        }

        if (ball.element === 'nuke') {
          this.explodeCrossAt(br, ball);
          if (this.settings.particles) this.burst(ball.x, ball.y, 0xff2244, 8);
          this.bounceBallOffBrick(ball, br, false);
          break;
        }

        if (br.type === 'portal' && br.portalLink) {
          this.tryBallPortal(ball, br);
          break;
        }

        if (ball.element === 'electric') {
          this.electricHitBrick(br, ball);
          this.bounceBallOffBrick(ball, br, false);
          break;
        }

        if (br.indestructible) {
          br.clang();
          this.bounceBallOffBrick(ball, br, false);
          break;
        }

        if (ball.element === 'frost') {
          if (br.frostMarked || br.frozen) {
            if (br.hit(999)) this.destroyBrick(br, true, ball);
            else { br.alive = false; this.destroyBrick(br, true, ball); }
          } else {
            this.statusSys.markFrostCluster(br);
            audio.frostHit?.();
            frostImpactFx(this, br.cx, br.cy);
            this.bounceBallOffBrick(ball, br, false);
            if (this.settings.particles) this.burst(ball.x, ball.y, PAL.powerFrost, 4);
          }
          break;
        }

        this.bounceBallOffBrick(ball, br, false);
        const killed = br.hit(dmg);
        if (this.settings.particles) this.burst(ball.x, ball.y, 0xffffff, 4);
        if (killed) this.destroyBrick(br, true, ball);
        else if (!br.indestructible) audio.brickBreak?.(br.type, 0, br.hp) ?? audio.brick(0);
        break;
      }
    }
  }

  projectileHitBrick(b) {
    for (const br of this.bricks) {
      if (!br.alive) continue;
      if (b.x + (b.hitW ?? 4) <= br.x || b.x - (b.hitW ?? 4) >= br.x + br.w || b.y <= br.y || b.y >= br.y + br.h) continue;

      switch (b.type) {
        case 'laser':
          if (br.indestructible) { br.alive = false; this.destroyBrick(br, false); }
          else if (br.hit(1)) this.destroyBrick(br, false);
          if (this.settings.particles) this.burst(b.x, b.y, 0xff5566, 4);
          return true;
        case 'fire':
          this.fireBlastAt(b.x, b.y);
          return true;
        case 'napalm':
          this.statusSys.igniteBrick(br);
          if (this.settings.particles) this.burst(b.x, b.y, 0xff4400, 8);
          return true;
        case 'ice':
          this.statusSys.freezeBrick(br, 5000);
          audio.frostHit?.();
          frostImpactFx(this, b.x, b.y);
          if (this.settings.particles) this.burst(b.x, b.y, PAL.powerFrost, 5);
          return true;
        case 'shock':
          if (br.indestructible) { br.alive = false; this.destroyBrick(br, false); }
          else if (br.hit(999)) this.destroyBrick(br, false);
          if (this.settings.particles) this.burst(b.x, b.y, 0xa78bfa, 6);
          return b.bouncesLeft <= 0;
        default:
          return true;
      }
    }
    return false;
  }

  updateBullets(dtSec, ts) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dtSec, ts);
      let remove = this.projectileHitBrick(b);

      if (!remove) {
        for (const j of this.jardinains) {
          if (!j._destroyed && Math.hypot(b.x - j.x, b.y - j.y) < j.r) {
            j.knockout(); this.score += GAME.SCORE_JARDINAIN;
            this.floatText(j.x, j.y, `+${GAME.SCORE_JARDINAIN}`, '#86e6b0', 28);
            remove = b.type !== 'shock' || b.bouncesLeft <= 0;
            if (!remove) break;
          }
        }
      }
      if (!remove) {
        for (const e of this.enemies) {
          if (e.hitBy(b.x, b.y, 6)) { this.killEnemy(e); remove = true; break; }
        }
      }
      if (!remove && b.y < -20) remove = true;
      if (remove) { b.destroy(); this.bullets.splice(i, 1); }
    }
  }

  updatePots(dtSec, ts) {
    const g = this.fallGravityMult();
    for (let i = this.pots.length - 1; i >= 0; i--) {
      const p = this.pots[i];
      p.update(dtSec, ts * g, this.paddle);
      if (p.hitsPaddle(this.paddle)) {
        this.handleProjectileHit(p);
        p.destroy();
        this.pots.splice(i, 1);
        continue;
      }
      if (p.y > GAME.HEIGHT + 40) { p.destroy(); this.pots.splice(i, 1); }
    }
  }

  updatePowers(dtSec, ts) {
    const g = this.levelGravityScale;
    for (let i = this.powers.length - 1; i >= 0; i--) {
      const p = this.powers[i];
      if (p.collecting) continue;
      p.update(dtSec, ts, this.paddle, g);
      if (p.polarity === 'neg' && !p.collecting && this.time.now - (p.spawnTime ?? 0) >= GAME.CURSE_AUTO_MS && p.y > GAME.HEIGHT * 0.58) {
        this.floatText(p.x, p.y, 'CURSED!', '#ff8899', 22);
        const key = p.key;
        p.destroy();
        this.powers.splice(i, 1);
        this.applyPower(key);
        continue;
      }
      if (p.overlapsPaddle(this.paddle)) {
        const key = p.key;
        const tint = p.color;
        p.beginCollect(this.paddle, () => {
          rippleRing(this, this.paddle.x, this.paddle.top, { tint, scale: 2.4, dur: 360 });
          hitSpark(this, this.paddle.x, this.paddle.top, { tint, count: 8, spread: 22 });
          squashStretch(this, this.paddle.body, { sx: 1.1, sy: 0.88, dur: 100 });
          this.applyPower(key);
          const idx = this.powers.indexOf(p);
          if (idx >= 0) this.powers.splice(idx, 1);
          p.destroy();
        });
        continue;
      }
      if (p.y > GAME.HEIGHT + 20) {
        if (p.polarity === 'neg' && this.time.now - (p.spawnTime ?? 0) >= GAME.CURSE_AUTO_MS) {
          this.floatText(p.x, p.y - 20, 'CURSED!', '#ff8899', 22);
          this.applyPower(p.key);
        }
        p.destroy();
        this.powers.splice(i, 1);
      }
    }
  }

  updateGems(dtSec, ts) {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gm = this.gems[i];
      gm.update(dtSec, ts, this.paddle);
      if (gm.overlapsPaddle(this.paddle)) {
        this.score += gm.value;
        this.floatText(gm.x, this.paddle.top, `+${gm.value}`, '#9ff0ff', 26);
        this.burst(gm.x, gm.y, 0x9ff0ff, 8); audio.gemPickup?.();
        gm.destroy(); this.gems.splice(i, 1); continue;
      }
      if (gm.y > GAME.HEIGHT) { gm.destroy(); this.gems.splice(i, 1); }
    }
  }

  renderFx() {
    const bt = this.bulletTimeRemaining > 0;
    const btRatio = bt ? clamp(this.bulletTimeRemaining / GAME.BULLET_TIME_MS, 0, 1) : 0;
    this.balls.forEach((b) => {
      if (!b.trail) return;
      const mod = b.isModified();
      b.trail.frequency = bt ? 4 : (mod ? 10 : (b._trailId === 'nexus' ? 14 : 18));
      b.trail.setAlpha(bt ? 0.98 : (mod ? 0.82 : 0.95));
      if (bt) {
        b.halo.setAlpha(0.88 + btRatio * 0.1);
        b.ring.setAlpha(0.28 + btRatio * 0.2);
      } else if (!mod) {
        b.rim?.setAlpha(0.95);
        b.core?.setAlpha(1);
      }
    });

    this.shieldGfx.clear();
    if (this.powerSys.isActive('Shield') || this.powerSys.isActive('ShieldII')) {
      const a = 0.3 + 0.16 * Math.sin(this.frame * 0.2);
      const tint = this.powerSys.isActive('ShieldII') ? 0xffffff : powerFillColor('Shield');
      this.shieldGfx.fillStyle(tint, a);
      this.shieldGfx.fillRect(GAME.WALL_X, GAME.HEIGHT - 18, GAME.WIDTH - GAME.WALL_X * 2, 16);
    }

    this.fogGfx.clear();
    if (this.powerSys.isActive('FogSight')) {
      const W = GAME.WIDTH;
      const H = GAME.HEIGHT;
      const pulse = 0.48 + 0.08 * Math.sin(this.frame * 0.07);
      this.fogGfx.fillStyle(0x8899aa, pulse * 0.35);
      this.fogGfx.fillRect(0, 0, W, H);
      const edge = Math.round(70 + 20 * Math.sin(this.frame * 0.05));
      this.fogGfx.fillStyle(0x04060e, pulse * 0.55);
      this.fogGfx.fillRect(0, 0, W, edge);
      this.fogGfx.fillRect(0, H - edge, W, edge);
      this.fogGfx.fillRect(0, 0, edge, H);
      this.fogGfx.fillRect(W - edge, 0, edge, H);
      this.fogGfx.setAlpha(1);
    } else {
      this.fogGfx.setAlpha(0);
    }

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
