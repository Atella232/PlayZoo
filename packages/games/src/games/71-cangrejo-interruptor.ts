import { bar, bg, emoji, fillRR, inRect, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const XS = [20, 130, 240];
const YS = [170, 285, 400, 515];
const SLOTS: Rect[] = YS.flatMap((y) => XS.map((x) => ({ x, y, w: 100, h: 100 })));

class Cangrejo extends Game {
  active = new Map<number, number>(); // slot -> tiempo de "activado" (0 = apagado)
  private sr;
  timeBar = 1;
  points = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('interruptores');
    this.fill();
  }

  private target() {
    return Math.min(5, 1 + Math.floor(this.t / 11));
  }
  private fill() {
    let guard = 0;
    while ([...this.active.values()].filter((v) => v === 0).length < this.target() && guard++ < 30) {
      const s = this.sr.int(0, SLOTS.length - 1);
      if (!this.active.has(s)) this.active.set(s, 0);
    }
  }

  protected step(dt: number) {
    if (this.t >= 90) return this.finish(this.points);
    this.timeBar -= (0.11 + this.t * 0.0018) * dt;
    if (this.timeBar <= 0) {
      this.sfx.play('lose');
      return this.finish(this.points);
    }
    for (const [s, v] of this.active) {
      if (v > 0) {
        const nv = v - dt;
        if (nv <= 0) this.active.delete(s);
        else this.active.set(s, nv);
      }
    }
    for (const e of this.input.downs()) {
      const s = SLOTS.findIndex((r, i) => this.active.get(i) === 0 && inRect(r, e.x, e.y));
      if (s >= 0) {
        this.active.set(s, 0.18);
        this.points++;
        this.timeBar = Math.min(1, this.timeBar + 0.075);
        this.sfx.play('pop', 1 + Math.min(this.points, 40) * 0.01);
        this.popups.add('+1', SLOTS[s].x + 50, SLOTS[s].y, '#fde047', 20);
      }
    }
    this.fill();
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#0e7490', '#164e63');
    emoji(g, '🦀', 50, 70, 60);
    text(g, String(this.points), W / 2, 62, { size: 50 });
    bar(g, 20, 118, W - 40, 16, this.timeBar, this.timeBar < 0.25 ? '#ef4444' : '#facc15');
    SLOTS.forEach((r, i) => {
      const v = this.active.get(i);
      if (v === undefined) return;
      const on = v > 0;
      fillRR(g, r, 22, on ? '#166534' : '#1e293b');
      fillRR(g, { x: r.x + 34, y: r.y + 14, w: 32, h: 72 }, 16, '#0f172a');
      fillRR(g, { x: r.x + 30, y: on ? r.y + 12 : r.y + 50, w: 40, h: 38 }, 14, on ? '#4ade80' : '#f87171');
    });
  }
}

export const create = (ctx: GameCtx) => new Cangrejo(ctx);
