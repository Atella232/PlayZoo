import { bg, circle, emoji, formatNumber, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const BEATS = 8;
const TAPS2 = 10;

class GrilloRitmico extends Game {
  interval: number;
  phase: 1 | 2 | 3 = 1;
  beat = 0;
  nextBeatAt = 1.0;
  glow = 0;
  taps2: number[] = [];
  private lastTap = -1;
  private phase2Start = 0;
  private precision = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.interval = ctx.rng.range(0.5, 0.8);
  }

  protected step(dt: number) {
    if (this.glow > 0) this.glow -= dt;
    if (this.phase === 1) {
      if (this.t >= this.nextBeatAt) {
        this.glow = 0.2;
        this.beat++;
        this.nextBeatAt += this.interval;
        this.sfx.play('tick');
        if (this.beat >= BEATS) {
          this.phase = 2;
          this.phase2Start = this.t;
        }
      }
      for (const _ of this.input.downs()) {
        void _;
        this.glow = 0.12;
        this.sfx.play('pop');
      }
    } else if (this.phase === 2) {
      for (const e of this.input.downs()) {
        this.taps2.push(e.t / 1000);
        this.glow = 0.12;
        this.sfx.play('pop');
      }
      if (this.taps2.length >= TAPS2 || this.t - this.phase2Start > 14 || (this.taps2.length && this.t - (this.taps2[this.taps2.length - 1] ?? 0) > 3)) {
        this.precision = this.calc();
        this.phase = 3;
        this.lastTap = 1.4;
      }
    } else {
      this.lastTap -= dt;
      if (this.lastTap <= 0) this.finish(this.precision);
    }
  }

  private calc() {
    const iv: number[] = [];
    for (let i = 1; i < this.taps2.length; i++) iv.push(this.taps2[i] - this.taps2[i - 1]);
    if (!iv.length) return 0;
    const err = iv.reduce((a, b) => a + Math.abs(b - this.interval) / this.interval, 0) / iv.length;
    return Math.max(0, Math.min(100, 100 * (1 - err)));
  }

  protected draw(g: G2) {
    bg(g, '#14532d', '#052e16');
    emoji(g, '🦗', W / 2, 130, 90);
    const lightOn = this.phase === 1 && this.glow > 0;
    const tapFlash = this.glow > 0;
    if (this.phase !== 2) circle(g, W / 2, 330, 80, lightOn ? '#fde047' : 'rgba(253,224,71,.15)');
    else circle(g, W / 2, 330, 80, tapFlash ? 'rgba(148,163,184,.6)' : 'rgba(148,163,184,.15)');
    if (this.phase === 1) {
      text(g, 'Sigue el pulso de la luz tocando', W / 2, 470, { size: 18 });
      text(g, `${this.beat}/${BEATS}`, W / 2, 330, { size: 40, color: '#052e16' });
    } else if (this.phase === 2) {
      text(g, 'La luz se ha ido. ¡Mantén el ritmo!', W / 2, 470, { size: 18 });
      text(g, `${this.taps2.length}/${TAPS2}`, W / 2, 330, { size: 40 });
    } else {
      text(g, `${formatNumber(this.precision, 1)} %`, W / 2, 330, { size: 52 });
      text(g, 'Precisión del ritmo', W / 2, 470, { size: 18 });
    }
  }
}

export const create = (ctx: GameCtx) => new GrilloRitmico(ctx);
