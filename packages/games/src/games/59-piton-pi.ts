import { Keypad, bg, emoji, lives, text, W, type G2, type GameCtx } from '../kits/prelude';
import { pollKeypad } from '../kits/keys';
import { Game } from '../kits/base';

// Primeros decimales de π (sin el "3.")
const PI =
  '14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196';

class PitonPi extends Game {
  pad = new Keypad({ x: 40, y: 400, w: W - 80, h: 220 });
  idx = 0;
  lifes = 3;
  private wrongT = 0;

  protected step(dt: number) {
    if (this.t >= 60 || this.lifes <= 0 || this.idx >= PI.length) return this.finish(this.idx);
    this.pad.update(dt);
    this.wrongT = Math.max(0, this.wrongT - dt);
    for (const k of pollKeypad(this.input, this.pad)) {
      if (!/^\d$/.test(k)) continue;
      if (k === PI[this.idx]) {
        this.idx++;
        this.sfx.play('tick', 1 + (this.idx % 10) * 0.04);
      } else {
        this.lifes--;
        this.wrongT = 0.4;
        this.sfx.play('bad');
        this.shake(5, 0.15);
      }
    }
    this.score = this.idx;
  }

  protected draw(g: G2) {
    bg(g, this.wrongT > 0 ? '#7f1d1d' : '#365314', this.wrongT > 0 ? '#450a0a' : '#1a2e05');
    emoji(g, '🐍', 56, 80, 64);
    text(g, String(this.idx), W / 2, 70, { size: 48 });
    lives(g, this.lifes, 3, W - 14, 30);
    text(g, `${Math.max(0, Math.ceil(60 - this.t))} s`, W - 14, 60, { size: 16, align: 'right' });
    text(g, 'π = 3,', 60, 190, { size: 42, align: 'left' });
    const shown = PI.slice(Math.max(0, this.idx - 3), this.idx);
    text(g, shown.padStart(3, '·').split('').join(' ') + ' _', 160, 190, { size: 42, align: 'left', color: '#bef264' });
    text(g, 'Escribe los decimales de π en orden', W / 2, 260, { size: 16, weight: 700, color: '#d9f99d' });
    text(g, `Decimal nº ${this.idx + 1}`, W / 2, 300, { size: 20, color: '#ecfccb' });
    this.pad.render(g);
  }
}

export const create = (ctx: GameCtx) => new PitonPi(ctx);
