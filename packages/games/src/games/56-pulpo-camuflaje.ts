import { Slider, bg, button, deltaEHsv, emoji, fillRR, formatNumber, hsvCss, inRect, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const ROUNDS = 5;
const OK: Rect = { x: W / 2 - 80, y: 590, w: 160, h: 44 };

class Pulpo extends Game {
  private cr;
  targets: [number, number, number][] = [];
  round = 0;
  phase: 'show' | 'edit' | 'result' = 'show';
  left = 3;
  sims: number[] = [];
  sl = [
    new Slider({ x: 30, y: 400, w: W - 60, h: 30 }, 0.5, 'Tono'),
    new Slider({ x: 30, y: 466, w: W - 60, h: 30 }, 0.5, 'Saturación'),
    new Slider({ x: 30, y: 532, w: W - 60, h: 30 }, 0.5, 'Brillo'),
  ];
  private editT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.cr = ctx.rng.fork('colores');
    for (let i = 0; i < ROUNDS; i++) this.targets.push([this.cr.range(0, 360), this.cr.range(0.4, 1), this.cr.range(0.5, 1)]);
  }

  private cur(): [number, number, number] {
    return [this.sl[0].value * 360, this.sl[1].value, this.sl[2].value];
  }

  private submit() {
    const dE = deltaEHsv(this.cur(), this.targets[this.round]);
    const sim = Math.max(0, 100 - dE);
    this.sims.push(sim);
    this.phase = 'result';
    this.left = 1.6;
    this.sfx.play(sim > 95 ? 'win' : 'ok');
  }

  protected step(dt: number) {
    this.left -= dt;
    if (this.phase === 'show') {
      if (this.left <= 0) {
        this.phase = 'edit';
        this.editT = 0;
        this.sl.forEach((s) => (s.value = 0.5));
      }
    } else if (this.phase === 'edit') {
      this.editT += dt;
      this.sl.forEach((s) => s.update(this.input));
      for (const e of this.input.downs()) if (inRect(OK, e.x, e.y)) return this.submit();
      if (this.editT > 25) this.submit();
    } else if (this.left <= 0) {
      this.round++;
      if (this.round >= ROUNDS) return this.finish(this.sims.reduce((a, b) => a + b, 0) / ROUNDS);
      this.phase = 'show';
      this.left = 3;
    }
  }

  protected draw(g: G2) {
    bg(g, '#0f172a', '#1e1b4b');
    emoji(g, '🐙', 56, 76, 60);
    text(g, `Color ${Math.min(this.round + 1, ROUNDS)} de ${ROUNDS}`, W - 20, 50, { size: 18, align: 'right', weight: 700 });
    const t = this.targets[Math.min(this.round, ROUNDS - 1)];
    if (this.phase === 'show') {
      fillRR(g, { x: 40, y: 130, w: W - 80, h: 240 }, 26, hsvCss(...t));
      text(g, `Memoriza este color · ${Math.ceil(this.left)}`, W / 2, 400, { size: 20 });
    } else {
      const showT = this.phase === 'result';
      fillRR(g, { x: 20, y: 130, w: showT ? 155 : W - 40, h: 230 }, 22, hsvCss(...this.cur()));
      if (showT) {
        fillRR(g, { x: 185, y: 130, w: 155, h: 230 }, 22, hsvCss(...t));
        text(g, 'Tu color', 97, 380, { size: 14, color: '#94a3b8' });
        text(g, 'Original', 262, 380, { size: 14, color: '#94a3b8' });
        text(g, `${formatNumber(this.sims[this.sims.length - 1], 2)} %`, W / 2, 440, { size: 46 });
      } else {
        this.sl[0].draw(g, (x) => hsvCss(x * 360, this.cur()[1], this.cur()[2]));
        this.sl[1].draw(g, (x) => hsvCss(this.cur()[0], x, this.cur()[2]));
        this.sl[2].draw(g, (x) => hsvCss(this.cur()[0], this.cur()[1], x));
        button(g, OK, 'Listo', { color: '#16a34a', size: 22 });
      }
    }
  }
}

export const create = (ctx: GameCtx) => new Pulpo(ctx);
