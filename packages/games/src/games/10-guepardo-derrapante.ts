import { bg, emoji, text, W, type G2, type GameCtx } from '../kits/prelude';
import { ZigzagCore } from '../kits/zigzag';
import { Game } from '../kits/base';

class Guepardo extends Game {
  z: ZigzagCore;
  camX = 0;
  private lastPassed = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.z = new ZigzagCore(ctx.rng.fork('camino'), { halfWidth: 52, speed0: 250, accel: 2.4, speedMax: 430, segMin: 110, segMax: 260, turn: 12 });
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    if (this.input.tapped() || this.input.keyDowns().length) {
      this.z.toggle();
      this.sfx.play('tick');
    }
    this.z.step(dt);
    this.camX += (this.z.x - this.camX) * Math.min(1, 4 * dt);
    const p = this.z.passed();
    if (p > this.lastPassed) {
      this.lastPassed = p;
      this.score = p;
      this.sfx.play('coin', 1 + Math.min(p, 40) * 0.01);
    }
    if (this.z.isOff()) {
      this.sfx.play('hit');
      this.shake();
      this.finish(this.score);
    }
  }

  protected draw(g: G2) {
    bg(g, '#fef3c7', '#fcd34d');
    const sx = (x: number) => W / 2 + (x - this.camX);
    const sy = (y: number) => 470 + (y - this.z.y);
    // arbustos de fondo
    for (let i = 0; i < 12; i++) {
      const yy = ((i * 140 - this.z.y * 0.5) % 1000 + 1000) % 1000 - 100;
      emoji(g, '🌵', ((i * 97) % 360), yy, 26, 0, false, 0.6);
    }
    const v = this.z.verts;
    g.beginPath();
    v.forEach((p, i) => (i ? g.lineTo(sx(p.x), sy(p.y)) : g.moveTo(sx(p.x), sy(p.y))));
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.lineWidth = this.z.o.halfWidth * 2 + 14;
    g.strokeStyle = '#92400e';
    g.stroke();
    g.lineWidth = this.z.o.halfWidth * 2;
    g.strokeStyle = '#d6b483';
    g.stroke();
    g.setLineDash([12, 16]);
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.stroke();
    g.setLineDash([]);
    const ang = Math.atan2(-this.z.speed, this.z.heading * this.z.k * this.z.speed) + Math.PI / 2;
    emoji(g, '🐆', sx(this.z.x), 470, 44, ang - Math.PI / 2 + 0.0);
    text(g, String(this.score), W / 2, 60, { size: 54, stroke: 'rgba(0,0,0,.35)' });
  }
}

export const create = (ctx: GameCtx) => new Guepardo(ctx);
