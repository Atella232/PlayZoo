import { BALL_R, BOUNDS, GolfBall, HOLE_R, genCourse, shotVelocity } from '../kits/golf';
import { bg, circle, emoji, fillRR, formatNumber, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const LIMIT = 47;

class Topo extends Game {
  ball: GolfBall;
  course;
  drag: { id: number; x: number; y: number } | null = null;
  cur: { x: number; y: number } | null = null;
  strokes = 0;
  private endT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.course = genCourse(ctx.rng.fork('campo'), { walls: 2 });
    this.ball = new GolfBall(this.course);
  }

  protected step(dt: number) {
    if (this.endT > 0) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.score);
      return;
    }
    if (this.t >= LIMIT) {
      const d = Math.hypot(this.ball.x - this.course.hole.x, this.ball.y - this.course.hole.y);
      return this.finish(LIMIT + d / 100);
    }
    for (const e of this.input.events) {
      if (e.type === 'down' && !this.drag) {
        this.drag = { id: e.id, x: e.x, y: e.y };
        this.cur = { x: e.x, y: e.y };
      } else if (e.type === 'move' && this.drag?.id === e.id) this.cur = { x: e.x, y: e.y };
      else if (e.type === 'up' && this.drag?.id === e.id) {
        const v = shotVelocity(this.drag.x - e.x, this.drag.y - e.y);
        this.drag = null;
        this.cur = null;
        if (v.power > 0.06) {
          this.ball.hit(v.vx, v.vy);
          this.strokes++;
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

  protected draw(g: G2) {
    bg(g, '#14532d', '#166534');
    fillRR(g, { x: BOUNDS.x0, y: BOUNDS.y0, w: BOUNDS.x1 - BOUNDS.x0, h: BOUNDS.y1 - BOUNDS.y0 }, 14, '#4ade80');
    for (let i = 0; i < 8; i++) {
      g.fillStyle = 'rgba(0,0,0,.05)';
      g.fillRect(BOUNDS.x0, BOUNDS.y0 + i * 64, BOUNDS.x1 - BOUNDS.x0, 32);
    }
    for (const w of this.course.walls) fillRR(g, w, 6, '#78350f');
    circle(g, this.course.hole.x, this.course.hole.y, HOLE_R, '#0f172a');
    emoji(g, '🦡', this.course.hole.x, this.course.hole.y - 26, 26);
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(this.course.hole.x + 14, this.course.hole.y);
    g.lineTo(this.course.hole.x + 14, this.course.hole.y - 34);
    g.stroke();
    g.fillStyle = '#ef4444';
    g.fillRect(this.course.hole.x + 14, this.course.hole.y - 34, 14, 9);
    if (this.drag && this.cur) {
      const v = shotVelocity(this.drag.x - this.cur.x, this.drag.y - this.cur.y);
      const len = v.power * 150;
      const ang = Math.atan2(v.vy, v.vx);
      g.strokeStyle = `hsl(${120 - v.power * 120},90%,55%)`;
      g.lineWidth = 5;
      g.setLineDash([8, 6]);
      g.beginPath();
      g.moveTo(this.ball.x, this.ball.y);
      g.lineTo(this.ball.x + Math.cos(ang) * len * 1.4, this.ball.y + Math.sin(ang) * len * 1.4);
      g.stroke();
      g.setLineDash([]);
    }
    circle(g, this.ball.x + 2, this.ball.y + 3, BALL_R, 'rgba(0,0,0,.25)');
    circle(g, this.ball.x, this.ball.y, BALL_R, '#fff', '#94a3b8', 2);
    text(g, formatNumber(this.endT > 0 ? this.score : this.t, 2) + ' s', W / 2, 44, { size: 34, stroke: 'rgba(0,0,0,.4)' });
    text(g, `Golpes ${this.strokes}`, 14, 76, { size: 14, align: 'left', weight: 700 });
    text(g, 'Arrastra hacia atrás y suelta', W / 2, H - 14, { size: 13, weight: 700, alpha: this.t < 6 ? 1 : 0.25 });
  }
}

export const create = (ctx: GameCtx) => new Topo(ctx);
