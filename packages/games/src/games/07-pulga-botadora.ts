import { bg, emoji, pointSegment, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const FLOOR = 590;
const R = 12;
const MAX_LEN = 300;

interface Line {
  pts: { x: number; y: number }[];
  len: number;
  age: number;
  done: boolean;
}

class Pulga extends Game {
  x: number;
  y = 160;
  vx: number;
  vy = 0;
  lines: Line[] = [];
  private cur: { id: number; line: Line } | null = null;
  combo = 0;
  points = 0;
  private lastBounce = -10;
  private cool = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.x = ctx.rng.range(100, 260);
    this.vx = ctx.rng.range(-50, 50);
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.points);
    for (const e of this.input.events) {
      if (e.type === 'down') {
        const line: Line = { pts: [{ x: e.x, y: e.y }], len: 0, age: 0, done: false };
        this.lines.push(line);
        if (this.lines.length > 3) this.lines.shift();
        this.cur = { id: e.id, line };
      } else if (e.type === 'move' && this.cur?.id === e.id) {
        const l = this.cur.line;
        const last = l.pts[l.pts.length - 1];
        const d = Math.hypot(e.x - last.x, e.y - last.y);
        if (d > 5 && l.len < MAX_LEN) {
          l.pts.push({ x: e.x, y: e.y });
          l.len += d;
        }
      } else if (e.type === 'up' && this.cur?.id === e.id) {
        this.cur.line.done = true;
        this.cur = null;
      }
    }
    for (const l of this.lines) l.age += dt;
    this.lines = this.lines.filter((l) => l.age < 3.2 && !(l.pts.length < 2 && l.done));
    this.cool -= dt;
    const g = 820 + this.t * 11;
    this.vy += g * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < R) {
      this.x = R;
      this.vx = Math.abs(this.vx);
    }
    if (this.x > W - R) {
      this.x = W - R;
      this.vx = -Math.abs(this.vx);
    }
    if (this.vy > 0 || this.cool <= 0) {
      for (const l of this.lines) {
        for (let i = 0; i < l.pts.length - 1; i++) {
          const a = l.pts[i];
          const b = l.pts[i + 1];
          const s = pointSegment(this.x, this.y, a.x, a.y, b.x, b.y);
          if (s.d < R + 3 && this.cool <= 0) {
            let nx = this.x - s.qx;
            let ny = this.y - s.qy;
            let nl = Math.hypot(nx, ny);
            if (nl < 1e-3) {
              nx = -(b.y - a.y);
              ny = b.x - a.x;
              nl = Math.hypot(nx, ny) || 1;
            }
            nx /= nl;
            ny /= nl;
            const dot = this.vx * nx + this.vy * ny;
            if (dot < 0) {
              this.vx -= 2 * dot * nx;
              this.vy -= 2 * dot * ny;
              if (this.vy > -400) this.vy = -400 - Math.max(0, ny) * 0;
              this.vx = Math.max(-260, Math.min(260, this.vx * 1.02));
              this.x = s.qx + nx * (R + 4);
              this.y = s.qy + ny * (R + 4);
              this.cool = 0.1;
              this.combo = this.t - this.lastBounce < 1.7 ? this.combo + 1 : 1;
              this.lastBounce = this.t;
              const pts = Math.min(this.combo, 4);
              this.points += pts;
              this.score = this.points;
              l.age = 99;
              this.sfx.play('pop', 1 + this.combo * 0.06);
              this.popups.add(`+${pts}`, this.x, this.y - 20, '#fde047', 18 + pts);
              break;
            }
          }
        }
      }
    }
    if (this.y + R > FLOOR) {
      this.sfx.play('hit');
      this.shake();
      return this.finish(this.points);
    }
  }

  protected draw(g: G2) {
    bg(g, '#1e293b', '#0f172a');
    for (const l of this.lines) {
      if (l.pts.length < 2) continue;
      g.beginPath();
      l.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.strokeStyle = `rgba(253,224,71,${Math.max(0.3, 1 - l.age / 3.2)})`;
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.stroke();
    }
    g.fillStyle = '#7f1d1d';
    g.fillRect(0, FLOOR, W, 60);
    g.fillStyle = '#ef4444';
    for (let x = 0; x < W; x += 24) {
      g.beginPath();
      g.moveTo(x, FLOOR + 6);
      g.lineTo(x + 12, FLOOR - 14);
      g.lineTo(x + 24, FLOOR + 6);
      g.closePath();
      g.fill();
    }
    emoji(g, '🐞', this.x, this.y, 30, this.vx * 0.003);
    text(g, String(this.points), W / 2, 50, { size: 50, stroke: 'rgba(0,0,0,.5)' });
    if (this.combo > 1 && this.t - this.lastBounce < 1.7) text(g, `Combo x${Math.min(this.combo, 7)}`, W / 2, 92, { size: 18, color: '#fde047' });
    if (this.t < 4) text(g, 'Dibuja una línea bajo la pulga', W / 2, 400, { size: 18, stroke: 'rgba(0,0,0,.5)' });
  }
}

export const create = (ctx: GameCtx) => new Pulga(ctx);
