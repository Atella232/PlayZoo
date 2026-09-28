import { bg, circle, emoji, text, W, wrapAngle, TAU, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const CX = W / 2;
const CY = 250;
const R = 78;
const HIT = 0.2;

class Castor extends Game {
  private lr;
  rot = 0;
  omega = 2;
  teeth: number[] = []; // ángulos relativos al tronco
  stuckCount = 0;
  logNo = 0;
  flight: { y: number } | null = null;
  private cooldown = 0;
  private changeIn = 1.5;
  private breakT = 0;
  private baseSpeed = 2.2;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.lr = ctx.rng.fork('tronco');
    this.newLog();
  }

  private newLog() {
    this.logNo++;
    this.teeth = [];
    const pre = Math.min(4, 2 + Math.floor(this.logNo / 3));
    while (this.teeth.length < pre) {
      const a = this.lr.range(0, TAU);
      if (this.teeth.every((t) => Math.abs(wrapAngle(t - a)) > 0.6)) this.teeth.push(a);
    }
    this.stuckCount = 0;
    this.baseSpeed = Math.min(4.6, 2.0 + this.logNo * 0.25);
    this.omega = this.baseSpeed * this.lr.sign();
    this.changeIn = this.lr.range(1, 2.2);
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    if (this.breakT > 0) {
      this.breakT -= dt;
      if (this.breakT <= 0) this.newLog();
      return;
    }
    this.changeIn -= dt;
    if (this.changeIn <= 0) {
      this.changeIn = this.lr.range(0.9, 2.4);
      const r = this.lr.next();
      if (r < 0.4) this.omega = -this.omega;
      else this.omega = Math.sign(this.omega) * this.baseSpeed * this.lr.range(0.6, 1.4);
    }
    this.rot += this.omega * dt;
    this.cooldown -= dt;
    if (this.flight) {
      this.flight.y -= 1500 * dt;
      if (this.flight.y <= CY + R - 4) {
        this.flight = null;
        // ángulo (en el tronco) del punto de impacto: abajo = π/2 en pantalla
        const local = wrapAngle(Math.PI / 2 - this.rot);
        if (this.teeth.some((t) => Math.abs(wrapAngle(t - local)) < HIT)) {
          this.sfx.play('hit');
          this.shake();
          return this.finish(this.score);
        }
        this.teeth.push(local);
        this.stuckCount++;
        this.score++;
        this.sfx.play('tick', 1 + Math.min(this.score, 30) * 0.01);
        this.sparks.burst(CX, CY + R, '#fbbf24', 6);
        if (this.stuckCount >= 5 + Math.min(4, this.logNo)) {
          this.breakT = 0.5;
          this.sfx.play('win');
          this.sparks.burst(CX, CY, '#a16207', 24, 200);
        }
      }
    }
    if (!this.flight && this.cooldown <= 0 && (this.input.tapped() || this.input.keyDowns().length)) {
      this.flight = { y: 560 };
      this.cooldown = 0.08;
    }
  }

  protected draw(g: G2) {
    bg(g, '#365314', '#1a2e05');
    if (this.breakT <= 0) {
      circle(g, CX, CY, R, '#a16207', '#78350f', 6);
      circle(g, CX, CY, R * 0.6, '#b45309');
      circle(g, CX, CY, R * 0.25, '#92400e');
      for (const t of this.teeth) {
        const a = t + this.rot;
        g.save();
        g.translate(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
        g.rotate(a + Math.PI / 2);
        emoji(g, '🦷', 0, 12, 26);
        g.restore();
      }
    }
    emoji(g, '🦫', CX, 60, 50);
    if (this.flight) emoji(g, '🦷', CX, this.flight.y, 30, Math.PI);
    else emoji(g, '🦷', CX, 560, 30, Math.PI, false, 0.9);
    text(g, String(this.score), CX, 130, { size: 54, stroke: 'rgba(0,0,0,.4)' });
    text(g, 'Toca para lanzar un diente', CX, 620, { size: 16, stroke: 'rgba(0,0,0,.4)' });
  }
}

export const create = (ctx: GameCtx) => new Castor(ctx);
