import { bg, emoji, formatNumber, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const ROUNDS = 5;

class GalloPuntual extends Game {
  round = 0;
  targets: number[];
  devs: number[] = [];
  phase: 'run' | 'result' = 'run';
  roundStartMs = 0;
  resultLeft = 0;
  private lastDev = 0;
  private started = false;

  constructor(ctx: GameCtx) {
    super(ctx);
    const r = ctx.rng.fork('objetivos');
    this.targets = Array.from({ length: ROUNDS }, () => r.int(3, 8));
  }

  private get target() {
    return this.targets[this.round];
  }
  private elapsed() {
    return (this.tickMs - this.roundStartMs) / 1000;
  }

  protected step(dt: number) {
    if (!this.started) {
      this.started = true;
      this.roundStartMs = this.tickMs + 600;
    }
    if (this.phase === 'result') {
      this.resultLeft -= dt;
      if (this.resultLeft <= 0) {
        this.round++;
        if (this.round >= ROUNDS) return this.finish(this.devs.reduce((a, b) => a + b, 0) / ROUNDS);
        this.phase = 'run';
        this.roundStartMs = this.tickMs + 500;
      }
      return;
    }
    if (this.tickMs < this.roundStartMs) return;
    const tap = this.input.downs()[0];
    if (tap) {
      const dev = Math.abs((tap.t - this.roundStartMs) / 1000 - this.target);
      return this.endRound(dev);
    }
    if (this.elapsed() > this.target + 3) this.endRound(3);
  }

  private endRound(dev: number) {
    dev = Math.min(3, dev);
    this.devs.push(dev);
    this.lastDev = dev;
    this.phase = 'result';
    this.resultLeft = 1.3;
    this.sfx.play(dev < 0.05 ? 'win' : dev < 0.3 ? 'ok' : 'bad');
  }

  protected draw(g: G2) {
    bg(g, '#f59e0b', '#b45309');
    emoji(g, '🐓', W / 2, 150, 110);
    text(g, `Ronda ${Math.min(this.round + 1, ROUNDS)} de ${ROUNDS}`, W / 2, 60, { size: 18, weight: 700, stroke: 'rgba(0,0,0,.3)' });
    text(g, `Toca en ${this.target ?? ''}`, W / 2, 250, { size: 44, stroke: 'rgba(0,0,0,.35)' });
    const started = this.tickMs >= this.roundStartMs;
    const t = this.phase === 'result' ? this.target + (this.devs[this.round] ?? 0) : Math.max(0, this.elapsed());
    const hidden = this.round >= 3 && this.phase === 'run' && t > 1;
    text(g, hidden ? '?,??' : formatNumber(started || this.phase === 'result' ? t : 0, 2), W / 2, 380, { size: 84, color: '#fff', stroke: 'rgba(0,0,0,.4)' });
    if (hidden) text(g, '¡Ahora sin ver el contador!', W / 2, 440, { size: 16, weight: 700 });
    if (this.phase === 'result') {
      text(g, this.lastDev < 0.005 ? '¡Exacto!' : `Desviación ${formatNumber(this.lastDev, 3)} s`, W / 2, 470, { size: 24, color: this.lastDev < 0.1 ? '#bbf7d0' : '#fee2e2', stroke: 'rgba(0,0,0,.4)' });
    }
    this.devs.forEach((d, i) => text(g, formatNumber(d, 2), 60 + i * 60, 570, { size: 18, weight: 700, color: '#fff7ed' }));
  }
}

export const create = (ctx: GameCtx) => new GalloPuntual(ctx);
