import { bg, button, emoji, fillRR, inRect, lives, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const MINUS: Rect = { x: 40, y: 500, w: 80, h: 70 };
const PLUS: Rect = { x: W - 120, y: 500, w: 80, h: 70 };
const SEND: Rect = { x: W / 2 - 80, y: 590, w: 160, h: 44 };
const COLS = 10;
const ROWS = 8;
const CELL = 30;
const AX = (W - COLS * CELL) / 2;
const AY = 150;

class Cuervo extends Game {
  private cr;
  level = 1;
  count = 0;
  cells: { c: number; r: number; tone: number }[] = [];
  phase: 'show' | 'ask' | 'result' = 'show';
  left = 1.5;
  guess = 1;
  lifes = 3;
  ok = false;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.cr = ctx.rng.fork('cajas');
    this.next();
  }

  private next() {
    this.count = this.level + 2;
    const all: [number, number][] = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) all.push([c, r]);
    this.cells = this.cr.shuffle(all).slice(0, this.count).map(([c, r]) => ({ c, r, tone: this.cr.int(0, 2) }));
    this.left = Math.max(0.7, 1.6 - this.level * 0.04);
    this.phase = 'show';
    this.guess = 5;
  }

  protected step(dt: number) {
    if (this.t > 100 || this.lifes <= 0) return this.finish(this.level - 1);
    if (this.phase === 'show') {
      this.left -= dt;
      if (this.left <= 0) this.phase = 'ask';
    } else if (this.phase === 'ask') {
      for (const e of this.input.downs()) {
        if (inRect(MINUS, e.x, e.y)) this.guess = Math.max(0, this.guess - 1);
        else if (inRect(PLUS, e.x, e.y)) this.guess++;
        else if (inRect(SEND, e.x, e.y)) {
          this.ok = this.guess === this.count;
          this.phase = 'result';
          this.left = 1.1;
          this.sfx.play(this.ok ? 'ok' : 'bad');
          if (!this.ok) this.lifes--;
        }
      }
      for (const k of this.input.keyDowns()) {
        if (k === 'ArrowUp' || k === 'ArrowRight') this.guess++;
        if (k === 'ArrowDown' || k === 'ArrowLeft') this.guess = Math.max(0, this.guess - 1);
        if (k === 'Enter') {
          this.ok = this.guess === this.count;
          this.phase = 'result';
          this.left = 1.1;
          if (!this.ok) this.lifes--;
        }
      }
    } else {
      this.left -= dt;
      if (this.left <= 0) {
        if (this.ok) this.level++;
        this.score = this.level - 1;
        this.next();
      }
    }
    this.score = this.level - 1;
  }

  protected draw(g: G2) {
    bg(g, '#1e293b', '#0f172a');
    emoji(g, '🪶', 50, 76, 50);
    text(g, `Nivel ${this.level}`, W / 2, 62, { size: 28 });
    lives(g, this.lifes, 3, W - 14, 30);
    if (this.phase === 'show') {
      text(g, 'Cuenta las cajas…', W / 2, 118, { size: 18, color: '#94a3b8' });
      const tones = ['#b45309', '#d97706', '#a16207'];
      for (const b of this.cells) {
        fillRR(g, { x: AX + b.c * CELL + 1, y: AY + b.r * CELL + 1, w: CELL - 3, h: CELL - 3 }, 4, tones[b.tone]);
        g.strokeStyle = 'rgba(0,0,0,.3)';
        g.strokeRect(AX + b.c * CELL + 6, AY + b.r * CELL + 12, CELL - 13, 2);
      }
    } else {
      text(g, '¿Cuántas cajas viste?', W / 2, 200, { size: 26 });
      if (this.phase === 'result') {
        text(g, this.ok ? '¡Correcto!' : `Eran ${this.count}`, W / 2, 260, { size: 30, color: this.ok ? '#86efac' : '#fca5a5' });
      }
      text(g, String(this.guess), W / 2, 420, { size: 100 });
      button(g, MINUS, '−', { color: '#475569', size: 44 });
      button(g, PLUS, '+', { color: '#475569', size: 44 });
      button(g, SEND, 'Enviar', { color: '#16a34a', size: 22, disabled: this.phase === 'result' });
    }
  }
}

export const create = (ctx: GameCtx) => new Cuervo(ctx);
