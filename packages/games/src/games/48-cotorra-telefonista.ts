import { DIGIT_COLORS, Keypad, bg, button, emoji, fillRR, formatNumber, inRect, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { pollKeypad } from '../kits/keys';
import { Game } from '../kits/base';

const READY: Rect = { x: W / 2 - 90, y: 330, w: 180, h: 60 };

class Cotorra extends Game {
  seq: number[];
  phase: 'memo' | 'type' = 'memo';
  idx = 0;
  penalty = 0;
  pad = new Keypad({ x: 40, y: 400, w: W - 80, h: 220 }, { colored: true });
  shown = 0;
  private wrongT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    const r = ctx.rng.fork('digitos');
    this.seq = Array.from({ length: 8 }, () => r.int(0, 9));
  }

  protected step(dt: number) {
    this.pad.update(dt);
    this.wrongT = Math.max(0, this.wrongT - dt);
    this.shown = this.t + this.penalty;
    if (this.phase === 'memo') {
      for (const e of this.input.downs()) if (inRect(READY, e.x, e.y)) this.phase = 'type';
      if (this.input.keyDowns().includes('Enter') || this.input.keyDowns().includes(' ')) this.phase = 'type';
      return;
    }
    const tapT = this.input.downs()[0]?.t ?? this.tickMs;
    for (const k of pollKeypad(this.input, this.pad)) {
      if (!/^\d$/.test(k)) continue;
      if (Number(k) === this.seq[this.idx]) {
        this.idx++;
        this.sfx.play('tick', 1 + this.idx * 0.06);
        if (this.idx >= 8) {
          this.sfx.play('win');
          return this.finish(tapT / 1000 + this.penalty);
        }
      } else {
        this.penalty += 1;
        this.wrongT = 0.35;
        this.sfx.play('bad');
        this.popups.add('+1 s', W / 2, 300, '#fca5a5');
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#1e3a8a', '#172554');
    emoji(g, '🦜', 56, 80, 64);
    text(g, `${formatNumber(this.shown, 2)} s`, W - 20, 70, { size: 30, align: 'right' });
    text(g, this.phase === 'memo' ? 'Memoriza y pulsa "Listo"' : 'Marca la secuencia', W / 2, 150, { size: 18, weight: 700, color: '#bfdbfe' });
    this.seq.forEach((d, i) => {
      const x = 22 + i * 41.5;
      const done = this.phase === 'type' && i < this.idx;
      const vis = this.phase === 'memo' || done;
      fillRR(g, { x, y: 200, w: 36, h: 60 }, 8, vis ? DIGIT_COLORS[d] : this.wrongT > 0 && i === this.idx ? '#dc2626' : 'rgba(255,255,255,.15)');
      if (vis) text(g, String(d), x + 18, 231, { size: 26 });
    });
    if (this.phase === 'memo') button(g, READY, 'Listo', { color: '#16a34a', size: 28 });
    else this.pad.render(g);
  }
}

export const create = (ctx: GameCtx) => new Cotorra(ctx);
