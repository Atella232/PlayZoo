import { Slider, bg, deltaEHsv, emoji, fillRR, hsvCss, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const SAT = 0.8;
const THRESH = 6;

class Mariposa extends Game {
  private cr;
  target: [number, number, number] = [0, SAT, 0.8];
  hue = new Slider({ x: 30, y: 470, w: W - 60, h: 34 }, 0.5, 'Tono');
  val = new Slider({ x: 30, y: 550, w: W - 60, h: 34 }, 0.5, 'Brillo');
  points = 0;
  flash = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.cr = ctx.rng.fork('colores');
    this.next();
  }

  private next() {
    this.target = [this.cr.range(0, 360), SAT, this.cr.range(0.4, 1)];
    let h = this.cr.range(0, 1);
    while (Math.abs(h - this.target[0] / 360) < 0.15) h = this.cr.range(0, 1);
    this.hue.value = h;
    this.val.value = this.cr.range(0.2, 0.9);
  }

  private cur(): [number, number, number] {
    return [this.hue.value * 360, SAT, 0.3 + this.val.value * 0.7];
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.points);
    this.flash = Math.max(0, this.flash - dt);
    this.hue.update(this.input);
    this.val.update(this.input);
    if (deltaEHsv(this.cur(), this.target) <= THRESH) {
      this.points++;
      this.flash = 0.25;
      this.sfx.play('ok');
      this.popups.add('¡Igualado!', W / 2, 420, '#86efac');
      this.next();
    }
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#1f2937', '#111827');
    emoji(g, '🦋', 56, 76, 60);
    text(g, String(this.points), W / 2, 70, { size: 48 });
    text(g, `${Math.max(0, Math.ceil(60 - this.t))} s`, W - 20, 40, { size: 24, align: 'right' });
    fillRR(g, { x: 20, y: 130, w: 155, h: 250 }, 22, hsvCss(...this.target));
    fillRR(g, { x: 185, y: 130, w: 155, h: 250 }, 22, hsvCss(...this.cur()));
    if (this.flash > 0) {
      g.strokeStyle = '#86efac';
      g.lineWidth = 6;
      g.strokeRect(185, 130, 155, 250);
    }
    text(g, 'Objetivo', 97, 400, { size: 15, weight: 700, color: '#9ca3af' });
    text(g, 'Tu color', 262, 400, { size: 15, weight: 700, color: '#9ca3af' });
    this.hue.draw(g, (t) => hsvCss(t * 360, SAT, this.cur()[2]));
    this.val.draw(g, (t) => hsvCss(this.cur()[0], SAT, 0.3 + t * 0.7));
  }
}

export const create = (ctx: GameCtx) => new Mariposa(ctx);
