import { bar, bg, emoji, fillRR, inRect, lives, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const COLS = 5;
const ROWS = 8;
const CW = 62;
const AX = (W - COLS * CW) / 2;
const AY = 150;

interface Tile {
  n: number;
  rect: Rect;
  done: boolean;
}

class Chimpance extends Game {
  private cr;
  n = 4;
  tiles: Tile[] = [];
  next = 1;
  hidden = false;
  lifes = 3;
  points = 0;
  private wrong = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.cr = ctx.rng.fork('posiciones');
    this.setup();
  }

  private setup() {
    const cells: number[] = [];
    for (let i = 0; i < COLS * ROWS; i++) cells.push(i);
    const pick = this.cr.shuffle(cells).slice(0, this.n);
    this.tiles = pick.map((c, i) => ({ n: i + 1, done: false, rect: { x: AX + (c % COLS) * CW + 3, y: AY + Math.floor(c / COLS) * CW + 3, w: CW - 6, h: CW - 6 } }));
    this.next = 1;
    this.hidden = false;
  }

  protected step(dt: number) {
    if (this.t >= 60 || this.lifes <= 0) return this.finish(this.points);
    this.wrong = Math.max(0, this.wrong - dt);
    for (const e of this.input.downs()) {
      const tile = this.tiles.find((t) => !t.done && inRect(t.rect, e.x, e.y));
      if (!tile) continue;
      if (tile.n === this.next) {
        tile.done = true;
        this.points++;
        this.hidden = true;
        this.next++;
        this.sfx.play('tick', 1 + this.next * 0.04);
        if (this.next > this.n) {
          this.n++;
          this.sfx.play('ok');
          this.setup();
        }
      } else {
        this.lifes--;
        this.wrong = 0.4;
        this.sfx.play('bad');
        this.shake(6, 0.2);
        this.setup();
      }
    }
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, this.wrong > 0 ? '#7f1d1d' : '#78350f', this.wrong > 0 ? '#450a0a' : '#451a03');
    emoji(g, '🐵', 50, 70, 56);
    text(g, String(this.points), W / 2, 62, { size: 46 });
    lives(g, this.lifes, 3, W - 14, 30);
    bar(g, 20, 118, W - 40, 10, 1 - this.t / 60, '#fbbf24');
    for (const t of this.tiles) {
      if (t.done) continue;
      fillRR(g, t.rect, 10, this.hidden ? '#fef3c7' : '#f59e0b');
      if (!this.hidden) text(g, String(t.n), t.rect.x + t.rect.w / 2, t.rect.y + t.rect.h / 2, { size: 30, color: '#451a03' });
    }
    if (!this.hidden) text(g, 'Memoriza y toca el 1 para empezar', W / 2, 630, { size: 15, weight: 700 });
  }
}

export const create = (ctx: GameCtx) => new Chimpance(ctx);
