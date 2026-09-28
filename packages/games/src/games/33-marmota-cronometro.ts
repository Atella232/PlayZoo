import { bar, bg, emoji, formatNumber, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const ROUNDS = 3;

class Marmota extends Game {
  durs: number[];
  round = 0;
  devs: number[] = [];
  phase: 'wait' | 'run' | 'result' = 'wait';
  startMs = 0;
  left = 0.8;
  private last = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    const r = ctx.rng.fork('duraciones');
    this.durs = Array.from({ length: ROUNDS }, () => Math.round(r.range(3, 8) * 10) / 10);
  }

  protected step(dt: number) {
    if (this.phase === 'wait') {
      this.left -= dt;
      if (this.left <= 0) {
        this.phase = 'run';
        this.startMs = this.tickMs;
      }
      return;
    }
    if (this.phase === 'run') {
      const el = (this.tickMs - this.startMs) / 1000;
      const tap = this.input.downs()[0];
      if (tap) return this.end(Math.abs((tap.t - this.startMs) / 1000 - this.durs[this.round]));
      if (el > this.durs[this.round] + 2) this.end(2);
      return;
    }
    this.left -= dt;
    if (this.left <= 0) {
      this.round++;
      if (this.round >= ROUNDS) return this.finish(this.devs.reduce((a, b) => a + b, 0) / ROUNDS);
      this.phase = 'wait';
      this.left = 0.8;
    }
  }

  private end(dev: number) {
    dev = Math.min(2, dev);
    this.devs.push(dev);
    this.last = dev;
    this.phase = 'result';
    this.left = 1.4;
    this.sfx.play(dev < 0.06 ? 'win' : dev < 0.25 ? 'ok' : 'bad');
  }

  protected draw(g: G2) {
    bg(g, '#7c5a2b', '#3b2a12');
    emoji(g, '🦫', W / 2, 150, 100);
    text(g, `Ronda ${Math.min(this.round + 1, ROUNDS)} de ${ROUNDS}`, W / 2, 60, { size: 18, weight: 700 });
    text(g, '¡Toca cuando termine!', W / 2, 250, { size: 30, stroke: 'rgba(0,0,0,.35)' });
    const d = this.durs[this.round] ?? 1;
    const el = this.phase === 'run' ? (this.tickMs - this.startMs) / 1000 : this.phase === 'result' ? d + (this.devs[this.round] ?? 0) : 0;
    let frac = Math.max(0, 1 - el / d);
    // desde la ronda 2 se oculta el último tramo
    const masked = this.round >= 1 && this.phase === 'run' && frac < 0.35;
    if (masked) frac = 0.35;
    bar(g, 30, 340, W - 60, 46, this.phase === 'result' ? Math.max(0, 1 - el / d) : frac, masked ? '#94a3b8' : '#f59e0b', 'rgba(0,0,0,.35)');
    if (masked) text(g, '¿? ¿? ¿?', W / 2, 363, { size: 20, color: '#1e293b' });
    if (this.phase === 'result') text(g, this.last < 0.003 ? '¡Clavado!' : `Desviación ${formatNumber(this.last, 3)} s`, W / 2, 450, { size: 24, color: this.last < 0.1 ? '#bbf7d0' : '#fee2e2' });
    this.devs.forEach((v, i) => text(g, formatNumber(v, 2), 90 + i * 90, 560, { size: 20, weight: 700 }));
  }
}

export const create = (ctx: GameCtx) => new Marmota(ctx);
