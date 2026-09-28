import { bg, emoji, fillRR, inRect, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const CELL = 78;
const GAP = 8;
const X0 = (W - (4 * CELL + 3 * GAP)) / 2;
const Y0 = 200;

class Ardilla extends Game {
  cells: { n: number; rect: Rect; done: boolean; flash: number }[] = [];
  next = 1;
  penalty = 0;
  private shown = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    const order = ctx.rng.shuffle(Array.from({ length: 16 }, (_, i) => i + 1));
    order.forEach((n, i) => {
      const c = i % 4;
      const r = Math.floor(i / 4);
      this.cells.push({ n, rect: { x: X0 + c * (CELL + GAP), y: Y0 + r * (CELL + GAP), w: CELL, h: CELL }, done: false, flash: 0 });
    });
  }

  protected step() {
    for (const c of this.cells) c.flash = Math.max(0, c.flash - 1 / 60);
    for (const e of this.input.downs()) {
      const cell = this.cells.find((c) => inRect(c.rect, e.x, e.y));
      if (!cell || cell.done) continue;
      if (cell.n === this.next) {
        cell.done = true;
        this.next++;
        this.sfx.play('tick');
        if (this.next > 16) {
          this.sfx.play('win');
          this.finish(e.t / 1000 + this.penalty);
          return;
        }
      } else {
        this.penalty += 0.5;
        cell.flash = 0.3;
        this.sfx.play('bad');
        this.popups.add('+0,5 s', cell.rect.x + CELL / 2, cell.rect.y, '#fca5a5');
      }
    }
    this.shown = this.t + this.penalty;
  }

  protected draw(g: G2) {
    bg(g, '#7c2d12', '#431407');
    emoji(g, '🐿️', 60, 90, 60);
    text(g, 'Busca el', 190, 70, { size: 16, weight: 600, color: '#fed7aa' });
    text(g, this.next <= 16 ? String(this.next) : '✓', 190, 108, { size: 48 });
    text(g, this.shown.toFixed(2).replace('.', ',') + ' s', W - 20, 90, { size: 28, align: 'right' });
    for (const c of this.cells) {
      const col = c.done ? '#166534' : c.flash > 0 ? '#dc2626' : '#f59e0b';
      fillRR(g, c.rect, 14, col);
      if (!c.done) text(g, String(c.n), c.rect.x + CELL / 2, c.rect.y + CELL / 2, { size: 34, color: '#451a03' });
    }
  }
}

export const create = (ctx: GameCtx) => new Ardilla(ctx);
