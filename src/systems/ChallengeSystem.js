import { Gem } from '../objects/Gem.js';
import { mulberry32 } from '../utils/Helpers.js';
import { GAME, JARDINAIN } from '../config/Constants.js';

export class ChallengeSystem {
  constructor(scene) {
    this.scene = scene;
    this.bonusBrick = null;
    this.bonusTimer = 0;
    this.comboGateDone = false;
    this.mutator = null;
    this.mutators = [];
    this.potMonsoon = false;
    this.glassFloor = false;
    this.cannonsOnly = false;
    this.gnomeParliament = false;
    this.brickBloom = false;
  }

  onLevelStart(level, isBoss, levelSeed = level, forcedMutator = null, forcedMutators = null) {
    this.bonusTimer = 15000;
    this.comboGateDone = false;
    this.bonusBrick = null;
    this.mutators = forcedMutators ?? (forcedMutator ? [forcedMutator] : []);
    this.mutator = this.mutators[0] ?? null;
    this.potMonsoon = false;
    this.glassFloor = false;
    this.cannonsOnly = false;
    this.gnomeParliament = false;
    this.brickBloom = false;

    this.scene.cameras?.main?.setAlpha(1);
    this.mutators.forEach((m) => this.applyOneMutator(m));
    this.spawnBonusBrick(levelSeed);
    this.scene.bus?.emit('hud:mutators', this.mutators);
  }

  applyOneMutator(mut) {
    const gs = this.scene;
    if (!mut) return;
    switch (mut) {
      case 'FastBall':
        gs.balls.forEach((b) => b.setSpeed(b.speed * 1.15));
        break;
      case 'LowVisibility':
        gs.cameras?.main?.setAlpha(0.88);
        break;
      case 'DoubleJardinains':
        gs.jardinainPressure = (gs.jardinainPressure ?? 1) * 2;
        break;
      case 'NarrowArena':
        gs.paddle.setWidth(gs.paddle.baseW * 0.75);
        break;
      case 'WideArena':
        gs.paddle.setWidth(Math.min(gs.paddle.baseW * 1.25, GAME.WIDTH * 0.42));
        gs.paddle.speedMult = 1.12;
        break;
      case 'GnomeSwarm':
        gs.jardinainPressure = (gs.jardinainPressure ?? 1) * 1.45;
        break;
      case 'BrickFrenzy':
        gs.enemySpawnMs = Math.max(2200, (gs.enemySpawnMs ?? 6000) * 0.62);
        break;
      case 'HeavyGravity':
        gs.levelGravityScale = (gs.levelGravityScale ?? 1) * 1.25;
        break;
      case 'PotMonsoon':
        this.potMonsoon = true;
        gs.potThrowMult = (gs.potThrowMult ?? 1) * 2;
        gs.jugglePointMult = (gs.jugglePointMult ?? 1) * 2;
        break;
      case 'GlassFloor':
        this.glassFloor = true;
        gs.scoreMultLevel = (gs.scoreMultLevel ?? 1) * 1.5;
        break;
      case 'CannonsOnly':
        this.cannonsOnly = true;
        break;
      case 'GnomeParliament':
        this.gnomeParliament = true;
        gs.maxJardinains = (gs.maxJardinains ?? JARDINAIN.MAX_ALIVE) + 2;
        break;
      case 'BrickBloom':
        this.brickBloom = true;
        break;
    }
  }

  applyMutator() {
    this.mutators.forEach((m) => this.applyOneMutator(m));
  }

  spawnBonusBrick(levelSeed) {
    const candidates = this.scene.bricks.filter((b) => b.alive && b.type === 'normal');
    if (!candidates.length) return;
    const rng = mulberry32((levelSeed ^ 0xb0a5) >>> 0);
    const b = candidates[(rng() * candidates.length) | 0];
    b.isBonus = true;
    b.color = 0xffd700;
    b.panel?.setTint(0xffd700);
    this.bonusBrick = b;
    if (b.panel) {
      this.scene.tweens.add({
        targets: b.panel,
        scaleX: { from: 1, to: 1.06 },
        scaleY: { from: 1, to: 1.06 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  update(dtMs, combo) {
    if (this.bonusTimer > 0) this.bonusTimer -= dtMs;

    if (!this.comboGateDone && combo >= 6) {
      this.comboGateDone = true;
      const b = this.scene.bricks.find((br) => br.alive && br.type !== 'gold');
      if (b) {
        for (let i = 0; i < 3; i++) {
          this.scene.gems.push(new Gem(this.scene, b.cx + (i - 1) * 30, b.cy, 150, 0xffd23d));
        }
      }
    }
  }

  onBrickDestroyed(brick) {
    if (brick.isBonus && this.bonusTimer > 0) {
      this.scene.score += 500;
      this.scene.floatText(brick.cx, brick.cy, '+500 BONUS', '#ffd23d', 32);
    }
    if (this.bonusBrick === brick) this.bonusBrick = null;
    if (this.brickBloom && brick.type !== 'gold' && brick.type !== 'steel') {
      this.scene.spawnVineBlock(brick.cx, brick.cy, 3000);
    }
  }

  getEnemyType(level) {
    if (level >= 35) return 'zigzag';
    if (level >= 20) return 'chaser';
    if (level >= 8) return 'drifter';
    return 'drifter';
  }
}
