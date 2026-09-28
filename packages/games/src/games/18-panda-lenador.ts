import { bar, bg, emoji, fillRR, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

type Br = 0 | 1 | 2; // 0 nada, 1 izquierda, 2 derecha
const SEG_H = 62;
const BASE_Y = 520;
const TX = W / 2;

class Panda extends Game {
  segs: Br[] = [];
  private br;
  side: 1 | 2 = 2;
  timeBar = 1;
  flying: { side: number; y: number; t: number }[] = [];
  chops = 0;
  private swing = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.br = ctx.rng.fork('ramas');
    this.segs = [0, 0];
    for (let i = 0; i < 9; i++) this.pushSeg();
  }

  private pushSeg() {
    const last = this.segs[this.segs.length - 1];
    let b: Br = 0;
    if (last === 0 && this.br.chance(0.6)) b = this.br.chance(0.5) ? 1 : 2;
    this.segs.push(b);
  }

  protected step(dt: number) {
    if (this.t >= 90) return this.finish(this.chops);
    this.swing = Math.max(0, this.swing - dt * 8);
    for (const f of this.flying) {
      f.t += dt;
      f.y -= 0;
    }
    this.flying = this.flying.filter((f) => f.t < 0.4);
    this.timeBar -= (0.32 + this.chops * 0.006) * dt;
    if (this.timeBar <= 0) {
      this.sfx.play('lose');
      return this.finish(this.chops);
    }
    const ds = this.input.downs();
    const keys = this.input.keyDowns();
    const taps: (1 | 2)[] = [...ds.map((e) => (e.x < W / 2 ? 1 : 2) as 1 | 2)];
    for (const k of keys) taps.push(k === 'ArrowLeft' ? 1 : 2);
    for (const s of taps) {
      this.side = s;
      this.swing = 1;
      const removed = this.segs.shift()!;
      this.flying.push({ side: s === 1 ? 1 : -1, y: BASE_Y, t: 0 });
      void removed;
      this.pushSeg();
      this.chops++;
      this.score = this.chops;
      this.timeBar = Math.min(1, this.timeBar + 0.055);
      this.sfx.play('tick', 1 + (this.chops % 8) * 0.03);
      if (this.segs[0] === this.side) {
        this.sfx.play('hit');
        this.shake();
        return this.finish(this.chops);
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#bbf7d0', '#4ade80');
    fillRR(g, { x: 0, y: BASE_Y, w: W, h: 130 }, 0, '#65a30d');
    this.segs.forEach((b, i) => {
      const y = BASE_Y - (i + 1) * SEG_H;
      fillRR(g, { x: TX - 30, y, w: 60, h: SEG_H - 2 }, 6, '#65a30d');
      g.fillStyle = '#4d7c0f';
      g.fillRect(TX - 30, y + SEG_H - 8, 60, 4);
      if (b) {
        const bx = b === 1 ? TX - 30 - 90 : TX + 30;
        fillRR(g, { x: bx, y: y + 14, w: 90, h: 22 }, 10, '#84cc16');
        emoji(g, '🍃', b === 1 ? bx + 12 : bx + 78, y + 26, 22);
      }
    });
    for (const f of this.flying) emoji(g, '🎋', TX + f.side * (30 + f.t * 400), BASE_Y - 30 - f.t * 60, 30, f.t * 8 * f.side, false, 1 - f.t / 0.4);
    const px = this.side === 1 ? TX - 70 : TX + 70;
    emoji(g, '🐼', px, BASE_Y - 20, 64, 0, this.side === 1);
    emoji(g, '🪓', px + (this.side === 1 ? 44 : -44), BASE_Y - 34 + this.swing * 10, 34, (this.side === 1 ? 1 : -1) * (0.3 + this.swing * 0.8), this.side === 1);
    bar(g, 60, 26, W - 120, 14, this.timeBar, this.timeBar < 0.25 ? '#ef4444' : '#f59e0b');
    text(g, String(this.chops), W / 2, 90, { size: 56, color: '#14532d', stroke: '#fff' });
  }
}

export const create = (ctx: GameCtx) => new Panda(ctx);
