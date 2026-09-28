import { bar, bg, emoji, fillRR, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const DURATION = 15;

class Carpintero extends Game {
  taps = 0;
  private started = false;
  private startT = 0;
  peck = 0;
  private chips: { x: number; y: number; life: number }[] = [];

  constructor(ctx: GameCtx) {
    super(ctx);
  }

  protected step(dt: number) {
    this.peck = Math.max(0, this.peck - dt * 8);
    for (const c of this.chips) c.life -= dt;
    this.chips = this.chips.filter((c) => c.life > 0);
    const n = this.input.downs().length;
    if (n) {
      if (!this.started) {
        this.started = true;
        this.startT = this.t;
      }
      this.taps += n;
      this.peck = 1;
      this.sfx.play('tick', 0.8 + (this.taps % 5) * 0.05);
      this.chips.push({ x: W / 2 + (Math.random() - 0.5) * 60, y: 380, life: 0.4 });
    }
    this.score = this.taps;
    if (this.started && this.t - this.startT >= DURATION) this.finish(this.taps);
    if (!this.started && this.t > 30) this.finish(0);
  }

  protected draw(g: G2) {
    bg(g, '#365314', '#1a2e05');
    fillRR(g, { x: W / 2 - 70, y: 90, w: 140, h: 540 }, 20, '#78350f');
    for (let i = 0; i < 8; i++) fillRR(g, { x: W / 2 - 60 + (i % 2) * 70, y: 120 + i * 65, w: 40, h: 6 }, 3, '#57210b');
    emoji(g, '🐤', W / 2 - 46 + this.peck * 18, 330 - this.peck * 4, 90, this.peck * 0.35, true);
    for (const c of this.chips) emoji(g, '🪵', c.x, c.y - (0.4 - c.life) * 90, 14, c.life * 6);
    const el = this.started ? this.t - this.startT : 0;
    bar(g, 30, 50, W - 60, 12, 1 - el / DURATION, '#facc15');
    text(g, String(this.taps), W / 2, 130, { size: 72, stroke: 'rgba(0,0,0,.4)' });
    if (!this.started) text(g, '¡Toca el tronco sin parar!', W / 2, 590, { size: 20, stroke: 'rgba(0,0,0,.4)' });
    else text(g, `${Math.max(0, DURATION - el).toFixed(1).replace('.', ',')} s`, W / 2, 590, { size: 24, stroke: 'rgba(0,0,0,.4)' });
  }
}

export const create = (ctx: GameCtx) => new Carpintero(ctx);
