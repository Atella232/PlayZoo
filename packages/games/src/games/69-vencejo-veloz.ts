import { DIR_ARROW, bar, bg, emoji, fillRR, inRect, lives, text, W, type Dir, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const CELLS: Rect[] = [
  { x: 20, y: 190, w: 155, h: 170 },
  { x: 185, y: 190, w: 155, h: 170 },
  { x: 20, y: 380, w: 155, h: 170 },
  { x: 185, y: 380, w: 155, h: 170 },
];
const DIRS: Dir[] = ['left', 'right', 'up', 'down'];

interface Cell {
  dir: Dir;
  left: number;
  total: number;
  flash: number;
  ok: boolean;
}

class Vencejo extends Game {
  cells: Cell[] = [];
  private dr;
  lifes = 3;
  points = 0;
  private grabs = new Map<number, { cell: number; x: number; y: number; done: boolean }>();

  constructor(ctx: GameCtx) {
    super(ctx);
    this.dr = ctx.rng.fork('flechas');
    for (let i = 0; i < 4; i++) this.cells.push(this.fresh());
  }

  private limit() {
    return Math.max(1.4, 3.4 - this.t * 0.032);
  }
  private fresh(): Cell {
    const total = this.limit();
    return { dir: this.dr.pick(DIRS), left: total, total, flash: 0, ok: true };
  }

  private resolve(i: number, ok: boolean) {
    const c = this.cells[i];
    if (ok) {
      this.points++;
      this.sfx.play('ok');
      this.popups.add('+1', CELLS[i].x + CELLS[i].w / 2, CELLS[i].y + 20, '#fde047');
    } else {
      this.lifes--;
      this.sfx.play('bad');
      this.shake(5, 0.15);
    }
    const f = this.fresh();
    f.flash = 0.25;
    f.ok = ok;
    this.cells[i] = f;
    void c;
  }

  protected step(dt: number) {
    if (this.t >= 60 || this.lifes <= 0) return this.finish(this.points);
    this.cells.forEach((c, i) => {
      c.flash = Math.max(0, c.flash - dt);
      c.left -= dt;
      if (c.left <= 0) this.resolve(i, false);
    });
    for (const e of this.input.events) {
      if (e.type === 'down') {
        const i = CELLS.findIndex((r) => inRect(r, e.x, e.y));
        if (i >= 0) this.grabs.set(e.id, { cell: i, x: e.x, y: e.y, done: false });
      } else if (e.type === 'move') {
        const gr = this.grabs.get(e.id);
        if (gr && !gr.done) {
          const dx = e.x - gr.x;
          const dy = e.y - gr.y;
          if (Math.hypot(dx, dy) >= 28) {
            gr.done = true;
            const d: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
            this.resolve(gr.cell, d === this.cells[gr.cell].dir);
          }
        }
      } else if (e.type === 'up') this.grabs.delete(e.id);
    }
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#0f766e', '#134e4a');
    emoji(g, '🐦', 56, 80, 60);
    text(g, String(this.points), W / 2, 70, { size: 50 });
    text(g, `${Math.max(0, Math.ceil(60 - this.t))} s`, W - 14, 26, { size: 20, align: 'right' });
    lives(g, this.lifes, 3, W - 14, 56);
    text(g, 'Desliza en la dirección de la flecha', W / 2, 160, { size: 16, weight: 700, color: '#99f6e4' });
    this.cells.forEach((c, i) => {
      const r = CELLS[i];
      fillRR(g, r, 20, c.flash > 0 ? (c.ok ? '#86efac' : '#fca5a5') : '#f0fdfa');
      text(g, DIR_ARROW[c.dir], r.x + r.w / 2, r.y + r.h / 2 - 14, { size: 84, color: '#0f766e' });
      bar(g, r.x + 14, r.y + r.h - 26, r.w - 28, 10, c.left / c.total, c.left / c.total < 0.3 ? '#ef4444' : '#14b8a6', 'rgba(0,0,0,.15)');
    });
  }
}

export const create = (ctx: GameCtx) => new Vencejo(ctx);
