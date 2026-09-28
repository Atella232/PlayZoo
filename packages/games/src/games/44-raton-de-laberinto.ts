import { Joystick, bg, circle, circleRect, emoji, fillRR, formatNumber, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const COLS = 6;
const ROWS = 8;
const CS = 54;
const OX = (W - COLS * CS) / 2;
const OY = 110;
const WT = 6;
const R = 9;

interface WallR {
  x: number;
  y: number;
  w: number;
  h: number;
}

class Raton extends Game {
  private mr;
  walls: WallR[] = [];
  holes: [number, number][] = [];
  goals: [number, number][] = [];
  got: boolean[] = [false, false, false];
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  start: [number, number] = [COLS >> 1, ROWS - 1];
  respawn: [number, number] = [0, 0];
  joy = new Joystick(46);
  clock = 0;
  running = false;
  penalty = 0;
  freeze = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.mr = ctx.rng.fork('laberinto');
    this.build();
    this.respawn = this.start;
    this.place(this.start);
  }

  private place(c: [number, number]) {
    this.x = OX + c[0] * CS + CS / 2;
    this.y = OY + c[1] * CS + CS / 2;
    this.vx = this.vy = 0;
  }

  private build() {
    // paredes: h[r][c] borde superior de la celda (r,c) ; v[r][c] borde izquierdo
    const h = Array.from({ length: ROWS + 1 }, () => Array(COLS).fill(true));
    const v = Array.from({ length: ROWS }, () => Array(COLS + 1).fill(true));
    const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const stack: [number, number][] = [this.start];
    seen[this.start[1]][this.start[0]] = true;
    while (stack.length) {
      const [c, r] = stack[stack.length - 1];
      const opts: [number, number, number][] = [];
      if (c > 0 && !seen[r][c - 1]) opts.push([c - 1, r, 0]);
      if (c < COLS - 1 && !seen[r][c + 1]) opts.push([c + 1, r, 1]);
      if (r > 0 && !seen[r - 1][c]) opts.push([c, r - 1, 2]);
      if (r < ROWS - 1 && !seen[r + 1][c]) opts.push([c, r + 1, 3]);
      if (!opts.length) {
        stack.pop();
        continue;
      }
      const [nc, nr, d] = this.mr.pick(opts);
      if (d === 0) v[r][c] = false;
      else if (d === 1) v[r][c + 1] = false;
      else if (d === 2) h[r][c] = false;
      else h[r + 1][c] = false;
      seen[nr][nc] = true;
      stack.push([nc, nr]);
    }
    // abrir algunos muros para crear bucles
    for (let i = 0; i < 9; i++) {
      const r = this.mr.int(1, ROWS - 2);
      const c = this.mr.int(1, COLS - 2);
      if (this.mr.chance(0.5)) v[r][c] = false;
      else h[r][c] = false;
    }
    const open = (c: number, r: number) => (h[r][c] ? 0 : 1) + (h[r + 1][c] ? 0 : 1) + (v[r][c] ? 0 : 1) + (v[r][c + 1] ? 0 : 1);
    // distancias desde la salida (BFS)
    const dist = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    dist[this.start[1]][this.start[0]] = 0;
    const q: [number, number][] = [this.start];
    while (q.length) {
      const [c, r] = q.shift()!;
      const nb: [number, number, boolean][] = [
        [c - 1, r, !v[r][c]],
        [c + 1, r, !v[r][c + 1]],
        [c, r - 1, !h[r][c]],
        [c, r + 1, !h[r + 1][c]],
      ];
      for (const [nc, nr, ok] of nb) if (ok && nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && dist[nr][nc] < 0) {
        dist[nr][nc] = dist[r][c] + 1;
        q.push([nc, nr]);
      }
    }
    const cells: [number, number][] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push([c, r]);
    cells.sort((a, b) => dist[b[1]][b[0]] - dist[a[1]][a[0]]);
    const far = cells.slice(0, 14);
    const picked: [number, number][] = [];
    for (const cell of this.mr.shuffle(far)) {
      if (picked.every((p) => Math.abs(p[0] - cell[0]) + Math.abs(p[1] - cell[1]) >= 3)) picked.push(cell);
      if (picked.length === 3) break;
    }
    for (const cell of cells) if (picked.length < 3 && !picked.includes(cell)) picked.push(cell);
    this.goals = picked;
    const isGoal = (c: number, r: number) => this.goals.some((g) => g[0] === c && g[1] === r);
    const dead = cells.filter(([c, r]) => open(c, r) === 1 && !isGoal(c, r) && !(c === this.start[0] && r === this.start[1]));
    this.holes = this.mr.shuffle(dead).slice(0, 5);
    // rectángulos de muro
    for (let r = 0; r <= ROWS; r++) for (let c = 0; c < COLS; c++) if (h[r][c]) this.walls.push({ x: OX + c * CS - WT / 2, y: OY + r * CS - WT / 2, w: CS + WT, h: WT });
    for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS; c++) if (v[r][c]) this.walls.push({ x: OX + c * CS - WT / 2, y: OY + r * CS - WT / 2, w: WT, h: CS + WT });
  }

  protected step(dt: number) {
    if (this.t >= 150) return this.finish(Math.max(150, this.clock + this.penalty));
    if (this.freeze > 0) {
      this.freeze -= dt;
      return;
    }
    this.joy.update(this.input);
    if (this.joy.active && !this.running) this.running = true;
    if (this.running) this.clock += dt;
    this.vx += this.joy.vec.x * 1000 * dt;
    this.vy += this.joy.vec.y * 1000 * dt;
    const damp = Math.exp(-2.3 * dt);
    this.vx *= damp;
    this.vy *= damp;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 330) {
      this.vx *= 330 / sp;
      this.vy *= 330 / sp;
    }
    for (let i = 0; i < 3; i++) {
      this.x += (this.vx * dt) / 3;
      this.y += (this.vy * dt) / 3;
      for (const w of this.walls) {
        if (!circleRect(this.x, this.y, R, w.x, w.y, w.w, w.h)) continue;
        const l = this.x + R - w.x;
        const r = w.x + w.w - (this.x - R);
        const t = this.y + R - w.y;
        const b = w.y + w.h - (this.y - R);
        const m = Math.min(l, r, t, b);
        if (m === l) {
          this.x = w.x - R;
          this.vx = -Math.abs(this.vx) * 0.25;
        } else if (m === r) {
          this.x = w.x + w.w + R;
          this.vx = Math.abs(this.vx) * 0.25;
        } else if (m === t) {
          this.y = w.y - R;
          this.vy = -Math.abs(this.vy) * 0.25;
        } else {
          this.y = w.y + w.h + R;
          this.vy = Math.abs(this.vy) * 0.25;
        }
      }
    }
    for (const [c, r] of this.holes) {
      if (Math.hypot(this.x - (OX + c * CS + CS / 2), this.y - (OY + r * CS + CS / 2)) < 12) {
        this.penalty += 2;
        this.freeze = 0.45;
        this.sfx.play('bad');
        this.popups.add('+2 s', this.x, this.y - 20, '#fca5a5');
        this.place(this.respawn);
        return;
      }
    }
    this.goals.forEach(([c, r], i) => {
      if (!this.got[i] && Math.hypot(this.x - (OX + c * CS + CS / 2), this.y - (OY + r * CS + CS / 2)) < 16) {
        this.got[i] = true;
        this.respawn = [c, r];
        this.sfx.play('ok');
      }
    });
    if (this.got.every(Boolean)) {
      this.sfx.play('win');
      this.finish(Math.round((this.clock + this.penalty) * 100) / 100);
    }
  }

  protected draw(g: G2) {
    bg(g, '#292524', '#1c1917');
    fillRR(g, { x: OX, y: OY, w: COLS * CS, h: ROWS * CS }, 4, '#d6c9a8');
    for (const [c, r] of this.holes) {
      circle(g, OX + c * CS + CS / 2, OY + r * CS + CS / 2, 13, '#1c1917', '#57534e', 3);
    }
    this.goals.forEach(([c, r], i) => {
      circle(g, OX + c * CS + CS / 2, OY + r * CS + CS / 2, 16, this.got[i] ? '#16a34a' : '#4ade80', '#14532d', 3);
      text(g, this.got[i] ? '✓' : '★', OX + c * CS + CS / 2, OY + r * CS + CS / 2 + 1, { size: 16, color: '#14532d' });
    });
    for (const w of this.walls) fillRR(g, w, 2, '#78350f');
    circle(g, this.x, this.y, R, '#a3a3a3', '#525252', 2);
    emoji(g, '🐭', this.x, this.y - 1, 16);
    this.joy.draw(g);
    text(g, formatNumber(this.clock + this.penalty, 2) + ' s', W / 2, 44, { size: 34, stroke: 'rgba(0,0,0,.5)' });
    text(g, `Metas ${this.got.filter(Boolean).length}/3`, W / 2, 80, { size: 14, weight: 700, color: '#86efac' });
    if (!this.running) text(g, 'Arrastra para inclinar el laberinto', W / 2, H - 20, { size: 14, weight: 700 });
  }
}

export const create = (ctx: GameCtx) => new Raton(ctx);
