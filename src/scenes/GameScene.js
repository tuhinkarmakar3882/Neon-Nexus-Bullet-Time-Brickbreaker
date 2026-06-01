import Phaser from 'phaser';
import {
  GAME, SCENES, JARDINAIN, BRICK, DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME,
  playfieldSideInset, paddleSideInset, ballSideInset,
} from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { POWERS, powerFillColor, powerColorHex, resolvePowerKey, CANNON_TYPES, BALL_MODS, POWER_KEYS, powerDisplayName, powerPillLabel, powerHasBallMod, powerHasCannon, findActiveBallModKey, findActiveCannonKey } from '../config/PowerUps.js';
import { rollPower, rollPowerDraft, rollPositivePower, rollPositivePowerDraft, rollCapsuleVariant, rollBlessedPower, DROPPABLE_KEYS } from '../config/DropTables.js';
import { mutatorDisplay } from '../config/Mutators.js';
import { goalProgressText } from '../config/LevelGoals.js';
import { rollContract } from '../config/GnomeContracts.js';
import { fusionTarget } from '../config/PowerFusion.js';
import { cosmeticById, PADDLE_HULLS, BALL_TRAILS, GARDEN_THEMES } from '../config/Cosmetics.js';
import { applyCosmeticsToGameScene } from '../systems/CosmeticsBridge.js';
import { seasonalMutatorForDate } from '../config/SeasonalMutators.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { GAME_OVER_MESSAGES, GNOME_TAUNT_MESSAGES, LEVEL_CLEARED_MESSAGES } from '../config/Messages.js';
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
import { AdBreakPolicy } from '../systems/AdBreakPolicy.js';
import { SaveManager } from '../systems/SaveManager.js';
import { RunPersistence } from '../systems/RunPersistence.js';
import { InputRouter } from '../systems/InputRouter.js';
import { isArrowHeld } from '../systems/GameKeyboard.js';
import { pushGameplayHistory } from '../systems/Navigation.js';
import { hapticPulse } from '../systems/Haptics.js';
import { scaledBallBaseSpeed, difficultyFor } from '../systems/DifficultyScaler.js';
import { addCameraFx, spawnConfetti, makeButton } from '../utils/UI.js';
import { applySceneVfx } from '../utils/SceneVfx.js';
import { popScale, squashStretch, wobble, rippleRing, staggerDropIn, shardBurst, brickBreakFx, microShake, surgeText, hitSpark, brickNudge, launchBurst, risePop, tierPulse, dropIn, spinIn, powerAcquireBurst, powerPickupFx, explosiveImpactFx, fireImpactFx, electricImpactFx, frostImpactFx, comboFlare } from '../utils/MicroFx.js';
import { fxParticleScale } from '../utils/FxBudget.js';
import { initBulletTimeFx, setBulletTimeIntensity, screenPunch, impactFlash, radialBlast, resetGameplayCamera, clearBulletTimeFx } from '../utils/BulletTimeFx.js';
import {
  pick, clamp, rand, mulberry32,
  dropChance as brickDropChanceForLevel,
  brickPowerDropBudget,
} from '../utils/Helpers.js';
import { fitTextWidth, orbitronStyle, uiPx, wrapWidth } from '../utils/Typography.js';
import { resolveSettings } from '../config/VfxQuality.js';
import { gemsForLevelClear } from '../config/GemRewards.js';
import { dismissBootSplash, setBootSplash } from '../shell/BootSplash.js';
import { clearTransitionFlags } from '../systems/GameGuard.js';

const SCORE_ENEMY = 220;
const GEM_VALUE = 150;

