import { bg, emoji, fillRR, text, W, type G2, type GameCtx } from '../kits/prelude';
import { ZigzagCore } from '../kits/zigzag';
import { Game } from '../kits/base';

class Hormiga extends Game {
  z: ZigzagCore;
  camX = 0;
  private lastPassed = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.z = new ZigzagCore(ctx.rng.fork('camino'), { halfWidth: 24, speed0: 230, accel: 1.6, speedMax: 420, segMin: 65, segMax: 130, turn: 999, slope: 0.75 });
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    if (this.input.tapped() || this.input.keyDowns().length) {
      this.z.toggle();
      this.sfx.play('tick');
    }
    this.z.step(dt);
    this.camX += (this.z.x - this.camX) * Math.min(1, 5 * dt);
    const p = this.z.passed();
    if (p > this.lastPassed) {
      this.lastPassed = p;
      this.score = p;
      this.sfx.play('coin', 1 + Math.min(p, 60) * 0.008);
    }
    if (this.z.isOff()) {
      this.sfx.play('hit');
      this.shake();
      this.finish(this.score);
    }
  }

  protected draw(g: G2) {
    bg(g, '#365314', '#14532d');
    const sx = (x: number) => W / 2 + (x - this.camX);
    const sy = (y: number) => 470 + (y - this.z.y);
    // baldosas a lo largo del camino
    const v = this.z.verts;
    for (let i = 0; i < v.length - 1; i++) {
      const a = v[i];
      const b = v[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.ceil(len / 22);
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        const yy = sy(py);
        if (yy > 490 || yy < -30) continue; // las baldosas desaparecen tras pasar
        fillRR(g, { x: sx(px) - 22, y: yy - 12, w: 44, h: 24 }, 6, (i + k) % 2 ? '#a16207' : '#b45309');
      }
    }
    emoji(g, '🐜', sx(this.z.x), 470, 34, this.z.dir > 0 ? 0.6 : -0.6);
    text(g, String(this.score), W / 2, 60, { size: 54, stroke: 'rgba(0,0,0,.35)' });
  }
}

export const create = (ctx: GameCtx) => new Hormiga(ctx);
