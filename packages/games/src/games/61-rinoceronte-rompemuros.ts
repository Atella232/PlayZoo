import { bg, circle, emoji, fillRR, text, W, clamp, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const COLS = 7;
const CS = 46;
const OX = (W - COLS * CS) / 2;
const OY = 70;
const ROWS = 10;
const SHOOT_Y = OY + ROWS * CS + 12;
const BR = 6;
const SPEED = 780;
const HUES = [200, 160, 120, 60, 30, 0, 320, 280];

interface Cell {
  hp: number;
  item?: 'ball';
}
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}

class Rinoceronte extends Game {
  private gr;
  grid: (Cell | null)[][] = [];
  turn = 0;
  balls = 1;
  shooterX = W / 2;
  flying: Ball[] = [];
  toFire = 0;
  fireAcc = 0;
  aim: { dx: number; dy: number } | null = null;
  phase: 'aim' | 'shoot' | 'wait' = 'aim';
  firstLand: number | null = null;
  landed = 0;
  fireDir = { x: 0, y: -1 };
  broken = 0;
  private dragStart: { id: number; x: number; y: number } | null = null;
  private fast = 1;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.gr = ctx.rng.fork('ladrillos');
    for (let r = 0; r < ROWS; r++) this.grid.push(Array(COLS).fill(null));
    this.newRow();
    this.shiftDown(true);
  }

  private newRow() {
    const row: (Cell | null)[] = Array(COLS).fill(null);
    const n = this.gr.int(2, 5);
    const idx = this.gr.shuffle([...Array(COLS).keys()]);
    for (let i = 0; i < n; i++) row[idx[i]] = { hp: Math.max(1, this.turn + 1 + (this.gr.chance(0.25) ? this.turn + 1 : 0)) };
    row[idx[n]] = { hp: 0, item: 'ball' };
    this.grid[0] = row;
  }

  private shiftDown(initial = false) {
    if (!initial) {
      if (this.grid[ROWS - 1].some((c) => c && !c.item)) return false;
      this.grid.pop();
      this.grid.unshift(Array(COLS).fill(null));
      this.turn++;
      this.newRow();
    }
    return true;
  }

  private collide(b: Ball) {
    // cuadrícula: comprobar celdas cercanas
    const c0 = Math.floor((b.x - OX - BR) / CS);
    const c1 = Math.floor((b.x - OX + BR) / CS);
    const r0 = Math.floor((b.y - OY - BR) / CS);
    const r1 = Math.floor((b.y - OY + BR) / CS);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const cell = this.grid[r][c];
        if (!cell) continue;
        const x = OX + c * CS;
        const y = OY + r * CS;
        if (cell.item) {
          if (Math.hypot(b.x - (x + CS / 2), b.y - (y + CS / 2)) < 20) {
            this.grid[r][c] = null;
            this.balls++;
            this.sfx.play('coin');
          }
          continue;
        }
        const nx = clamp(b.x, x, x + CS);
        const ny = clamp(b.y, y, y + CS);
        const dx = b.x - nx;
        const dy = b.y - ny;
        if (dx * dx + dy * dy > BR * BR) continue;
        // resolver por el eje de menor penetración
        const left = b.x + BR - x;
        const right = x + CS - (b.x - BR);
        const top = b.y + BR - y;
        const bottom = y + CS - (b.y - BR);
        const m = Math.min(left, right, top, bottom);
        if (m === left) {
          b.vx = -Math.abs(b.vx);
          b.x = x - BR;
        } else if (m === right) {
          b.vx = Math.abs(b.vx);
          b.x = x + CS + BR;
        } else if (m === top) {
          b.vy = -Math.abs(b.vy);
          b.y = y - BR;
        } else {
          b.vy = Math.abs(b.vy);
          b.y = y + CS + BR;
        }
        cell.hp--;
        this.sfx.play('tick', 1 + (cell.hp % 5) * 0.05);
        if (cell.hp <= 0) {
          this.grid[r][c] = null;
          this.broken++;
          this.score = this.broken;
          this.sparks.burst(x + CS / 2, y + CS / 2, `hsl(${HUES[r % HUES.length]},80%,60%)`, 6, 120);
        }
        return;
      }
    }
  }

  protected step(dt: number) {
    if (this.t >= 120) return this.finish(this.broken);
    if (this.phase === 'aim') {
      for (const e of this.input.events) {
        if (e.type === 'down' && e.y < SHOOT_Y + 30) this.dragStart = { id: e.id, x: e.x, y: e.y };
        else if (e.type === 'move' && this.dragStart?.id === e.id) {
          const dx = e.x - this.dragStart.x;
          const dy = e.y - this.dragStart.y;
          this.aim = Math.hypot(dx, dy) > 12 && dy < -4 ? { dx, dy } : null;
        } else if (e.type === 'up' && this.dragStart?.id === e.id) {
          const dx = e.x - this.dragStart.x;
          const dy = e.y - this.dragStart.y;
          this.dragStart = null;
          if (Math.hypot(dx, dy) > 12 && dy < -4) {
            const a = Math.max(0.12, Math.min(Math.PI - 0.12, Math.atan2(-dy, dx)));
            this.fireDir = { x: Math.cos(a), y: -Math.sin(a) };
            this.phase = 'shoot';
            this.toFire = this.balls;
            this.fireAcc = 0;
            this.landed = 0;
            this.firstLand = null;
            this.fast = 1;
          }
          this.aim = null;
        }
      }
      return;
    }
    if (this.input.tapped()) this.fast = 2;
    const steps = 4 * this.fast;
    if (this.phase === 'shoot') {
      this.fireAcc += dt * this.fast;
      while (this.toFire > 0 && this.fireAcc >= 0.05) {
        this.fireAcc -= 0.05;
        this.toFire--;
        this.flying.push({ x: this.shooterX, y: SHOOT_Y, vx: this.fireDir.x * SPEED, vy: this.fireDir.y * SPEED, alive: true });
      }
    }
    for (let s = 0; s < steps; s++) {
      for (const b of this.flying) {
        if (!b.alive) continue;
        b.x += (b.vx * dt) / 4;
        b.y += (b.vy * dt) / 4;
        if (b.x < BR) {
          b.x = BR;
          b.vx = Math.abs(b.vx);
        }
        if (b.x > W - BR) {
          b.x = W - BR;
          b.vx = -Math.abs(b.vx);
        }
        if (b.y < OY - 30 + BR) {
          b.y = OY - 30 + BR;
          b.vy = Math.abs(b.vy);
        }
        this.collide(b);
        if (b.y >= SHOOT_Y && b.vy > 0) {
          b.alive = false;
          if (this.firstLand === null) this.firstLand = clamp(b.x, 20, W - 20);
          this.landed++;
        }
      }
    }
    this.flying = this.flying.filter((b) => b.alive);
    if (this.toFire === 0 && this.flying.length === 0) {
      if (this.firstLand !== null) this.shooterX = this.firstLand;
      this.phase = 'aim';
      if (!this.shiftDown()) {
        this.sfx.play('lose');
        return this.finish(this.broken);
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#1e1b4b', '#0f172a');
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.grid[r][c];
        if (!cell) continue;
        const x = OX + c * CS;
        const y = OY + r * CS;
        if (cell.item) {
          circle(g, x + CS / 2, y + CS / 2, 11, '#fbbf24', '#fff', 3);
          text(g, '+', x + CS / 2, y + CS / 2, { size: 16, color: '#78350f' });
          continue;
        }
        fillRR(g, { x: x + 2, y: y + 2, w: CS - 4, h: CS - 4 }, 8, `hsl(${HUES[(this.turn + r + c) % HUES.length]},70%,${45 + Math.min(20, cell.hp)}%)`);
        text(g, String(cell.hp), x + CS / 2, y + CS / 2, { size: 17 });
      }
    }
    g.fillStyle = 'rgba(239,68,68,.35)';
    g.fillRect(0, OY + (ROWS - 1) * CS, W, 2);
    for (const b of this.flying) circle(g, b.x, b.y, BR, '#fde047');
    g.fillStyle = '#334155';
    g.fillRect(0, SHOOT_Y + 6, W, 60);
    emoji(g, '🦏', this.shooterX, SHOOT_Y + 28, 40);
    if (this.aim) {
      const a = Math.max(0.12, Math.min(Math.PI - 0.12, Math.atan2(-this.aim.dy, this.aim.dx)));
      g.setLineDash([6, 8]);
      g.strokeStyle = 'rgba(253,224,71,.8)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(this.shooterX, SHOOT_Y);
      g.lineTo(this.shooterX + Math.cos(a) * 320, SHOOT_Y - Math.sin(a) * 320);
      g.stroke();
      g.setLineDash([]);
    }
    text(g, String(this.broken), W / 2, 30, { size: 34, stroke: 'rgba(0,0,0,.5)' });
    text(g, `x${this.balls}`, 34, SHOOT_Y + 52, { size: 16, color: '#fde047' });
    if (this.phase === 'aim' && this.t < 8) text(g, 'Arrastra hacia arriba para apuntar y suelta', W / 2, SHOOT_Y + 54, { size: 13, weight: 700 });
    if (this.phase === 'shoot') text(g, 'Toca para acelerar', W - 70, SHOOT_Y + 52, { size: 12, weight: 700, alpha: 0.7 });
  }
}

export const create = (ctx: GameCtx) => new Rinoceronte(ctx);
