import { bg, emoji, fillRR, inRect, lives, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const POOL = 20;
const CELL = 110;

interface Cell {
  n: number;
  rect: Rect;
  marked: boolean;
  shake: number;
}

class Bingo extends Game {
  private br;
  seq: number[] = [];
  drawn = new Set<number>();
  history: number[] = [];
  card: Cell[] = [];
  lifes = 3;
  points = 0;
  private nextBall = 0.8;
  private cardRng;
  cards = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.br = ctx.rng.fork('bolas');
    this.cardRng = ctx.rng.fork('cartones');
    this.newCard();
  }

  private newCard() {
    // al menos 2 números aún sin salir para que haya espera
    const undrawn = [...Array(POOL).keys()].map((i) => i + 1).filter((n) => !this.drawn.has(n));
    const pick = new Set<number>();
    const u = this.cardRng.shuffle(undrawn);
    for (let i = 0; i < Math.min(4, u.length); i++) pick.add(u[i]);
    while (pick.size < 4) pick.add(this.cardRng.int(1, POOL));
    const nums = this.cardRng.shuffle([...pick]);
    this.card = nums.map((n, i) => ({ n, marked: false, shake: 0, rect: { x: 55 + (i % 2) * (CELL + 20), y: 400 + Math.floor(i / 2) * (CELL + 14), w: CELL, h: CELL } }));
    this.cards++;
  }

  private draw1() {
    if (!this.seq.length) {
      this.seq = this.br.shuffle([...Array(POOL).keys()].map((i) => i + 1));
      this.drawn.clear();
      this.history = [];
      // los cartones vigentes conservan solo lo marcado
    }
    const n = this.seq.pop()!;
    this.drawn.add(n);
    this.history.push(n);
    if (this.history.length > 7) this.history.shift();
    this.sfx.play('pop');
  }

  protected step(dt: number) {
    if (this.t >= 60 || this.lifes <= 0) return this.finish(this.points);
    for (const c of this.card) c.shake = Math.max(0, c.shake - dt);
    this.nextBall -= dt;
    if (this.nextBall <= 0) {
      this.draw1();
      this.nextBall = Math.max(0.55, 1.5 - this.t * 0.016);
    }
    for (const e of this.input.downs()) {
      const c = this.card.find((x) => inRect(x.rect, e.x, e.y));
      if (!c || c.marked) continue;
      if (this.drawn.has(c.n)) {
        c.marked = true;
        this.points += 10;
        this.sfx.play('ok');
        this.popups.add('+10', c.rect.x + CELL / 2, c.rect.y, '#fde047');
        if (this.card.every((x) => x.marked)) {
          this.points += 40;
          this.popups.add('¡Bingo! +40', W / 2, 380, '#86efac', 28);
          this.sfx.play('win');
          this.newCard();
        }
      } else {
        this.lifes--;
        c.shake = 0.3;
        this.sfx.play('bad');
        this.shake(6, 0.2);
      }
    }
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#dcfce7', '#86efac');
    emoji(g, '🐑', 62, 100, 80);
    text(g, String(this.points), W / 2 + 20, 70, { size: 48, color: '#14532d' });
    text(g, `${Math.max(0, Math.ceil(60 - this.t))} s`, W - 14, 26, { size: 20, align: 'right', color: '#14532d' });
    lives(g, this.lifes);
    const last = this.history[this.history.length - 1];
    if (last !== undefined) {
      g.beginPath();
      g.arc(W / 2, 220, 62, 0, Math.PI * 2);
      g.fillStyle = '#fff';
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = '#16a34a';
      g.stroke();
      text(g, String(last), W / 2, 222, { size: 64, color: '#14532d' });
    }
    this.history.slice(0, -1).forEach((n, i) => {
      g.beginPath();
      g.arc(40 + i * 46, 320, 18, 0, Math.PI * 2);
      g.fillStyle = '#fff';
      g.fill();
      text(g, String(n), 40 + i * 46, 321, { size: 16, color: '#166534' });
    });
    text(g, 'Marca los números de tu cartón que ya han salido', W / 2, 372, { size: 14, weight: 700, color: '#14532d' });
    for (const c of this.card) {
      const dx = c.shake > 0 ? Math.sin(c.shake * 60) * 6 : 0;
      fillRR(g, { ...c.rect, x: c.rect.x + dx }, 18, c.marked ? '#16a34a' : c.shake > 0 ? '#dc2626' : '#fff');
      text(g, String(c.n), c.rect.x + CELL / 2 + dx, c.rect.y + CELL / 2, { size: 46, color: c.marked ? '#fff' : '#14532d' });
    }
  }
}

export const create = (ctx: GameCtx) => new Bingo(ctx);
