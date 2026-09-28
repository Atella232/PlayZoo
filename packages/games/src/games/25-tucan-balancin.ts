import { bg, circle, emoji, formatNumber, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const HALF = 150;
const PY = 470;

class Tucan extends Game {
  alpha = 0;
  p = 0;
  v = 0;
  time = 0;
  perfect = false;
  private kickIn = 1.2;
  private kr;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.kr = ctx.rng.fork('empujones');
    this.p = ctx.rng.range(-30, 30);
  }

  protected step(dt: number) {
    if (this.time >= 120) return this.finish(this.time);
    let target = 0;
    const pts = [...this.input.pointers.values()];
    if (pts.length) target = pts[pts.length - 1].x < W / 2 ? -0.42 : 0.42;
    else if (this.input.keys.has('ArrowLeft')) target = -0.42;
    else if (this.input.keys.has('ArrowRight')) target = 0.42;
    this.alpha += (target - this.alpha) * Math.min(1, 6 * dt);
    this.kickIn -= dt;
    if (this.kickIn <= 0) {
      this.kickIn = this.kr.range(0.7, 1.5);
      this.v += this.kr.sign() * (30 + this.t * 1.2 + this.kr.range(0, 30));
    }
    this.v += (760 * Math.sin(this.alpha) - 0.7 * this.v) * dt;
    this.p += this.v * dt;
    this.perfect = Math.abs(this.p) < 24;
    this.time += dt * (this.perfect ? 2 : 1);
    this.score = Math.round(this.time * 100) / 100;
    if (Math.abs(this.p) > HALF) {
      this.sfx.play('lose');
      this.finish(this.time);
    }
  }

  protected draw(g: G2) {
    bg(g, '#0f766e', '#134e4a');
    emoji(g, '🐦', W / 2, 130, 90);
    // apoyo
    g.fillStyle = '#78350f';
    g.beginPath();
    g.moveTo(W / 2 - 34, PY + 90);
    g.lineTo(W / 2 + 34, PY + 90);
    g.lineTo(W / 2, PY + 12);
    g.closePath();
    g.fill();
    g.save();
    g.translate(W / 2, PY);
    g.rotate(this.alpha);
    g.fillStyle = '#d97706';
    g.fillRect(-HALF - 10, -6, HALF * 2 + 20, 14);
    g.fillStyle = 'rgba(34,197,94,.8)';
    g.fillRect(-24, -6, 48, 14);
    circle(g, this.p, -6 - 16, 16, '#ef4444', '#fff', 3);
    g.restore();
    text(g, formatNumber(this.score, 2) + ' s', W / 2, 250, { size: 44, stroke: 'rgba(0,0,0,.4)' });
    if (this.perfect) text(g, '¡Perfecto (2x)!', W / 2, 296, { size: 22, color: '#86efac', stroke: 'rgba(0,0,0,.4)' });
    text(g, 'Toca izquierda o derecha para inclinar', W / 2, 620, { size: 14, weight: 700, alpha: this.t < 5 ? 1 : 0.25 });
  }
}

export const create = (ctx: GameCtx) => new Tucan(ctx);
