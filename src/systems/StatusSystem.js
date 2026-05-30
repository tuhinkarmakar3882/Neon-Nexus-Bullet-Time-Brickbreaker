// Burn/freeze/burn-DOT status on bricks and Jardinains.

export class StatusSystem {
  constructor(scene) {
    this.scene = scene;
    this.brickStatus = new Map();
    this.jardinainStatus = new Map();
    this.burnTiles = new Map();
  }

  adjacentBricks(brick) {
    const gap = 4;
    return this.scene.bricks.filter((b) => {
      if (!b.alive || b === brick) return false;
      const touchX = Math.abs(b.cx - brick.cx) < (brick.w + b.w) / 2 + gap;
      const touchY = Math.abs(b.cy - brick.cy) < (brick.h + b.h) / 2 + gap;
      const alignX = Math.abs(b.cy - brick.cy) < Math.min(brick.h, b.h) * 0.6;
      const alignY = Math.abs(b.cx - brick.cx) < Math.min(brick.w, b.w) * 0.6;
      return (touchX && alignY) || (touchY && alignX);
    });
  }

  gridDistance(a, b) {
    const cellW = a.w + (this.scene.brickGap ?? 10);
    const cellH = a.h + (this.scene.brickGap ?? 10);
    const col = Math.round(Math.abs(a.cx - b.cx) / cellW);
    const row = Math.round(Math.abs(a.cy - b.cy) / cellH);
    return Math.max(col, row);
  }

  freezeBrick(brick, ms = 3000) {
    if (!brick?.alive) return;
    this.brickStatus.set(brick, { type: 'freeze', until: this.scene.time.now + ms });
    brick.frozen = true;
    brick.drawFx();
  }

  /** Napalm / acid — DOT on brick + spreads to touching neighbors. */
  igniteBrick(seed, ms = 4000) {
    if (!seed?.alive || seed.indestructible) return;
    const until = this.scene.time.now + ms;
    [seed, ...this.adjacentBricks(seed).filter((b) => !b.indestructible)].forEach((b) => {
      if (!b.alive) return;
      b.burning = true;
      this.burnTiles.set(b, { until, nextTick: this.scene.time.now + 400 });
      b.drawFx();
    });
  }

  markFrostCluster(seed) {
    if (!seed?.alive || seed.indestructible) { seed?.clang?.(); return; }
    [seed, ...this.adjacentBricks(seed).filter((b) => !b.indestructible)].forEach((b) => {
      b.frostMarked = true;
      b.drawFx();
    });
  }

  spreadFrostFrom(brick) {
    this.adjacentBricks(brick).forEach((b) => {
      if (!b.alive || b.indestructible) return;
      b.frostMarked = true;
      b.drawFx();
    });
  }

  freezeJardinain(j, ms = 3000) {
    if (j._destroyed) return;
    this.jardinainStatus.set(j, { type: 'freeze', until: this.scene.time.now + ms });
    j.frozen = true;
  }

  isFrozen(entity) {
    return entity?.frozen === true;
  }

  tick() {
    const now = this.scene.time.now;
    for (const [brick, st] of this.brickStatus) {
      if (now >= st.until) {
        this.brickStatus.delete(brick);
        if (brick.alive) {
          brick.frozen = false;
          brick.drawFx();
        }
      }
    }
    for (const [j, st] of this.jardinainStatus) {
      if (now >= st.until) {
        this.jardinainStatus.delete(j);
        j.frozen = false;
      }
    }
    for (const [brick, burn] of this.burnTiles) {
      if (!brick.alive) { this.burnTiles.delete(brick); continue; }
      if (now >= burn.until) {
        brick.burning = false;
        this.burnTiles.delete(brick);
        brick.drawFx();
        continue;
      }
      if (now >= burn.nextTick) {
        burn.nextTick = now + 400;
        if (brick.hit(1)) this.scene.destroyBrick(brick, false);
        else brick.drawFx();
      }
    }
  }

  clear() {
    this.brickStatus.clear();
    this.jardinainStatus.clear();
    this.burnTiles.clear();
    this.scene.bricks?.forEach((b) => { b.burning = false; b.frozen = false; });
  }
}
