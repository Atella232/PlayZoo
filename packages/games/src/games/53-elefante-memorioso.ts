import { DIR_ARROW, DIRS, Dpad, bg, emoji, fillRR, text, W, type Dir, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

class Elefante extends Game {
  private sr;
  pad = new Dpad(W / 2, 490, 62, 8);
  seq: Dir[] = [];
  phase: 'observa' | 'turno' | 'ok' = 'observa';
  shownIdx = -1;
  timer = 0.8;
  input_i = 0;
  points = 0;
  round = 1;
  private lit: Dir | null = null;
  private litT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('flechas');
    this.newRound();
  }

  private newRound() {
    this.seq = Array.from({ length: this.round + 1 }, () => this.sr.pick(DIRS));
    this.phase = 'observa';
    this.shownIdx = -1;
    this.timer = 0.8;
    this.input_i = 0;
  }

  protected step(dt: number) {
    if (this.t >= 120) return this.finish(this.points);
    this.pad.update(dt);
    this.litT = Math.max(0, this.litT - dt);
    if (this.phase === 'observa') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.shownIdx++;
        if (this.shownIdx >= this.seq.length) {
          this.phase = 'turno';
          this.lit = null;
        } else {
          this.lit = this.seq[this.shownIdx];
          this.litT = 0.3;
          this.timer = 0.45;
          this.sfx.play('tick', 0.8 + DIRS.indexOf(this.lit) * 0.2);
        }
      }
    } else if (this.phase === 'turno') {
      const d = this.pad.poll(this.input);
      if (d) {
        this.lit = d;
        this.litT = 0.2;
        if (d === this.seq[this.input_i]) {
          this.points++;
          this.input_i++;
          this.sfx.play('tick', 0.8 + DIRS.indexOf(d) * 0.2);
          if (this.input_i >= this.seq.length) {
            this.phase = 'ok';
            this.timer = 0.6;
            this.sfx.play('ok');
          }
        } else {
          this.sfx.play('lose');
          return this.finish(this.points);
        }
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.round++;
        this.newRound();
      }
    }
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#374151', '#111827');
    emoji(g, '🐘', W / 2, 130, 90);
    text(g, String(this.points), W - 20, 50, { size: 34, align: 'right' });
    text(g, `Ronda ${this.round}`, 20, 50, { size: 20, align: 'left', weight: 700, color: '#9ca3af' });
    text(g, this.phase === 'observa' ? 'Observa' : this.phase === 'turno' ? 'Tu turno' : '¡Bien!', W / 2, 230, { size: 34, color: this.phase === 'turno' ? '#fde047' : '#fff' });
    // secuencia (puntos)
    this.seq.forEach((d, i) => {
      const w = Math.min(28, (W - 40) / this.seq.length - 4);
      const x = (W - this.seq.length * (w + 4)) / 2 + i * (w + 4);
      const done = this.phase === 'turno' ? i < this.input_i : this.phase === 'ok' ? true : i <= this.shownIdx;
      fillRR(g, { x, y: 262, w, h: 16 }, 6, done ? '#fbbf24' : 'rgba(255,255,255,.15)');
      void d;
    });
    if (this.lit && this.litT > 0) {
      text(g, DIR_ARROW[this.lit], W / 2, 350, { size: 120, color: '#fde047', stroke: 'rgba(0,0,0,.4)' });
    }
    this.pad.draw(g, this.phase === 'turno' ? '#6366f1' : '#374151');
  }
}

export const create = (ctx: GameCtx) => new Elefante(ctx);
