import { Keypad, bg, emoji, fillRR, formatNumber, text, W, type G2, type GameCtx } from '../kits/prelude';
import { pollKeypad } from '../kits/keys';
import { Game } from '../kits/base';

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

class Zorro extends Game {
  private dr;
  pad = new Keypad({ x: 40, y: 400, w: W - 80, h: 220 }, { backspace: true });
  round = 0;
  dice: number[] = [];
  entry = '';
  penalty = 0;
  shown = 0;
  private wrongT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.dr = ctx.rng.fork('dados');
    this.roll();
  }

  private roll() {
    this.dice = Array.from({ length: 4 }, () => this.dr.int(1, 6));
    this.entry = '';
  }

  private get sum() {
    return this.dice.reduce((a, b) => a + b, 0);
  }

  protected step(dt: number) {
    this.pad.update(dt);
    this.wrongT = Math.max(0, this.wrongT - dt);
    this.shown = this.t + this.penalty;
    const tapT = this.input.downs()[0]?.t ?? this.tickMs;
    for (const k of pollKeypad(this.input, this.pad)) {
      if (k === 'back') this.entry = this.entry.slice(0, -1);
      else if (/^\d$/.test(k)) {
        this.entry += k;
        this.sfx.play('tick');
        const need = String(this.sum).length;
        if (this.entry.length >= need) {
          if (Number(this.entry) === this.sum) {
            this.round++;
            this.sfx.play('ok');
            if (this.round >= 3) return this.finish(tapT / 1000 + this.penalty);
            this.roll();
          } else {
            this.penalty += 1;
            this.wrongT = 0.4;
            this.entry = '';
            this.sfx.play('bad');
            this.popups.add('+1 s', W / 2, 340, '#fca5a5');
          }
        }
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#9a3412', '#431407');
    emoji(g, '🦊', 56, 80, 64);
    text(g, `${formatNumber(this.shown, 2)} s`, W - 20, 70, { size: 30, align: 'right' });
    text(g, `Ronda ${Math.min(this.round + 1, 3)} de 3 · suma los dados`, W / 2, 140, { size: 16, weight: 700, color: '#fed7aa' });
    this.dice.forEach((d, i) => {
      const x = 52 + i * 84;
      const y = 200;
      fillRR(g, { x: x - 34, y: y - 34, w: 68, h: 68 }, 14, '#fff7ed');
      g.fillStyle = '#7c2d12';
      for (const [px, py] of PIPS[d]) {
        g.beginPath();
        g.arc(x + px * 17, y + py * 17, 6.5, 0, Math.PI * 2);
        g.fill();
      }
    });
    fillRR(g, { x: W / 2 - 70, y: 290, w: 140, h: 70 }, 16, this.wrongT > 0 ? '#dc2626' : 'rgba(0,0,0,.35)');
    text(g, this.entry || '–', W / 2, 326, { size: 44 });
    this.pad.render(g);
  }
}

export const create = (ctx: GameCtx) => new Zorro(ctx);
