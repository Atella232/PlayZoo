import { bg, emoji, fillRR, formatNumber, inRect, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const OPT: Rect[] = [
  { x: 24, y: 380, w: 150, h: 96 },
  { x: 186, y: 380, w: 150, h: 96 },
  { x: 24, y: 490, w: 150, h: 96 },
  { x: 186, y: 490, w: 150, h: 96 },
];

interface Q {
  label: string;
  answer: number;
  options: number[];
}

class Buho extends Game {
  private qr;
  qs: Q[] = [];
  i = 0;
  penalty = 0;
  flash = -1;
  flashT = 0;
  shown = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.qr = ctx.rng.fork('operaciones');
    for (let k = 0; k < 5; k++) this.qs.push(this.make());
  }

  private make(): Q {
    const r = this.qr;
    const kind = r.int(0, 2);
    let a: number;
    let b: number;
    let label: string;
    let answer: number;
    if (kind === 0) {
      a = r.int(3, 30);
      b = r.int(3, 30);
      answer = a + b;
      label = `${a} + ${b}`;
    } else if (kind === 1) {
      a = r.int(12, 45);
      b = r.int(3, a - 2);
      answer = a - b;
      label = `${a} − ${b}`;
    } else {
      a = r.int(2, 9);
      b = r.int(3, 9);
      answer = a * b;
      label = `${a} × ${b}`;
    }
    const set = new Set<number>([answer]);
    while (set.size < 4) {
      const d = r.int(1, 8) * r.sign();
      const v = answer + d;
      if (v > 0) set.add(v);
    }
    return { label, answer, options: r.shuffle([...set]) };
  }

  protected step(dt: number) {
    this.flashT = Math.max(0, this.flashT - dt);
    this.shown = this.t + this.penalty;
    for (const e of this.input.downs()) {
      const k = OPT.findIndex((r) => inRect(r, e.x, e.y));
      if (k < 0) continue;
      const q = this.qs[this.i];
      if (q.options[k] === q.answer) {
        this.sfx.play('ok');
        this.i++;
        if (this.i >= 5) return this.finish(e.t / 1000 + this.penalty);
      } else {
        this.penalty += 1;
        this.flash = k;
        this.flashT = 0.35;
        this.sfx.play('bad');
        this.popups.add('+1 s', OPT[k].x + 75, OPT[k].y, '#fca5a5');
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#4c1d95', '#1e1b4b');
    emoji(g, '🦉', 60, 90, 70);
    text(g, `${formatNumber(this.shown, 2)} s`, W - 20, 80, { size: 30, align: 'right' });
    text(g, `${Math.min(this.i + 1, 5)} / 5`, W / 2, 180, { size: 18, weight: 700, color: '#c4b5fd' });
    const q = this.qs[Math.min(this.i, 4)];
    text(g, q.label, W / 2, 270, { size: 64, stroke: 'rgba(0,0,0,.35)' });
    text(g, '= ?', W / 2, 330, { size: 36, color: '#ddd6fe' });
    OPT.forEach((r, k) => {
      fillRR(g, r, 20, this.flashT > 0 && this.flash === k ? '#dc2626' : '#f5f3ff');
      text(g, String(q.options[k]), r.x + r.w / 2, r.y + r.h / 2, { size: 42, color: this.flashT > 0 && this.flash === k ? '#fff' : '#4c1d95' });
    });
  }
}

export const create = (ctx: GameCtx) => new Buho(ctx);
