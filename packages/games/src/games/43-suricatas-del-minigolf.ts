import { BALL_R, BOUNDS, GolfBall, HOLE_R, genCourse, shotVelocity } from '../kits/golf';
import { bg, circle, emoji, fillRR, formatNumber, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

class Suricatas extends Game {
  private cr;
  ball!: GolfBall;
  course!: ReturnType<typeof genCourse>;
  holes = 0;
  d0 = 1;
  drag: { id: number; x: number; y: number } | null = null;
  cur: { x: number; y: number } | null = null;
  private pause = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.cr = ctx.rng.fork('hoyos');
    this.next({ x: 180, y: 540 });
  }

  private next(from: { x: number; y: number }) {
    this.course = genCourse(this.cr, { walls: this.holes < 3 ? 0 : this.holes < 8 ? 1 : 2, from, maxDist: 360 });
    this.ball = new GolfBall(this.course);
    this.d0 = Math.hypot(this.course.hole.x - from.x, this.course.hole.y - from.y) || 1;
  }

  private progress() {
    const d = Math.hypot(this.ball.x - this.course.hole.x, this.ball.y - this.course.hole.y);
    return Math.max(0, Math.min(0.99, 1 - d / this.d0));
  }

  protected step(dt: number) {
    if (this.t >= 30) return this.finish(Math.round((this.holes + this.progress()) * 10) / 10);
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.pause <= 0) this.next({ ...this.course.hole });
      return;
    }
    for (const e of this.input.events) {
      if (e.type === 'down' && !this.drag) {
        this.drag = { id: e.id, x: e.x, y: e.y };
        this.cur = { x: e.x, y: e.y };
      } else if (e.type === 'move' && this.drag?.id === e.id) this.cur = { x: e.x, y: e.y };
      else if (e.type === 'up' && this.drag?.id === e.id) {
        const v = shotVelocity(this.drag.x - e.x, this.drag.y - e.y, 700);
        this.drag = null;
        this.cur = null;
        if (v.power > 0.06) {
          this.ball.hit(v.vx, v.vy);
          this.sfx.play('pop', 0.8 + v.power * 0.5);
        }
      }
    }
    if (this.ball.step(dt)) {
      this.holes++;
      this.sfx.play('win');
      this.popups.add('¡Hoyo!', this.course.hole.x, this.course.hole.y - 40, '#fde047', 24);
      this.pause = 0.5;
    }
    this.score = Math.round((this.holes + this.progress()) * 10) / 10;
  }

  protected draw(g: G2) {
    bg(g, '#7c2d12', '#78350f');
    fillRR(g, { x: BOUNDS.x0, y: BOUNDS.y0, w: BOUNDS.x1 - BOUNDS.x0, h: BOUNDS.y1 - BOUNDS.y0 }, 14, '#a3e635');
    for (const w of this.course.walls) fillRR(g, w, 6, '#78350f');
    circle(g, this.course.hole.x, this.course.hole.y, HOLE_R, '#0f172a');
    emoji(g, '🐾', this.course.hole.x, this.course.hole.y - 24, 22);
    if (this.drag && this.cur) {
      const v = shotVelocity(this.drag.x - this.cur.x, this.drag.y - this.cur.y, 700);
      const ang = Math.atan2(v.vy, v.vx);
      g.strokeStyle = `hsl(${120 - v.power * 120},90%,45%)`;
      g.lineWidth = 5;
      g.setLineDash([8, 6]);
      g.beginPath();
      g.moveTo(this.ball.x, this.ball.y);
      g.lineTo(this.ball.x + Math.cos(ang) * v.power * 210, this.ball.y + Math.sin(ang) * v.power * 210);
      g.stroke();
      g.setLineDash([]);
    }
    circle(g, this.ball.x, this.ball.y, BALL_R, '#fff', '#94a3b8', 2);
    text(g, formatNumber(this.score, 1), W / 2, 44, { size: 38, stroke: 'rgba(0,0,0,.4)' });
    text(g, `${Math.max(0, Math.ceil(30 - this.t))} s`, W - 14, 26, { size: 22, align: 'right', stroke: 'rgba(0,0,0,.4)' });
    text(g, 'Hoyos completados', W / 2, 74, { size: 12, weight: 700, color: '#fde68a' });
    text(g, 'Arrastra hacia atrás y suelta', W / 2, H - 14, { size: 13, weight: 700, alpha: this.t < 6 ? 1 : 0.25 });
  }
}

export const create = (ctx: GameCtx) => new Suricatas(ctx);
