import { bg, circle, text, W, type G2, type GameCtx } from '../kits/prelude';
import { ZigzagCore } from '../kits/zigzag';
import { Game } from '../kits/base';

class Anguila extends Game {
  z: ZigzagCore;
  camX = 0;
  dots: { x: number; y: number; taken: boolean }[] = [];
  private nextDotY = -90;
  trail: { x: number; y: number }[] = [];

  constructor(ctx: GameCtx) {
    super(ctx);
    this.z = new ZigzagCore(ctx.rng.fork('camino'), { halfWidth: 40, speed0: 210, accel: 2, speedMax: 380, segMin: 90, segMax: 210, turn: 40 });
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    if (this.input.tapped() || this.input.keyDowns().length) {
      this.z.toggle();
      this.sfx.play('tick');
    }
    this.z.step(dt);
    this.camX += (this.z.x - this.camX) * Math.min(1, 5 * dt);
    while (this.nextDotY > this.z.y - 900) {
      this.dots.push({ x: this.z.centerAt(this.nextDotY), y: this.nextDotY, taken: false });
      this.nextDotY -= 130;
    }
    for (const d of this.dots) {
      if (!d.taken && Math.hypot(d.x - this.z.x, d.y - this.z.y) < 26) {
        d.taken = true;
        this.score++;
        this.sfx.play('coin', 1 + Math.min(this.score, 50) * 0.01);
        this.popups.add('+1', W / 2, 430, '#fde047', 18);
      }
    }
    this.dots = this.dots.filter((d) => d.y < this.z.y + 400);
    if (this.tick % 2 === 0) {
      this.trail.push({ x: this.z.x, y: this.z.y });
      if (this.trail.length > 16) this.trail.shift();
    }
    if (this.z.isOff()) {
      this.sfx.play('hit');
      this.shake();
      this.finish(this.score);
    }
  }

  protected draw(g: G2) {
    bg(g, '#0b1026', '#1e1b4b');
    const sx = (x: number) => W / 2 + (x - this.camX);
    const sy = (y: number) => 470 + (y - this.z.y);
    const v = this.z.verts;
    const path = () => {
      g.beginPath();
      v.forEach((p, i) => (i ? g.lineTo(sx(p.x), sy(p.y)) : g.moveTo(sx(p.x), sy(p.y))));
    };
    g.lineJoin = 'round';
    for (const [off, col, lw] of [[1, '#22d3ee', 6], [-1, '#e879f9', 6]] as const) {
      g.save();
      g.translate(off * (this.z.o.halfWidth + 3), 0);
      path();
      g.lineWidth = lw;
      g.strokeStyle = col;
      g.shadowColor = col;
      g.shadowBlur = 14;
      g.stroke();
      g.restore();
    }
    for (const d of this.dots) if (!d.taken) circle(g, sx(d.x), sy(d.y), 8, '#fde047', '#fff', 2);
    this.trail.forEach((p, i) => {
      g.globalAlpha = (i / this.trail.length) * 0.7;
      circle(g, sx(p.x), sy(p.y), 3 + i * 0.5, '#67e8f9');
    });
    g.globalAlpha = 1;
    circle(g, sx(this.z.x), 470, 12, '#a5f3fc', '#0891b2', 3);
    text(g, '⚡', sx(this.z.x), 470, { size: 14 });
    text(g, String(this.score), W / 2, 60, { size: 54, stroke: 'rgba(0,0,0,.5)' });
  }
}

export const create = (ctx: GameCtx) => new Anguila(ctx);
