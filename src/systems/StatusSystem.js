// Burn/freeze/burn-DOT status on bricks and Jardinains.

export class StatusSystem {
  constructor(scene) {
    this.scene = scene;
    this.brickStatus = new Map();
    this.jardinainStatus = new Map();
    this.burnTiles = new Map();
  }

  /** True when two bricks share an edge (4-neighbor), not merely the same column/row. */
  bricksShareEdge(a, b, slack = 4) {
    const gap = this.scene.brickGap ?? 0;
    const sepX = Math.abs(a.cx - b.cx);
    const sepY = Math.abs(a.cy - b.cy);
    const maxTouchX = (a.w + b.w) / 2 + gap + slack;
    const maxTouchY = (a.h + b.h) / 2 + gap + slack;
    const sideBySide = sepY <= maxTouchY
      && sepX >= Math.min(a.w, b.w) * 0.2
      && sepX <= maxTouchX;
    const stacked = sepX <= maxTouchX
      && sepY >= Math.min(a.h, b.h) * 0.15
      && sepY <= maxTouchY;
    return sideBySide || stacked;
  }

  adjacentBricks(brick) {
    const out = [];
    for (const b of this.scene.bricks) {
      if (!b.alive || b === brick) continue;
      if (brick.zoneRow != null && brick.col != null && b.zoneRow != null && b.col != null) {
        const dr = Math.abs(b.zoneRow - brick.zoneRow);
        const dc = Math.abs(b.col - brick.col);
        if (dr + dc !== 1) continue;
      }
      if (this.bricksShareEdge(brick, b)) out.push(b);
    }
    return out;
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
