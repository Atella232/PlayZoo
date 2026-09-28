import { DIGIT_COLORS, Keypad, bar, bg, emoji, fillRR, lives, text, W, type G2, type GameCtx } from '../kits/prelude';
import { pollKeypad } from '../kits/keys';
import { Game } from '../kits/base';

class Loro extends Game {
  private dr;
  pad = new Keypad({ x: 40, y: 400, w: W - 80, h: 220 }, { backspace: true });
  n = 3;
  digits: number[] = [];
  typed = '';
  exposure = 0;
  left = 0;
  points = 0;
  lifes = 3;
  private msg = '';
  private msgT = 0;
  private gap = 0.5;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.dr = ctx.rng.fork('digitos');
  }

  private start() {
    this.digits = Array.from({ length: this.n }, () => this.dr.int(0, 9));
    this.typed = '';
    this.exposure = 0.9 + this.n * 0.55;
    this.left = this.exposure;
  }

  private fail(m: string) {
    this.lifes--;
    this.msg = m;
    this.msgT = 0.9;
    this.digits = [];
    this.gap = 0.9;
    this.sfx.play('bad');
    this.shake(5, 0.15);
  }

  protected step(dt: number) {
    if (this.t >= 60 || this.lifes <= 0) return this.finish(this.points);
    this.pad.update(dt);
    this.msgT = Math.max(0, this.msgT - dt);
    if (!this.digits.length) {
      this.gap -= dt;
      if (this.gap <= 0) this.start();
      return;
    }
    this.left -= dt;
    if (this.left <= 0) return this.fail('¡Tarde!');
    for (const k of pollKeypad(this.input, this.pad)) {
      if (k === 'back') this.typed = this.typed.slice(0, -1);
      else if (/^\d$/.test(k)) {
        const i = this.typed.length;
        if (Number(k) === this.digits[i]) {
          this.typed += k;
          this.points++;
          this.sfx.play('tick', 1 + i * 0.05);
          if (this.typed.length >= this.digits.length) {
            this.n++;
            this.sfx.play('ok');
            this.digits = [];
            this.gap = 0.35;
            break;
          }
        } else {
          this.fail('Dígito incorrecto');
          break;
        }
      }
    }
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#14532d', '#052e16');
    emoji(g, '🦜', 56, 80, 64);
    text(g, String(this.points), W / 2, 70, { size: 48 });
    lives(g, this.lifes, 3, W - 14, 30);
    text(g, `${Math.max(0, Math.ceil(60 - this.t))} s`, W - 14, 60, { size: 16, align: 'right' });
    if (this.digits.length) {
      const w = Math.min(44, (W - 40) / this.digits.length - 4);
      const total = this.digits.length * (w + 4);
      this.digits.forEach((d, i) => {
        const x = (W - total) / 2 + i * (w + 4);
        fillRR(g, { x, y: 170, w, h: 64 }, 8, DIGIT_COLORS[d]);
        text(g, String(d), x + w / 2, 202, { size: 28 });
      });
      bar(g, 30, 256, W - 60, 10, this.left / this.exposure, '#facc15');
      text(g, this.typed.padEnd(this.digits.length, '·').split('').join(' '), W / 2, 320, { size: 34, color: '#bbf7d0' });
    } else if (this.msgT > 0) text(g, this.msg, W / 2, 210, { size: 30, color: '#fecaca' });
    else text(g, '¡Prepárate!', W / 2, 210, { size: 28 });
    this.pad.render(g);
  }
}

export const create = (ctx: GameCtx) => new Loro(ctx);
