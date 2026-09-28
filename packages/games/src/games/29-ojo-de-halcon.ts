import { bg, clamp, emoji, fillRR, formatPct, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const BAR = { x: 30, y: 290, w: 300, h: 64 };
const SPEEDS = [170, 205, 240, 275, 310];

class OjoDeHalcon extends Game {
  needleX: number;
  dir: 1 | -1;
  taps: number[] = [];
  pause = 0;
  private lastLabel = '';
  private lastX = 0;
  private startDelay = 0.6;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.needleX = BAR.x + ctx.rng.range(20, BAR.w - 20);
    this.dir = ctx.rng.sign();
  }

  private get speed() {
    return SPEEDS[Math.min(this.taps.length, 4)];
  }

  private advance(dt: number) {
    this.needleX += this.dir * this.speed * dt;
    if (this.needleX > BAR.x + BAR.w) {
      this.needleX = 2 * (BAR.x + BAR.w) - this.needleX;
      this.dir = -1;
    } else if (this.needleX < BAR.x) {
      this.needleX = 2 * BAR.x - this.needleX;
      this.dir = 1;
    }
  }

  protected step(dt: number) {
    if (this.startDelay > 0) {
      this.startDelay -= dt;
      this.advance(dt);
      return;
    }
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.pause <= 0 && this.taps.length >= 5) {
        this.finish(this.taps.reduce((a, b) => a + b, 0) / this.taps.length);
      }
      return;
    }
    const tap = this.input.downs()[0];
    if (tap) {
      // corrección de sub-paso con la hora real del toque
      const sub = clamp((tap.t - this.tickMs) / 1000, 0, dt);
      const x = clamp(this.needleX + this.dir * this.speed * sub, BAR.x, BAR.x + BAR.w);
      const err = Math.abs(x - (BAR.x + BAR.w / 2)) / (BAR.w / 2);
      const prec = 100 * (1 - err);
      this.taps.push(prec);
      this.lastX = x;
      this.lastLabel = formatPct(prec);
      this.sfx.play(prec > 95 ? 'win' : prec > 80 ? 'ok' : 'bad');
      this.popups.add(this.lastLabel, x, BAR.y - 20, prec > 95 ? '#86efac' : '#fde047');
      this.pause = this.taps.length >= 5 ? 1.0 : 0.7;
      return;
    }
    this.advance(dt);
  }

  protected draw(g: G2) {
    bg(g, '#1e3a5f', '#0f172a');
    emoji(g, '🦅', W / 2, 150, 80);
    text(g, 'Toca cuando la aguja esté en el centro', W / 2, 225, { size: 17, weight: 700, color: '#cbd5e1' });
    const gr = g.createLinearGradient(BAR.x, 0, BAR.x + BAR.w, 0);
    gr.addColorStop(0, '#ef4444');
    gr.addColorStop(0.3, '#f59e0b');
    gr.addColorStop(0.5, '#22c55e');
    gr.addColorStop(0.7, '#f59e0b');
    gr.addColorStop(1, '#ef4444');
    g.fillStyle = gr;
    g.beginPath();
    g.roundRect(BAR.x, BAR.y, BAR.w, BAR.h, 14);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(BAR.x + BAR.w / 2 - 1.5, BAR.y - 8, 3, BAR.h + 16);
    // aguja
    const nx = this.pause > 0 && this.taps.length ? this.lastX : this.needleX;
    fillRR(g, { x: nx - 4, y: BAR.y - 14, w: 8, h: BAR.h + 28 }, 4, '#fff');
    // marcadores de toques
    for (let i = 0; i < 5; i++) {
      const done = i < this.taps.length;
      g.beginPath();
      g.arc(90 + i * 45, 450, 15, 0, Math.PI * 2);
      g.fillStyle = done ? '#22c55e' : 'rgba(255,255,255,0.15)';
      g.fill();
      if (done) text(g, String(Math.round(this.taps[i])), 90 + i * 45, 451, { size: 13, color: '#052e16' });
    }
    const avg = this.taps.length ? this.taps.reduce((a, b) => a + b, 0) / this.taps.length : null;
    text(g, avg === null ? '—' : formatPct(avg), W / 2, 520, { size: 40 });
    text(g, 'Precisión media', W / 2, 555, { size: 15, color: '#94a3b8', weight: 600 });
  }
}

export const create = (ctx: GameCtx) => new OjoDeHalcon(ctx);
