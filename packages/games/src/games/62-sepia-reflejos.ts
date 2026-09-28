import { bg, emoji, formatNumber, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const DURATION = 27;

class Sepia extends Game {
  phase: 'wait' | 'go' | 'result' = 'wait';
  wait = 1.2;
  onset = 0;
  points = 0;
  msg = '';
  msgColor = '#fff';
  private wr;
  private resultLeft = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.wr = ctx.rng.fork('esperas');
  }

  protected step(dt: number) {
    if (this.t >= DURATION) return this.finish(Math.max(0, this.points));
    if (this.phase === 'wait') {
      if (this.input.tapped()) {
        this.points -= 2;
        this.msg = '¡Demasiado pronto! −2';
        this.msgColor = '#fecaca';
        this.wait = this.wr.range(0.8, 2.2);
        this.sfx.play('bad');
        this.shake(8, 0.2);
        return;
      }
      this.wait -= dt;
      if (this.wait <= 0) {
        this.phase = 'go';
        this.onset = this.tickMs;
        this.msg = '';
      }
    } else if (this.phase === 'go') {
      const tap = this.input.downs()[0];
      if (tap) {
        const ms = Math.max(0, tap.t - this.onset);
        const pts = ms <= 350 ? 2 : ms <= 600 ? 1 : 0;
        this.points += pts;
        this.msg = `${Math.round(ms)} ms${pts ? ` · +${pts}` : ''}`;
        this.msgColor = pts === 2 ? '#bbf7d0' : pts === 1 ? '#fde68a' : '#fecaca';
        this.sfx.play(pts ? 'ok' : 'bad');
        this.phase = 'result';
        this.resultLeft = 0.5;
      } else if (this.tickMs - this.onset > 2000) {
        this.msg = '¡Muy lento!';
        this.msgColor = '#fecaca';
        this.phase = 'result';
        this.resultLeft = 0.4;
      }
    } else {
      this.resultLeft -= dt;
      if (this.resultLeft <= 0) {
        this.phase = 'wait';
        this.wait = this.wr.range(0.7, 2.2);
      }
    }
    this.score = Math.max(0, this.points);
  }

  protected draw(g: G2) {
    if (this.phase === 'go') bg(g, '#22c55e');
    else bg(g, '#7c3aed', '#4c1d95');
    emoji(g, '🦑', W / 2, 190, 110);
    text(g, this.phase === 'go' ? '¡TOCA!' : this.phase === 'wait' ? 'Espera al cambio de color…' : '', W / 2, 330, { size: this.phase === 'go' ? 64 : 22, stroke: 'rgba(0,0,0,.3)' });
    text(g, this.msg, W / 2, 420, { size: 32, color: this.msgColor, stroke: 'rgba(0,0,0,.4)' });
    text(g, String(Math.max(0, this.points)), 20, 40, { size: 40, align: 'left', stroke: 'rgba(0,0,0,.3)' });
    text(g, `${Math.max(0, Math.ceil(DURATION - this.t))} s`, W - 20, 40, { size: 24, align: 'right', stroke: 'rgba(0,0,0,.3)' });
    void H;
    void formatNumber;
  }
}

export const create = (ctx: GameCtx) => new Sepia(ctx);