export class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  init(data) {
    this._resumeData = data?.resume ?? null;
    this._newGame = data?.newGame ?? false;
  }

  create() {
    setBootSplash({ progress: 82, label: 'Growing the twilight garden…' });
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
    this._levelCompleteQueued = false;
    this._levelCompleteRetrying = false;
    this._ballLossBeat = false;
    this._ballLossTimer = null;
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

    setBootSplash({ progress: 90, label: 'Calibrating HUD…' });
    if (!this.scene.isActive(SCENES.UI)) {
      this.scene.launch(SCENES.UI);
    }
    this.time.delayedCall(400, () => {
      if (!this.scene.isActive(SCENES.UI)) this.scene.launch(SCENES.UI);
      dismissBootSplash('Garden ready — launch when you are');
    });
    this.bus = this.game.events;
    this.emitStats();
    this.emitGnomeStreak();
    this.emitBtMeter();
    this.bus?.emit('hud:treasury', { value: MetaProgress.getTreasury() });
    this.bus?.emit('hud:immersive', { on: true });
    this.game.events.on('req:gambit', () => this.cashComboGambit());
    this.game.events.on('req:nexus', () => this.trySpendNexus());
    this.game.events.on('req:gnome', () => this.trySpendGnome());
    this._onCosmeticsChanged = () => this.applyEquippedCosmetics();
    this.game.events.on('meta:cosmetics', this._onCosmeticsChanged);
    this.events.once('shutdown', () => {
      this.game.events.off('req:gambit');
      this.game.events.off('req:nexus');
      this.game.events.off('req:gnome');
      this.game.events.off('meta:cosmetics', this._onCosmeticsChanged);
    });

    this.time.delayedCall(80, () => this.levelFlash());
    pushGameplayHistory();
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

    const { min, max } = this.paddle._xLimits();
    this.paddle.x = clamp(this.paddle.x * sx, min, max);

    this.balls.forEach((ball) => {
      const bx = ballSideInset();
      ball.x = clamp(ball.x * sx, bx + ball.r, GAME.WIDTH - bx - ball.r);
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

    this.drawArena();
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
    this._levelCompleteQueued = false;
    this._levelCompleteRetrying = false;
    if (this.btFx?.overlay?.active) this.btFx.overlay.destroy();
    if (this.btFx?.streaks?.active) this.btFx.streaks.destroy();
    this.btFx = null;
    resetGameplayCamera(this);
  }

  levelFlash() {
    const t = this.theme?.name || '';
    const band = this.difficulty?.label ?? '';
    const rating = this.difficulty?.rating ?? Math.ceil(this.level / 5);
    const layout = this.layoutLabel ? `  ·  ${this.layoutLabel}` : '';
    const twist = this.twistLabel ? `  ·  ${this.twistLabel}` : '';
    const pace = this.paceLabel && this.paceLabel !== 'standard' ? `  ·  ${this.paceLabel.toUpperCase()}` : '';
    const diffTag = `DIFF ${rating}/10`;
    this.flash(
      (this.isBoss ? `FORTRESS ${this.level}` : `LEVEL ${this.level}`)
      + `  ·  ${diffTag}`
      + (band ? `  ·  ${band}` : '')
      + layout + twist + pace
      + (t ? `  ·  ${t.toUpperCase()}` : ''),
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
    try {
      applyCosmeticsToGameScene(this);
    } catch (e) {
      console.warn('[Game] cosmetics apply failed', e);
    }
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
    if (this.powers.length >= GAME.MAX_POWERS) {
      const drop = this.powers.find((p) => !p.collecting);
      if (drop) {
        drop.destroy();
        this.powers = this.powers.filter((p) => p !== drop);
      } else {
        return null;
      }
    }
    const seed = this.nextPowerDropSeed();
    const blessings = MetaProgress.getBlessings();
    const variant = rollCapsuleVariant(this.level, seed);
    let key = resolvePowerKey(keyOverride ?? rollPower(this.level, seed, blessings));
    if (variant === 'blessed') key = resolvePowerKey(rollBlessedPower(this.level, seed ^ 0xb1e55, blessings));
    if (variant === 'mystery') key = resolvePowerKey(rollPower(this.level, seed ^ 0xbeef, blessings));
    if (!POWERS[key]) key = rollPositivePower(this.level, seed ^ 0xdead);
    const pwW = Math.max(68, GAME.WIDTH * 0.064);
    const ph = pwW * 0.4;
    const capsule = new PowerUp(this, x - pwW / 2, y - ph / 2, key, { variant });
    this.powers.push(capsule);
    rippleRing(this, x, y, { tint: powerFillColor(key), scale: 2, dur: 340 });
    return capsule;
  }

  spawnEscortAnchor() {
    const candidates = this.bricks.filter((b) =>
      b.alive && !b.indestructible && (b.type === 'normal' || b.type === 'reinforced'),
    );
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

  /** Collision bounds use WALL_X / WALL_TOP — no side slab overlays (avoids black edge strips). */
  drawArena() {
    this.arenaGfx?.clear();
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
    this._onPauseReq = () => this.requestPause();
    this.game.events.on('req:pause', this._onPauseReq);
    this.events.once('shutdown', () => this.game.events.off('req:pause', this._onPauseReq));
  }

  /** Window-level keyboard (GameKeyboard.js) — launch / Nexus double-tap. */
  onKeyboardLaunch() {
    if (InputRouter.shouldBlockGameplay() || this.draftOpen) return;
    const now = this.time.now;
    if (now - (this._lastSpaceMs ?? 0) < 320 && this.trySpendNexus()) {
      this._lastSpaceMs = now;
      return;
    }
    this._lastSpaceMs = now;
    this.handleTap(this.paddle.x);
  }

  requestPause() {
    // Always dismiss HUD overlays first — must not depend on guards below.
    this.bus?.emit('hud:flash', { text: '', ms: 0 });
    this.bus?.emit('hud:toast', { text: '', ms: 0 });

    if (this.over || this.transitioning) return;

    const sm = this.game.scene;
    if (!sm.isActive(SCENES.GAME)) return;
    if (sm.isActive(SCENES.PAUSE)) return;
    if (InputRouter.isOverlayActive()) return;

    // Recover from a stuck paused state (game frozen without a menu overlay).
    if (sm.isPaused(SCENES.GAME) && !this._completingLevel) {
      sm.resume(SCENES.GAME);
      if (sm.isPaused(SCENES.UI)) sm.resume(SCENES.UI);
    }
    if (sm.isPaused(SCENES.GAME)) return;

    RunPersistence.saveRun(this);
    this.scene.pause();
    if (sm.isActive(SCENES.UI)) this.scene.pause(SCENES.UI);
    this.scene.launch(SCENES.PAUSE, {
      level: this.level,
      score: this.score,
      lives: this.lives,
      combo: this.combo ?? 0,
    });
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
    const shardScale = fxParticleScale(this, 'spark-shard', 11);
    const emberScale = fxParticleScale(this, 'ember', 13);
    const sparkScale = fxParticleScale(this, 'spark', 10);
    this.hitEmitter = this.add.particles(0, 0, 'spark-shard', {
      speed: { min: 120, max: 420 },
      scale: { start: shardScale, end: 0 },
      lifespan: 520,
      angle: { min: 0, max: 360 },
      rotate: { min: -280, max: 280 },
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(30);
    this.explodeEmitter = this.add.particles(0, 0, 'ember', {
      speed: { min: 180, max: 560 },
      scale: { start: emberScale, end: 0 },
      lifespan: 780,
      blendMode: 'ADD',
      emitting: false,
      tint: 0xffb24d,
    }).setDepth(31);
    this.dustEmitter = this.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 160 },
      scale: { start: sparkScale, end: 0 },
      alpha: { start: 0.55, end: 0 },
      lifespan: 540,
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
    this.dustEmitter.explode(Math.max(3, Math.round(n * 0.55)), x, y);
    if (n >= 6) {
      this.explodeEmitter.setParticleTint(color);
      this.explodeEmitter.explode(Math.max(4, Math.round(n * 0.4)), x, y);
    }
  }

  floatText(x, y, msg, color, size = 28) {
    const t = this.add.text(x, y, msg, { ...orbitronStyle(size, color, { fontStyle: 'bold' }) }).setOrigin(0.5).setDepth(41);
    fitTextWidth(t, wrapWidth(0.72), uiPx(14, { min: 12, max: 16 }));
    t.setShadow(0, 0, color, 10, true, true).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 120, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - uiPx(60, { min: 40, max: 60 }), alpha: 0, duration: 720, delay: 80, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  spawnLevel() {
    try {
      this._spawnLevelCore();
    } catch (e) {
      console.error('[Game] spawnLevel failed', e);
      clearTransitionFlags(this);
      try {
        this._spawnLevelCore();
      } catch (e2) {
        console.error('[Game] spawnLevel retry failed', e2);
      }
    }
  }

  _spawnLevelCore() {
    const {
      bricks, isBoss, theme, levelSeed, gravityScale, mutator, mutators, goal,
      difficulty, layoutLabel, twistLabel, paceLabel,
    } = buildLevel(this.level, this.campaignSeed);
    this.difficulty = difficulty;
    this.paceLabel = paceLabel ?? null;
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
    this.potThrowRateMult = this.difficulty?.potThrowRateMult ?? 1;
    this.potSpeedMult = this.difficulty?.potSpeedMult ?? 1;
    this.jugglePointMult = 1;
    this.scoreMultLevel = 1;
    this.gambitAtCombo = 0;
    this.bricks = bricks.map((b) => {
      const type = b.type === 'invisible' ? 'normal' : b.type;
      return new Brick(this, b.x, b.y, b.w, b.h, type, b.color, this.level, { ...b, type });
    });
    this._levelDestructibles = this.destructiblesLeft();
    this.brickPowerDropsThisLevel = 0;
    this._brickDropBudget = brickPowerDropBudget(this.level);
    this.bricks.forEach((br, i) => {
      const spec = bricks[i];
      if (spec.portalLinkIndex != null) br.portalLink = this.bricks[spec.portalLinkIndex] ?? null;
      if (spec.linkedPartnerIndex != null) br.linkedPartner = this.bricks[spec.linkedPartnerIndex] ?? null;
    });
    staggerDropIn(this, this.bricks, { delay: 22, drop: 28, dur: 300 });
    this.initGnomeSpawner();
    this.scheduleIntroGnomes();
    this.bricks.forEach((b) => this.telegraphBrick(b));

    const gardenTheme = cosmeticById(GARDEN_THEMES, MetaProgress.getEquipped().theme);
    this.bg?.setAccent?.(gardenTheme?.accent ?? theme?.bg ?? PAL.accent);
    this.applyEquippedCosmetics();
    this.drawArena();
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

  /** Pop garden gnomes during the level intro (even before the ball is launched). */
  scheduleIntroGnomes() {
    const delays = [1200, 2600];
    for (const ms of delays) {
      this.time.delayedCall(ms, () => {
        if (this.over || this.transitioning || this._completingLevel) return;
        const alive = this.jardinains.filter((j) => !j._destroyed).length;
        if (alive < JARDINAIN.MAX_ALIVE) this.tryPopupJardinain();
      });
    }
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

    const inPlay = this.balls.some((b) => !b.stuck);
    const spawnRate = inPlay ? 1 : 0.45;
    this.gnomeSpawnTimer -= dtMs * spawnRate;
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

  addBtMeter(amount, opts = {}) {
    const prev = this.btMeter;
    this.btMeter = Math.min(GAME.BT_METER_MAX, this.btMeter + amount);
    this.emitBtMeter();
    if (prev < GAME.BT_METER_MAX && this.btMeter >= GAME.BT_METER_MAX) {
      if (opts.deferDraft || this.transitioning || this._completingLevel) {
        this.requestPowerDraft('nexus');
        return;
      }
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
    const cleared = this.clearNexusHazards();
    this.triggerBulletTime(ms, { intensity, punch: true, player: true, nexus: true, wow: true });
    this.flash(cleared > 0 ? 'NEXUS UNLEASHED' : 'NEXUS SLOW-MO', '#8ec5ff', 500);
    hapticPulse(12);
    return true;
  }

  /** Spend Nexus slow-mo — wipe pots, pests, and paddle debuffs for a brief advantage. */
  clearNexusHazards() {
    let count = 0;
    const cx = this.paddle?.x ?? GAME.WIDTH / 2;
    const cy = GAME.HEIGHT * 0.38;

    for (let i = this.pots.length - 1; i >= 0; i--) {
      const p = this.pots[i];
      if (p && !p.dead) {
        count += 1;
        this.purgeGnomeProjectile(p);
      } else p?.destroy?.();
      this.pots.splice(i, 1);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e && !e._d) {
        count += 1;
        this.purgeEnemy(e);
      }
      this.enemies.splice(i, 1);
    }

    if (this.paddle?.stunned) {
      this.paddle.stunUntil = 0;
      this.paddle.sync?.();
    }
    if (this.controlsInverted && !this.powerSys?.isActive('Flip')) {
      this.controlsInverted = false;
    }
    if (this.uiScrambleUntil) {
      this.uiScrambleUntil = 0;
      this._uiScrambleTimer?.remove(false);
      this._uiScrambleTimer = null;
      this.bus?.emit('hud:scramble', false);
    }

    this.enemyTimer = Math.max(this.enemyTimer, this.enemySpawnMs ?? 4000);

    for (const j of this.jardinains) {
      if (j.state === JSTATE.IDLE && j.throwTimer != null) {
        j.throwTimer = Math.max(j.throwTimer, rand(1400, 2800));
      }
    }

    if (count > 0) {
      this.score += count * GAME.BT_NEXUS_HAZARD_SCORE;
      rippleRing(this, cx, cy, { tint: 0x8ec5ff, scale: 3.2, dur: 420, depth: 33 });
      hitSpark(this, cx, cy, { tint: 0x8ec5ff, count: 8, spread: 40 });
      surgeText(this, cx, cy - 32, 'NEXUS UNLEASHED', '#8ec5ff', 36);
      audio.blip(920);
    }
    return count;
  }

  purgeGnomeProjectile(p) {
    const tint = p.type === 'phone' ? 0x66ccff : p.type === 'anchor' ? 0xaabbcc : 0xe8a060;
    if (this.settings.particles) this.burst(p.x, p.y, tint, 4);
    p.dead = true;
    p.destroy();
  }

  purgeEnemy(e) {
    if (!e || e._d) return;
    e.alive = false;
    if (this.settings.particles) this.burst(e.x, e.y, e.color, 5);
    e.destroy();
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
    this.bus?.emit('hud:gnomeStreak', {
      value: this.gnomeStreak,
      max: GAME.GNOME_STREAK_MAX,
    });
  }

  addGnomeStreak(amount, opts = {}) {
    if (this.draftOpen || this.over) return;
    const prev = this.gnomeStreak;
    this.gnomeStreak = Math.min(GAME.GNOME_STREAK_MAX, this.gnomeStreak + amount);
    this.emitGnomeStreak();
    if (prev < GAME.GNOME_STREAK_MAX && this.gnomeStreak >= GAME.GNOME_STREAK_MAX) {
      if (opts.deferDraft || this.transitioning || this._completingLevel) {
        this.requestPowerDraft('gnome');
        return;
      }
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
    if (this.draftOpen || this.over) return;
    if (this.transitioning && !this._pendingCompleteLevel) return;
    try {
      this._openPowerDraftCore(source);
    } catch (e) {
      console.error('[Game] openPowerDraft failed', e);
      this.draftOpen = false;
      this._draftContainer = null;
      if (this._pendingCompleteLevel) {
        this.time.delayedCall(120, () => this.requestLevelComplete());
      } else {
        this.flushPendingDrafts();
      }
    }
  }

  _openPowerDraftCore(source = 'gnome') {
    this.draftOpen = true;
    this._draftSource = source;
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const picks = rollPositivePowerDraft(this.level, this.nextPowerDropSeed(), 3);
    if (!picks?.length) {
      this.draftOpen = false;
      if (this._pendingCompleteLevel) this.time.delayedCall(120, () => this.requestLevelComplete());
      return;
    }
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
    try {
      this._pickDraftPowerCore(key);
    } catch (e) {
      console.error('[Game] pickDraftPower failed', e);
      this.draftOpen = false;
      this._draftContainer = null;
      if (this._pendingCompleteLevel) {
        this.time.delayedCall(120, () => this.requestLevelComplete());
      } else {
        clearTransitionFlags(this);
        this.flushPendingDrafts();
      }
    }
  }

  _pickDraftPowerCore(key) {
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
      this.time.delayedCall(250, () => {
        this._completingLevel = false;
        this._levelCompleteQueued = false;
        this.requestLevelComplete();
      });
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
    if (!Array.isArray(this.bricks)) return 0;
    return this.bricks.filter((b) => b?.alive && !b.indestructible).length;
  }

  /** Single entry from the update loop — prevents completeLevel() every frame. */
  requestLevelComplete() {
    if (this._completingLevel || this._levelCompleteQueued || this._pendingCompleteLevel) return;
    if (this.draftOpen) {
      this._pendingCompleteLevel = true;
      return;
    }
    if (!this.canCompleteLevel()) return;
    this._levelCompleteQueued = true;
    void this.completeLevel();
  }

  isBallBreakable(br) {
    if (!br?.alive || br.indestructible) return false;
    if (br.type === 'hostage' && !br.hostageCleared) return false;
    if (this.challengeSys?.cannonsOnly && br.type === 'silver') return false;
    if (br.vineUntil > (this.time?.now ?? 0)) return true;
    return true;
  }

  isBallReachable(br) {
    if (!this.isBallBreakable(br)) return false;
    const below = this.bricks.filter(
      (x) => x.alive && x !== br
        && Math.abs(x.cx - br.cx) < br.w * 0.55
        && x.y > br.y + br.h * 0.15,
    );
    return !below.some((x) => this.isColumnBlocker(x));
  }

  isColumnBlocker(b) {
    if (!b?.alive) return false;
    if (b.indestructible && (b.type === 'steel' || b.type === 'gold')) return true;
    if (b.type === 'hostage' && !b.hostageCleared) return true;
    if (this.challengeSys?.cannonsOnly && b.type === 'silver') return true;
    return false;
  }

  fixBlockedColumns() {
    const cellW = (this.bricks[0]?.w ?? BRICK.WIDTH) + BRICK.GAP;
    const left = playfieldSideInset();
    const byCol = new Map();
    for (const b of this.bricks) {
      if (!b.alive) continue;
      const c = Math.round((b.cx - left) / cellW);
      if (!byCol.has(c)) byCol.set(c, []);
      byCol.get(c).push(b);
    }
    for (const col of byCol.values()) {
      col.sort((a, b) => b.y - a.y);
      for (let i = 0; i < col.length; i++) {
        const b = col[i];
        if (!this.isColumnBlocker(b) && b.type !== 'steel' && b.type !== 'gold') continue;
        if (b.type !== 'steel' && b.type !== 'gold' && b.type !== 'hostage') continue;
        const hasAbove = col.slice(i + 1).some((x) => x.alive && this.isBallBreakable(x));
        if (!hasAbove) continue;
        if (b.type === 'hostage') {
          b.clearHostage?.();
          b.hp = b.maxHp = 1;
          b.drawFx();
          b.sync?.();
        } else {
          this.demoteWallBrick(b);
        }
      }
    }
  }

  demoteWallBrick(b) {
    b.type = 'reinforced';
    b.indestructible = false;
    b.maxHp = b.hp = clamp(2 + Math.floor(this.level / 10), 2, 3);
    b.color = this.theme?.bricks?.[(b.zoneRow ?? 0) % (this.theme?.bricks?.length ?? 1)] ?? b.color;
    b.drawFx();
    b.sync?.();
  }

  ensureLevelWinnable() {
    this.fixBlockedColumns();
    if (this.bricks.some((b) => b.alive && this.isBallReachable(b))) return;

    const maxY = Math.max(...this.bricks.filter((b) => b.alive).map((b) => b.y), 0);
    const bh = this.bricks[0]?.h ?? BRICK.HEIGHT;
    for (const b of this.bricks) {
      if (!b.alive) continue;
      const onFront = b.y >= maxY - bh * 0.5;
      if (onFront && (b.type === 'steel' || b.type === 'gold')) this.demoteWallBrick(b);
      if (onFront && this.challengeSys?.cannonsOnly && b.type === 'silver') {
        b.type = 'reinforced';
        b.indestructible = false;
        b.maxHp = b.hp = clamp(b.hp, 2, 3);
        b.drawFx();
        b.sync?.();
      }
      if (onFront && b.type === 'hostage' && !b.hostageCleared) {
        b.clearHostage?.();
        b.hp = b.maxHp = 1;
        b.drawFx();
        b.sync?.();
      }
    }

    if (this.bricks.some((b) => b.alive && this.isBallReachable(b))) return;
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
    if (this.paddle.body?.setScale) this.paddle.body.setScale(1);
    this.paddle.sync?.();
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
    this.clearBallEchoFx(ball);

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
      if (mod === 'mega') ball.setMega(true);
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
      case 'PaddleSpikes': this.paddle.setSpikesActive(true); break;
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
      case 'PaddleSpikes':
        this.paddle.setSpikesActive(true);
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
      case 'Missile': {
        const tgt = this.nearestDestructible(ball.x, ball.y);
        const tx = tgt?.cx ?? this.paddle.x;
        const ty = tgt?.cy ?? this.paddle.top - ball.r * 2;
        const aim = Math.atan2(ty - ball.y, tx - ball.x);
        ball.vx = Math.cos(aim) * sp * 0.92;
        ball.vy = Math.sin(aim) * sp * 0.92;
        ball._steerPhase = Math.random() * Math.PI * 2;
        break;
      }
      case 'Gravity':
        ball.vy += sp * 0.35;
        ball.vx += (this.paddle.x - ball.x) * 0.08;
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
      this.bus?.emit('hud:toast', { text: def.desc, ms: 2200 });
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
        this.emitLifeHud();
        rippleRing(this, this.paddle.x, this.paddle.y, { tint: powerFillColor('ExtraPaddle'), scale: 3, dur: 480 });
        break;
      case 'InstantWin':
        this.forceClearDestructibles();
        this.flash('LEVEL CLEAR!', cssHex(PAL.accent2), 650, 'high');
        this.time.delayedCall(250, () => this.requestLevelComplete());
        break;
      case 'Earthquake': this.doEarthquake(); break;
      case 'Shuffle': this.doShuffle(); break;
      case 'Joker': this.doJoker(); break;
      case 'GnomeRush': this.doGnomeRush(); break;
      case 'Shield':
      case 'ShieldII':
        this.shieldHitsLeft = def.shieldHits ?? 1;
        break;
      case 'PaddleSpikes':
        this.paddle.setSpikesActive(true);
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
      case 'PaddleSpikes': this.paddle.setSpikesActive(false); break;
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
    const pool = DROPPABLE_KEYS.filter((k) => k !== 'Joker' && !POWERS[k].joker);
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
    this.stopBlackHole();
    const alive = this.bricks.filter((b) => b.alive && !b.indestructible);
    if (!alive.length) return;
    const center = pick(alive);
    const x = center.cx;
    const y = center.cy;
    this.blackHole = { x, y, pulse: 0, angle: 0 };
    const R = Math.min(GAME.WIDTH, GAME.HEIGHT) * GAME.BLACK_HOLE_RADIUS;

    this._bhDisk = this.add.graphics().setDepth(7);
    this._bhCore = this.add.image(x, y, 'orb')
      .setDepth(9).setTint(0x1a0008).setAlpha(0.95).setScale(R / 90);
    this._bhRing = this.add.image(x, y, 'ring')
      .setDepth(10).setTint(0xff3355).setAlpha(0.62).setBlendMode('ADD')
      .setDisplaySize(R * 1.05, R * 1.05);
    this._bhRingOuter = this.add.image(x, y, 'ring')
      .setDepth(9).setTint(0xaa1144).setAlpha(0.28).setBlendMode('ADD')
      .setDisplaySize(R * 1.65, R * 1.65);
    this.tweens.add({
      targets: this._bhRing,
      angle: 360,
      duration: 2800,
      repeat: -1,
      ease: 'Linear',
    });
    this.tweens.add({
      targets: this._bhRingOuter,
      angle: -360,
      duration: 5200,
      repeat: -1,
      ease: 'Linear',
    });
    microShake(this, 0.008, 320);
    this.flash('VOID VORTEX', '#ff5577', 750);
    this.drawBlackHoleDisk();
  }

  drawBlackHoleDisk() {
    if (!this.blackHole || !this._bhDisk) return;
    const { x, y, pulse } = this.blackHole;
    const R = Math.min(GAME.WIDTH, GAME.HEIGHT) * GAME.BLACK_HOLE_RADIUS;
    const g = this._bhDisk;
    g.clear();
    for (let i = 4; i >= 0; i--) {
      const wobble = Math.sin(pulse * 0.12 + i * 1.1) * 8;
      const r = R * (0.22 + i * 0.17) + wobble;
      g.fillStyle(0x220008, 0.06 + i * 0.05);
      g.fillCircle(x, y, r);
    }
    g.lineStyle(2, 0xff4466, 0.35);
    g.strokeCircle(x, y, R * 0.55 + Math.sin(pulse * 0.15) * 4);
  }

  pullBlackHole(dtSec = 1 / 60) {
    if (!this.blackHole || !this.powerSys.isActive('BlackHole')) return;
    const { x, y } = this.blackHole;
    const R = Math.min(GAME.WIDTH, GAME.HEIGHT) * GAME.BLACK_HOLE_RADIUS;
    const pull = 0.14 + dtSec * 4.5;

    for (const b of this.bricks) {
      if (!b.alive || b.indestructible) continue;
      const d = Math.hypot(b.cx - x, b.cy - y);
      if (d > R) continue;
      const t = 1 - d / R;
      const f = pull * t * t;
      b.x += (x - b.cx) * f;
      b.y += (y - b.cy) * f;
      b.baseX = b.x;
      if (d < R * 0.14 && b.hit(99)) this.destroyBrick(b, false);
      b.sync();
    }

    this.blackHole.pulse++;
    this.blackHole.angle += dtSec * 2.5;
    const pulse = this.blackHole.pulse;
    const wobble = Math.sin(pulse * 0.1) * 0.06;
    this._bhCore?.setPosition(x, y).setScale((R / 85) * (0.92 + wobble));
    this._bhRing?.setPosition(x, y);
    this._bhRingOuter?.setPosition(x, y);
    this.drawBlackHoleDisk();

    if (pulse % 8 === 0 && this.settings.particles) {
      const a = this.blackHole.angle;
      shardBurst(this, x + Math.cos(a) * R * 0.4, y + Math.sin(a) * R * 0.4, 0xff2244, 3);
    }
  }

  stopBlackHole() {
    this._bhDisk?.destroy();
    this._bhCore?.destroy();
    this._bhRing?.destroy();
    this._bhRingOuter?.destroy();
    this._bhDisk = null;
    this._bhCore = null;
    this._bhRing = null;
    this._bhRingOuter = null;
    this.blackHole = null;
  }

  clearBallEchoFx(ball) {
    if (!ball?._echoSprites?.length) return;
    ball._echoSprites.forEach((s) => {
      s?.core?.destroy?.();
      s?.halo?.destroy?.();
    });
    ball._echoSprites = null;
    if (ball._echoCd) ball._echoCd.clear?.();
    ball._echoCd = null;
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
    if (!ball.echoMode) {
      this.clearBallEchoFx(ball);
      return;
    }
    ball.echoAngle += dtSec * GAME.ECHO_ORBIT_SPEED;
    const orbitR = Math.max(
      ball.r * GAME.ECHO_ORBIT_RADIUS,
      BRICK.HEIGHT * 1.15,
      BRICK.WIDTH * 0.55,
      52,
    );
    const count = GAME.ECHO_ORBIT_COUNT;
    const nodeR = Math.max(ball.r * 1.1, 10);

    if (!ball._echoSprites || ball._echoSprites.length !== count) {
      this.clearBallEchoFx(ball);
      ball._echoSprites = [];
      for (let i = 0; i < count; i++) {
        const core = this.add.image(0, 0, 'ball-core')
          .setDepth(23).setTint(0xf0f0ff).setAlpha(0.9).setBlendMode('ADD');
        const halo = this.add.image(0, 0, 'orb')
          .setDepth(22).setTint(0xc8b8ff).setAlpha(0.45).setBlendMode('ADD');
        ball._echoSprites.push({ core, halo });
      }
    }

    ball._echoCd = ball._echoCd ?? new Map();
    const now = this.time.now;
    for (let i = 0; i < count; i++) {
      const a = ball.echoAngle + (i * Math.PI * 2) / count;
      const ex = ball.x + Math.cos(a) * orbitR;
      const ey = ball.y + Math.sin(a) * orbitR;
      const sprites = ball._echoSprites[i];
      if (sprites) {
        sprites.core.setPosition(ex, ey).setDisplaySize(nodeR * 2, nodeR * 2);
        sprites.halo.setPosition(ex, ey).setDisplaySize(nodeR * 4.2, nodeR * 4.2)
          .setAlpha(0.38 + 0.12 * Math.sin(this.frame * 0.2 + i));
      }
      const hitR = nodeR + BRICK.HEIGHT * 0.65;
      for (const br of this.bricks) {
        if (!br.alive || br.indestructible) continue;
        if ((ball._echoCd.get(br) ?? 0) > now) continue;
        if (Math.hypot(ex - br.cx, ey - br.cy) > hitR) continue;
        if (br.hit(1)) {
          this.destroyBrick(br, true, ball);
          ball._echoCd.set(br, now + 120);
          hitSpark(this, ex, ey, { tint: 0xe8e0ff, count: 4, spread: 16 });
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

  ballOverlapsProjectile(ball, proj) {
    if (!ball || !proj || proj.dead) return false;
    const pr = proj.r ?? 12;
    return Math.hypot(ball.x - proj.x, ball.y - proj.y) < ball.r + pr * 0.9;
  }

  /** Ball shatters gnome pots/projectiles — no bounce, passes through. */
  shatterProjectileFromBall(ball, p) {
    const tint = p.type === 'phone' ? 0x66ccff : p.type === 'anchor' ? 0xaabbcc : 0xe8a060;
    this.burst(p.x, p.y, tint, this.settings.reducedFx ? 6 : 12);
    shardBurst(this, p.x, p.y, tint, this.settings.reducedFx ? 4 : 8);
    audio.blip(720);
    this.score += p.type === 'pot' ? 55 : 35;
    if (p.type === 'anchor') {
      this.floatText(p.x, p.y, 'ANCHOR SMASH', '#aabbcc', 18);
    } else if (p.type === 'phone') {
      this.floatText(p.x, p.y, 'SHATTERED', '#66ccff', 18);
    } else {
      this.floatText(p.x, p.y, '+POT', '#e8a060', 20);
    }
    p.dead = true;
    p.destroy();
  }

  hasPaddleSpikes() {
    return this.powerSys?.isActive('PaddleSpikes');
  }

  /** Spiked paddle — destroy hazard, no stun / shrink / scramble. */
  deflectProjectileWithSpikes(p) {
    const tint = p.type === 'phone' ? 0x66ccff : p.type === 'anchor' ? 0xaabbcc : 0xe8a060;
    this.burst(p.x, p.y, tint, this.settings.reducedFx ? 8 : 14);
    shardBurst(this, p.x, p.y, tint, this.settings.reducedFx ? 5 : 9);
    rippleRing(this, this.paddle.x, this.paddle.top, { tint: 0x88ddff, scale: 2.2, dur: 280 });
    wobble(this, this.paddle.body, { angle: 3, dur: 100, repeat: 0 });
    audio.spikeDeflect?.();
    this.score += p.type === 'anchor' ? 45 : 40;
    const label = p.type === 'anchor' ? 'ANCHOR SPIKED' : p.type === 'phone' ? 'PHONE SPIKED' : 'POT SPIKED';
    this.floatText(p.x, p.y - 8, label, '#88ddff', 20);
  }

  spikeDeflectEnemy(e) {
    this.killEnemy(e);
    rippleRing(this, this.paddle.x, this.paddle.top, { tint: 0x88ddff, scale: 2.4, dur: 300 });
    audio.spikeDeflect?.();
  }

  handleProjectileHit(p) {
    if (this.hasPaddleSpikes()) {
      this.deflectProjectileWithSpikes(p);
      return;
    }
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
        this.bus?.emit('hud:scramble', true);
        this._uiScrambleTimer = this.time.delayedCall(GAME.PHONE_SCRAMBLE_MS, () => {
          this.uiScrambleUntil = 0;
          this._uiScrambleTimer = null;
          this.bus?.emit('hud:scramble', false);
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
    if (this.settings.particles && breakStyle === 'normal') {
      const n = fromBall
        ? (this.settings.reducedFx ? 5 : 9)
        : 4;
      this.burst(brick.cx, brick.cy, brick.color, n);
    }
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

  /**
   * Per-brick roll capped by level budget and remaining destructibles (dense boards stay ~2–4 drops).
   * @see Helpers.dropChance, Helpers.brickPowerDropBudget
   */
  brickDropChance() {
    const budget = this._brickDropBudget ?? brickPowerDropBudget(this.level);
    const dropped = this.brickPowerDropsThisLevel ?? 0;
    const dropsLeft = budget - dropped;
    if (dropsLeft <= 0) return 0;

    const base = brickDropChanceForLevel(this.level);
    const remaining = Math.max(1, this.destructiblesLeft());
    const scaled = (dropsLeft / remaining) * 1.05;
    return Math.min(base, scaled);
  }

  tryBrickPowerDrop(brick) {
    if (!brick || brick.indestructible) return;
    const noDrop = ['gold', 'steel', 'boss', 'portal', 'hostage'];
    if (noDrop.includes(brick.type)) return;

    const budget = this._brickDropBudget ?? brickPowerDropBudget(this.level);
    if ((this.brickPowerDropsThisLevel ?? 0) >= budget) return;

    let chanceMult = 1;
    if (['silver', 'explosive', 'reinforced'].includes(brick.type)) chanceMult = 1.15;
    else if (['nest', 'shifting', 'moss', 'mirror'].includes(brick.type)) chanceMult = 0.85;

    const seed = this.nextPowerDropSeed();
    const rng = mulberry32(seed);
    const chance = Math.min(1, this.brickDropChance() * chanceMult);
    if (rng() >= chance) return;
    const cap = this.spawnPowerCapsule(brick.cx, brick.cy);
    if (!cap) return;
    this.brickPowerDropsThisLevel = (this.brickPowerDropsThisLevel ?? 0) + 1;
  }

  /** Unique seed per capsule drop — reusing levelSeed alone repeats the same power every time. */
  nextPowerDropSeed() {
    const seq = this.powerDropSeq++;
    return (this.levelSeed ^ (seq * 2654435761) ^ (this.level * 7919)) >>> 0;
  }

  ballLost(ball) {
    if (this._ballLossBeat || this.over) return;
    this.clearBallEchoFx(ball);
    ball.destroy();
    this.balls = this.balls.filter((b) => b !== ball);
    if (this.balls.length > 0) return;

    hapticPulse(40);
    microShake(this, 0.012, 220);
    this.combo = 0;
    this.lives--;
    this.emitLifeHud();
    this.gnomeStreak = 0;
    this.emitGnomeStreak();
    this.powerSys.clearAll();
    this.paddle.reset();
    this.bullets.forEach((b) => b.destroy());
    this.bullets = [];
    this.pots.forEach((p) => p.destroy());
    this.pots = [];
    this.bulletTimeRemaining = 0;
    this.timeScale = 1;
    RunPersistence.saveRun(this);

    this.playBallLossBeat(() => this.finishBallLossRespawn());
  }

  /** Brief beat: freeze play, stop music, gnomes taunt, then respawn or game over. */
  playBallLossBeat(onDone) {
    const ms = JARDINAIN.BALL_LOSS_BEAT_MS ?? JARDINAIN.TAUNT_MS;
    this._ballLossBeat = true;
    audio.stopMusic();
    audio.gnomeLaugh?.();

    const alive = this.jardinains.filter((j) => !j._destroyed);
    alive.forEach((j) => j.playTauntLaugh?.());
    const taunt = pick(GNOME_TAUNT_MESSAGES);
    this.floatText(GAME.WIDTH / 2, GAME.HEIGHT * 0.4, taunt, '#7eb87a', 26);
    if (alive.length) {
      rippleRing(this, GAME.WIDTH / 2, GAME.HEIGHT * 0.38, { tint: 0x7eb87a, scale: 2.6, dur: ms * 0.7 });
    }

    this._ballLossTimer?.remove(false);
    this._ballLossTimer = this.time.delayedCall(ms, () => {
      this._ballLossTimer = null;
      if (!this.sys?.isActive?.() || this.over) return;
      this._ballLossBeat = false;
      onDone?.();
    });
  }

  finishBallLossRespawn() {
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }
    audio.setLevelMusic(this.level, this.levelSeed, {
      biome: this.theme?.biome ?? 'garden',
      isBoss: !!this.isBoss,
    });
    this.flash(pick(GAME_OVER_MESSAGES), '#ff5a6e', 1000, 'high');
    this.balls.push(new Ball(this, this.paddle, 0));
    this.balls.forEach((b) => { this.syncBallSpeed(b, { reset: true }); });
    this.applyEquippedCosmetics();
    this.emitStats();
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
    this.scene.stop(SCENES.UI);
    this.scene.start(SCENES.GAME, { newGame: true });
  }

  doResume() { InputRouter.onOverlayClose(); this.scene.resume(); }

  async completeLevel() {
    this._levelCompleteQueued = false;
    if (this._completingLevel) return;
    if (this.draftOpen) {
      this._pendingCompleteLevel = true;
      return;
    }
    if (!this.canCompleteLevel()) {
      this.flash('GOAL INCOMPLETE', '#ff8899', 800, 'high');
      return;
    }
    this._completingLevel = true;
    this.transitioning = true;
    try {
      await this._completeLevelCore();
    } catch (e) {
      console.error('[Game] completeLevel failed', e);
      if (this.destructiblesLeft() <= 0) {
        this._retryLevelCompleteOverlay();
        return;
      }
      clearTransitionFlags(this);
      try {
        if (this.scene?.isPaused?.()) this.scene.resume();
        InputRouter.onOverlayClose();
      } catch { /* ignore */ }
    }
  }

  _retryLevelCompleteOverlay() {
    if (this._levelCompleteRetrying) return;
    this._levelCompleteRetrying = true;
    this._completingLevel = true;
    this.transitioning = true;
    if (!this.scene?.isPaused?.()) this.scene.pause();
    this.time.delayedCall(400, () => {
      this._levelCompleteRetrying = false;
      try {
        const bonus = this._lastLevelBonus ?? Math.round(GAME.SCORE_LEVEL_CLEAR + this.lives * 200);
        this.scene.launch(SCENES.LEVEL_COMPLETE, {
          level: this.level,
          message: pick(LEVEL_CLEARED_MESSAGES),
          bonus,
          score: this.score,
          stars: this.evaluateStars(),
          lives: this.lives,
          continues: this.continues,
          goal: this.goal?.label,
          treasury: MetaProgress.getTreasury(),
          gems: MetaProgress.getGems(),
        });
        InputRouter.onOverlayOpen(SCENES.LEVEL_COMPLETE);
      } catch (e) {
        console.error('[Game] level complete retry failed', e);
        clearTransitionFlags(this);
        try {
          this._startNextLevelCore();
        } catch (e2) {
          console.error('[Game] emergency startNextLevel failed', e2);
          clearTransitionFlags(this);
          this.scene?.resume?.();
        }
      }
    });
  }

  async _completeLevelCore() {
    // Meter fill — queue draft picks until after the level-clear overlay (never block on draft here).
    this.addGnomeStreak(GAME.GNOME_STREAK_LEVEL_BONUS, { deferDraft: true });
    this.addBtMeter(GAME.BT_METER_LEVEL_FILL, { deferDraft: true });
    if (this.draftOpen) {
      this._pendingCompleteLevel = true;
      return;
    }
    this.combo = 0;
    const stars = this.evaluateStars();
    const levelKey = `L${this.level}`;
    MetaProgress.setStars(levelKey, stars);
    MetaProgress.addTreasury(stars * 50);
    const gemsEarned = gemsForLevelClear(this.level, stars);
    MetaProgress.addGems(gemsEarned);
    this.bus?.emit('hud:treasury', { value: MetaProgress.getTreasury() });
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
    AdBreakPolicy.recordLevelSuccess();
    try {
      this.scene.launch(SCENES.LEVEL_COMPLETE, {
        level: this.level, message: pick(LEVEL_CLEARED_MESSAGES), bonus, score: this.score, stars,
        lives: this.lives, continues: this.continues,
        goal: this.goal?.label, treasury: MetaProgress.getTreasury(),
        gemsEarned, gems: MetaProgress.getGems(),
      });
      InputRouter.onOverlayOpen(SCENES.LEVEL_COMPLETE);
    } catch (e) {
      console.warn('[Game] level complete overlay failed', e);
      this._retryLevelCompleteOverlay();
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
    try {
      this._startNextLevelCore();
    } catch (e) {
      console.error('[Game] startNextLevel failed', e);
      clearTransitionFlags(this);
      try {
        InputRouter.onOverlayClose();
        if (this.scene?.isPaused?.()) this.scene.resume();
      } catch { /* ignore */ }
    }
  }

  _startNextLevelCore() {
    this.level++;
    const nd = difficultyFor(this.level);
    if (this.level > 1 && this.level % nd.lifeRewardEvery === 0) {
      this.lives++;
      this.emitLifeHud();
    }
    if (this.arenaGfx?.active) {
      this.arenaGfx.setAlpha(1);
      this.arenaGfx.setScale(1);
    }
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
      try {
        this.applyPower(k);
      } catch (e) {
        console.warn('[Game] carry-over power failed', e);
      }
    }
    this.flushPendingDrafts();
  }

  /** Push lives to DOM/canvas HUD immediately (stats + life pulse). */
  emitLifeHud() {
    this.bus?.emit('hud:life', { lives: this.lives });
    this.emitStats();
  }

  emitStats() {
    const nestsLeft = this.bricks.filter((b) => b.alive && b.type === 'nest').length;
    const bricksLeft = this.destructiblesLeft();
    const bricksTotal = Math.max(1, this._levelDestructibles ?? bricksLeft);
    this.bus?.emit('hud:stats', {
      score: this.score, lives: this.lives, level: this.level,
      bricksLeft,
      brickProgress: clamp(1 - bricksLeft / bricksTotal, 0, 1),
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
    try {
      this.tickBulletTime(realDt);
      this.bg?.update?.(realDt / 1000, this.isBoss);
    } catch (e) {
      console.warn('[Game] tickBulletTime failed', e);
    }
    if (this.over || this.scene.isPaused()) return;
    if (this._ballLossBeat) {
      try {
        this.paddle?.sync?.();
        this.jardinains.forEach((j) => { if (!j._destroyed) j.syncPosition?.(); });
        this.renderFx?.();
      } catch { /* beat teardown */ }
      return;
    }
    if (this.transitioning && !this._completingLevel) return;
    if (this.draftOpen) {
      try {
        this.paddle.sync();
        this.balls.forEach((b) => b.sync());
      } catch { /* ignore */ }
      return;
    }

    try {
      this._updateGameplay(realDt);
    } catch (e) {
      const now = this.time?.now ?? 0;
      if (now - (this._lastUpdateErrorLog ?? 0) > 2000) {
        this._lastUpdateErrorLog = now;
        console.error('[Game] update failed', e);
      }
    }
  }

  _updateGameplay(realDt) {
    if (!this.paddle || !this.powerSys || !this.statusSys) return;
    const ts = this.timeScale;
    const dtSec = Math.min(realDt / 1000, 1 / 20) * ts;
    const dtMs = realDt * ts;
    this.frame++;

    this.powerSys.tick(dtMs);
    this.statusSys.tick();
    if (this.blackHole && this.powerSys.isActive('BlackHole')) {
      this.pullBlackHole(realDt / 1000);
    }
    this.challengeSys.update(dtMs, this.combo);

    const inv = this.controlsInverted ? -1 : 1;
    const dtSecKb = realDt / 1000;
    if (this.cursors?.left?.isDown || isArrowHeld('left')) this.paddle.moveByKeyboard(-1 * inv, dtSecKb, ts);
    if (this.cursors?.right?.isDown || isArrowHeld('right')) this.paddle.moveByKeyboard(1 * inv, dtSecKb, ts);

    if (this.paddle.hasCannon && !this.paddle.stunned) {
      const aimX = this.paddle.cannonType === 'shock'
        ? (this.nearestDestructible(this.paddle.x, this.paddle.top)?.cx ?? this.paddle.x)
        : this.paddle.x;
      this.fireCannons(aimX);
    }

    const inPlay = this.balls.some((b) => !b.stuck);
    const levelAge = this.time.now - (this.levelStartTime ?? this.time.now);
    const canSpawnEnemies = inPlay || (levelAge > 2200 && this.enemies.length < 1);
    if (canSpawnEnemies && !this._nexusSlowMo) {
      this.enemyTimer -= dtMs * (inPlay ? 1 : 0.5);
      if (this.enemyTimer <= 0 && this.enemies.length < (inPlay ? this.maxEnemies : 1)) {
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
    if (anyStuck !== this._hintShown) {
      this._hintShown = anyStuck;
      this.bus?.emit('hud:hint', anyStuck);
    }

    if (this.destructiblesLeft() === 0) {
      this.requestLevelComplete();
      return;
    }
    if (this.destructiblesLeft() > 0) {
      const reachable = () => this.bricks.some((b) => b.alive && this.isBallReachable(b));
      if (!reachable()) {
        this.fixBlockedColumns();
      }
      if (!reachable()) {
        this.relieveSoftlock();
      } else if (!this._lastBrickBreakAt) {
        this._lastBrickBreakAt = this.time.now;
      } else if (this.time.now - this._lastBrickBreakAt > 28000) {
        this.fixBlockedColumns();
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
      if (throwResult === 'throw' && !this._nexusSlowMo && this.pots.length < 8) {
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
      if (res === 'attack') {
        if (this.hasPaddleSpikes()) {
          this.spikeDeflectEnemy(e);
          this.enemies.splice(i, 1);
        } else {
          this.stunPaddle('HIT!');
          this.burst(e.x, e.y, e.color, 8);
          e.destroy();
          this.enemies.splice(i, 1);
        }
      }
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

  /** Curve ball velocity toward a world target (positive strength = homing). */
  steerBallToward(ball, tx, ty, dtSec, { radialMult, swirlMult, extraVy = 0, phaseRate = 8 }) {
    const dx = tx - ball.x;
    const dy = ty - ball.y;
    const dist = Math.max(40, Math.hypot(dx, dy));
    const nx = dx / dist;
    const ny = dy / dist;
    const tanX = -ny;
    const tanY = nx;
    const baseSp = ball.speed || ball.baseSpeed;
    ball._steerPhase = (ball._steerPhase ?? 0) + dtSec * phaseRate;
    const radial = baseSp * radialMult;
    const swirl = Math.sin(ball._steerPhase) * swirlMult * baseSp * 0.014;
    ball.vx += (nx * radial + tanX * swirl) * dtSec;
    ball.vy += (ny * radial + tanY * swirl) * dtSec;
    if (extraVy) ball.vy += baseSp * extraVy * dtSec;
    ball.clampToSpeed({
      minMult: GAME.STEER_SPEED_MIN,
      maxMult: GAME.STEER_SPEED_MAX,
    });
  }

  applyBallSteering(ball, dtSec) {
    if (!ball.missileMode && !ball.gravityMode) return;

    if (ball.missileMode) {
      const tgt = this.nearestDestructible(ball.x, ball.y);
      const tx = tgt?.cx ?? this.paddle.x;
      const ty = tgt?.cy ?? this.paddle.top - ball.r;
      this.steerBallToward(ball, tx, ty, dtSec, {
        radialMult: GAME.STEER_MISSILE_RADIAL,
        swirlMult: GAME.STEER_SWIRL_MISSILE,
        phaseRate: 10,
      });
      const now = this.time.now;
      if (now > (ball._missileSparkCd ?? 0) && this.settings.particles) {
        ball._missileSparkCd = now + 55;
        const ang = Math.atan2(ball.vy, ball.vx) + Math.PI;
        hitSpark(this, ball.x + Math.cos(ang) * ball.r, ball.y + Math.sin(ang) * ball.r, {
          tint: 0x5ecf8a, count: 3, spread: 22,
        });
      }
      return;
    }

    if (ball.gravityMode) {
      const tx = this.paddle.x;
      const ty = this.paddle.top - ball.r * 0.6;
      this.steerBallToward(ball, tx, ty, dtSec, {
        radialMult: GAME.STEER_GRAVITY_RADIAL,
        swirlMult: GAME.STEER_SWIRL_GRAVITY,
        extraVy: GAME.STEER_GRAVITY_EXTRA_Y,
        phaseRate: 6,
      });
    }
  }

  resolveBallWalls(ball, lw, rw, tw) {
    if (ball.wrap) {
      const span = rw - lw;
      if (ball.x < lw + ball.r) {
        ball.x += span;
        hitSpark(this, ball.x, ball.y, { tint: 0xffe156, count: 4, spread: 16 });
        rippleRing(this, ball.x, ball.y, { tint: 0xffe156, scale: 1.8, dur: 220 });
        audio.wall();
      } else if (ball.x > rw - ball.r) {
        ball.x -= span;
        hitSpark(this, ball.x, ball.y, { tint: 0xffe156, count: 4, spread: 16 });
        rippleRing(this, ball.x, ball.y, { tint: 0xffe156, scale: 1.8, dur: 220 });
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

  /** Safety-net bar — flush under the paddle, spanning ball wall insets. */
  getShieldBarRect() {
    const inset = ballSideInset();
    const barH = Math.max(10, Math.round((GAME.PADDLE_HEIGHT ?? 28) * 0.45));
    const gap = Math.max(3, Math.round(barH * 0.25));
    const paddleBottom = this.paddle
      ? this.paddle.y + this.paddle.h * 0.5
      : GAME.HEIGHT - (GAME.PADDLE_Y_OFFSET ?? 78) + (GAME.PADDLE_HEIGHT ?? 28) * 0.5;
    const top = Math.min(paddleBottom + gap, GAME.HEIGHT - barH - 4);
    return {
      x: inset,
      y: top,
      w: GAME.WIDTH - inset * 2,
      h: barH,
      top,
    };
  }

  updateBalls(dtSec) {
    const bx = ballSideInset();
    const lw = bx;
    const rw = GAME.WIDTH - bx;
    const tw = GAME.WALL_TOP;
    const env = this.envSpeedMult();
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (ball.stuck) {
        const { min, max } = this.paddle._xLimits();
        ball.x = clamp(this.paddle.x + ball.stuckOffset, min - this.paddle.w / 2 + ball.r, max + this.paddle.w / 2 - ball.r);
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
        for (let pi = this.pots.length - 1; pi >= 0; pi--) {
          const p = this.pots[pi];
          if (!this.ballOverlapsProjectile(ball, p)) continue;
          this.shatterProjectileFromBall(ball, p);
          this.pots.splice(pi, 1);
        }
      }

      const shieldBar = this.getShieldBarRect();
      if (
        (this.powerSys.isActive('Shield') || this.powerSys.isActive('ShieldII'))
        && ball.vy > 0
        && ball.y + ball.r > shieldBar.top
      ) {
        ball.vy = -Math.abs(ball.vy);
        ball.y = shieldBar.top - ball.r - 0.5;
        rippleRing(this, ball.x, shieldBar.top, {
          tint: this.powerSys.isActive('ShieldII') ? 0xffffff : powerFillColor('Shield'),
          scale: 2.2,
          dur: 280,
          depth: 22,
        });
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
        if (killed) this.destroyBrick(br, true, ball);
        else if (!br.indestructible) audio.brickBreak?.(br.type, 0, br.hp) ?? audio.brick(0);
        break;
      }
    }
  }

  /** Closest overlapping brick along shot path (upward shots prefer the lowest tile hit). */
  projectileTargetBrick(b) {
    const hw = b.hitW ?? 4;
    let hit = null;
    for (const br of this.bricks) {
      if (!br.alive) continue;
      if (b.x + hw <= br.x || b.x - hw >= br.x + br.w || b.y <= br.y || b.y >= br.y + br.h) continue;
      if (!hit || br.y + br.h > hit.y + hit.h) hit = br;
    }
    return hit;
  }

  projectileHitBrick(b) {
    const br = this.projectileTargetBrick(b);
    if (!br) return false;

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
        const walletGain = Math.max(1, Math.round(gm.value / 80));
        MetaProgress.addGems(walletGain);
        this.floatText(gm.x, this.paddle.top, `+${gm.value}  +${walletGain}💎`, '#9ff0ff', 26);
        this.burst(gm.x, gm.y, 0x9ff0ff, 8);
        audio.gemPickup?.();
        this.bus?.emit('hud:treasury', { value: MetaProgress.getTreasury() });
        gm.destroy();
        this.gems.splice(i, 1);
        continue;
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
      const bar = this.getShieldBarRect();
      this.shieldGfx.fillStyle(tint, a);
      this.shieldGfx.fillRect(bar.x, bar.y, bar.w, bar.h);
      this.shieldGfx.lineStyle(2, tint, a * 1.35);
      this.shieldGfx.strokeRect(bar.x + 1, bar.y + 1, bar.w - 2, bar.h - 2);
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
