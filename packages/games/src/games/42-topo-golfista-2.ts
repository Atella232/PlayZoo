import { BALL_R, BOUNDS, GolfBall, HOLE_R, genCourse, shotVelocity, type WallRect } from '../kits/golf';
import { bg, formatNumber, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const LIMIT = 47;
const SPAN_Y = BOUNDS.y1 - BOUNDS.y0;

const depth = (y: number) => (y - BOUNDS.y0) / SPAN_Y;
const scale = (y: number) => 0.5 + 0.5 * depth(y);
const proj = (x: number, y: number, h = 0) => {
  const s = scale(y);
  return { x: W / 2 + (x - 180) * s, y: 150 + depth(y) * 440 - h * s, s };
};
const YK = 440 / SPAN_Y;

/** Igual que Topo Golfista, pero con el campo visto en perspectiva 3D (la física es la misma). */
class Topo2 extends Game {
  ball: GolfBall;
  course;
  drag: { id: number; x: number; y: number } | null = null;
  cur: { x: number; y: number } | null = null;
  private endT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.course = genCourse(ctx.rng.fork('campo3d'), { walls: 3 });
    this.ball = new GolfBall(this.course);
  }

  private field(dx: number, dy: number) {
    const s = scale(this.ball.y);
    return { x: dx / s, y: dy / YK };
  }

  protected step(dt: number) {
    if (this.endT > 0) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.score);
      return;
    }
    if (this.t >= LIMIT) return this.finish(LIMIT + Math.hypot(this.ball.x - this.course.hole.x, this.ball.y - this.course.hole.y) / 100);
    for (const e of this.input.events) {
      if (e.type === 'down' && !this.drag) {
        this.drag = { id: e.id, x: e.x, y: e.y };
        this.cur = { x: e.x, y: e.y };
      } else if (e.type === 'move' && this.drag?.id === e.id) this.cur = { x: e.x, y: e.y };
      else if (e.type === 'up' && this.drag?.id === e.id) {
        const f = this.field(this.drag.x - e.x, this.drag.y - e.y);
        const v = shotVelocity(f.x, f.y);
        this.drag = null;
        this.cur = null;
        if (v.power > 0.06) {
          this.ball.hit(v.vx, v.vy);
          this.sfx.play('pop', 0.8 + v.power * 0.5);
        }
      }
    }
    if (this.ball.step(dt)) {
      this.score = Math.round(this.t * 100) / 100;
      this.sfx.play('win');
      this.endT = 0.8;
    }
  }

  private quad(g: G2, pts: { x: number; y: number }[], fill: string, stroke?: string) {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 2;
      g.stroke();
    }
  }

  private wall(g: G2, w: WallRect) {
    const H3 = 24;
    const a = proj(w.x, w.y + w.h, 0);
    const b = proj(w.x + w.w, w.y + w.h, 0);
    const at = proj(w.x, w.y + w.h, H3);
    const bt = proj(w.x + w.w, w.y + w.h, H3);
    this.quad(g, [a, b, bt, at], '#92400e', '#451a03');
    const c = proj(w.x, w.y, H3);
    const d = proj(w.x + w.w, w.y, H3);
    this.quad(g, [c, d, bt, at], '#b45309', '#451a03');
  }

  protected draw(g: G2) {
    bg(g, '#7dd3fc', '#e0f2fe');
    g.fillStyle = '#84cc16';
    g.beginPath();
    g.moveTo(0, 170);
    for (let x = 0; x <= W; x += 20) g.lineTo(x, 140 + Math.sin(x / 45) * 12);
    g.lineTo(W, 190);
    g.lineTo(0, 190);
    g.fill();
    const p0 = proj(BOUNDS.x0, BOUNDS.y0);
    const p1 = proj(BOUNDS.x1, BOUNDS.y0);
    const p2 = proj(BOUNDS.x1, BOUNDS.y1);
    const p3 = proj(BOUNDS.x0, BOUNDS.y1);
    this.quad(g, [p0, p1, p2, p3], '#4ade80', '#166534');
    for (let i = 0; i < 8; i += 2) {
      const y0 = BOUNDS.y0 + (i * SPAN_Y) / 8;
      const y1 = BOUNDS.y0 + ((i + 1) * SPAN_Y) / 8;
      this.quad(g, [proj(BOUNDS.x0, y0), proj(BOUNDS.x1, y0), proj(BOUNDS.x1, y1), proj(BOUNDS.x0, y1)], 'rgba(0,0,0,.06)');
    }
    const hp = proj(this.course.hole.x, this.course.hole.y);
    g.beginPath();
    g.ellipse(hp.x, hp.y, HOLE_R * hp.s, HOLE_R * hp.s * 0.45, 0, 0, Math.PI * 2);
    g.fillStyle = '#0f172a';
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(hp.x + 8 * hp.s, hp.y);
    g.lineTo(hp.x + 8 * hp.s, hp.y - 60 * hp.s);
    g.stroke();
    g.fillStyle = '#ef4444';
    g.fillRect(hp.x + 8 * hp.s, hp.y - 60 * hp.s, 22 * hp.s, 14 * hp.s);
    const walls = [...this.course.walls].sort((a, b) => a.y - b.y);
    for (const w of walls) {
      if (w.y + w.h < this.ball.y) this.wall(g, w);
    }
    const bp = proj(this.ball.x, this.ball.y, BALL_R);
    const sh = proj(this.ball.x, this.ball.y, 0);
    g.beginPath();
    g.ellipse(sh.x, sh.y, BALL_R * sh.s * 1.1, BALL_R * sh.s * 0.5, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(0,0,0,.3)';
    g.fill();
    g.beginPath();
    g.arc(bp.x, bp.y, BALL_R * bp.s, 0, Math.PI * 2);
    g.fillStyle = '#fff';
    g.fill();
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 2;
    g.stroke();
    for (const w of walls) {
      if (w.y + w.h >= this.ball.y) this.wall(g, w);
    }
    if (this.drag && this.cur) {
      const f = this.field(this.drag.x - this.cur.x, this.drag.y - this.cur.y);
      const v = shotVelocity(f.x, f.y);
      const len = v.power * 150;
      const ang = Math.atan2(v.vy, v.vx);
      const e = proj(this.ball.x + Math.cos(ang) * len * 1.4, this.ball.y + Math.sin(ang) * len * 1.4, BALL_R);
      g.strokeStyle = `hsl(${120 - v.power * 120},90%,45%)`;
      g.lineWidth = 5;
      g.setLineDash([8, 6]);
      g.beginPath();
      g.moveTo(bp.x, bp.y);
      g.lineTo(e.x, e.y);
      g.stroke();
      g.setLineDash([]);
    }
    text(g, formatNumber(this.endT > 0 ? this.score : this.t, 2) + ' s', W / 2, 44, { size: 34, color: '#0c4a6e', stroke: '#fff' });
    text(g, 'Arrastra hacia atrás y suelta', W / 2, H - 14, { size: 13, weight: 700, color: '#0c4a6e', alpha: this.t < 6 ? 1 : 0.3 });
  }
}

export const create = (ctx: GameCtx) => new Topo2(ctx);
