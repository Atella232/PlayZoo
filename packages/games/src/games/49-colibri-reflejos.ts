import { bg, emoji, fillRR, formatNumber, inRect, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const CELL = 100;
const GAP = 10;
const X0 = (W - (3 * CELL + 2 * GAP)) / 2;
const Y0 = 210;
const PENALTY = 0.5;

type Phase = 'wait' | 'lit' | 'result';

class Colibri extends Game {
  rects: Rect[] = [];
  round = 0;
  times: number[] = [];
  phase: Phase = 'wait';
  waitLeft = 0;
  litCell = 0;
  onsetMs = 0;
  early = 0;
  resultLeft = 0;
  lastLabel = '';
  flashRed = 0;
  private wr;
  private cr;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.wr = ctx.rng.fork('esperas');
    this.cr = ctx.rng.fork('celdas');
    for (let i = 0; i < 9; i++) {
      this.rects.push({ x: X0 + (i % 3) * (CELL + GAP), y: Y0 + Math.floor(i / 3) * (CELL + GAP), w: CELL, h: CELL });
    }
    this.newWait(1.2);
  }

  private newWait(min = 0.8) {
    this.waitLeft = this.wr.range(min, 3);
    this.litCell = this.cr.int(0, 8);
    this.phase = 'wait';
  }

  protected step(dt: number) {
    if (this.flashRed > 0) this.flashRed -= dt;
    if (this.phase === 'wait') {
      if (this.input.tapped()) {
        this.early += PENALTY;
        this.flashRed = 0.4;
        this.sfx.play('bad');
        this.popups.add('¡Muy pronto! +0,5 s', W / 2, 160, '#fca5a5');
        this.newWait();
        return;
      }
      this.waitLeft -= dt;
      if (this.waitLeft <= 0) {
        this.phase = 'lit';
        this.onsetMs = this.tickMs;
      }
    } else if (this.phase === 'lit') {
      for (const e of this.input.downs()) {
        if (inRect(this.rects[this.litCell], e.x, e.y)) {
          const rt = Math.max(0, (e.t - this.onsetMs) / 1000) + this.early;
          this.times.push(rt);
          this.early = 0;
          this.lastLabel = formatNumber(rt, 3) + ' s';
          this.sfx.play('ok');
          this.phase = 'result';
          this.resultLeft = 0.9;
          return;
        }
      }
    } else {
      this.resultLeft -= dt;
      if (this.resultLeft <= 0) {
        this.round++;
        if (this.round >= 3) this.finish(this.times.reduce((a, b) => a + b, 0) / 3);
        else this.newWait();
      }
    }
  }

  protected draw(g: G2) {
    bg(g, this.flashRed > 0 ? '#7f1d1d' : '#0e7490', this.flashRed > 0 ? '#450a0a' : '#083344');
    emoji(g, '🐦', 60, 90, 56);
    text(g, `Ronda ${Math.min(this.round + 1, 3)} de 3`, W - 20, 70, { size: 20, align: 'right', weight: 700 });
    const msg = this.phase === 'wait' ? 'Espera…' : this.phase === 'lit' ? '¡Ya!' : this.lastLabel;
    text(g, msg, W / 2, 160, { size: 34, color: this.phase === 'lit' ? '#fde047' : '#fff' });
    this.rects.forEach((r, i) => {
      const lit = this.phase === 'lit' && i === this.litCell;
      fillRR(g, r, 22, lit ? '#fde047' : 'rgba(255,255,255,0.12)');
      if (lit) {
        g.beginPath();
        g.arc(r.x + CELL / 2, r.y + CELL / 2, 30, 0, Math.PI * 2);
        g.fillStyle = '#f59e0b';
        g.fill();
      }
    });
    this.times.forEach((t, i) => text(g, `${i + 1}: ${formatNumber(t, 3)} s`, W / 2, 570 + i * 22 - 20, { size: 16, weight: 600, color: '#a5f3fc' }));
  }
}

export const create = (ctx: GameCtx) => new Colibri(ctx);
