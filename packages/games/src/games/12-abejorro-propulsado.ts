import { bg, emoji, formatNumber, text, W, H, clamp, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const BY = 470;
const SPACING = 210;

interface Beam {
  wy: number;
  gapX: number;
  gap: number;
  move: number; // amplitud del gap móvil
  ph: number;
  diag: boolean;
}

class Abejorro extends Game {
  x = W / 2;
  climb = 0;
  beams: Beam[] = [];
  private sr;
  private nextWy = 420;
  private grab: { id: number; fx: number; bx: number } | null = null;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('rayos');
    this.fill();
  }

  private fill() {
    while (this.nextWy < this.climb + 800) {
      const m = this.nextWy / 40;
      const gap = Math.max(92, 150 - m * 0.35);
      this.beams.push({
        wy: this.nextWy,
        gapX: this.sr.range(gap / 2 + 20, W - gap / 2 - 20),
        gap,
        move: m > 25 && this.sr.chance(0.5) ? this.sr.range(30, 80) : 0,
        ph: this.sr.range(0, 6.28),
        diag: false,
      });
      this.nextWy += SPACING * this.sr.range(0.85, 1.1);
    }
    this.beams = this.beams.filter((b) => b.wy > this.climb - 200);
  }

  private gapCenter(b: Beam) {
    return clamp(b.gapX + Math.sin(this.t * 1.6 + b.ph) * b.move, b.gap / 2 + 14, W - b.gap / 2 - 14);
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    for (const e of this.input.events) {
      if (e.type === 'down') this.grab = { id: e.id, fx: e.x, bx: this.x };
      else if (e.type === 'move' && this.grab?.id === e.id) this.x = clamp(this.grab.bx + (e.x - this.grab.fx), 14, W - 14);
      else if (e.type === 'up' && this.grab?.id === e.id) this.grab = null;
    }
    if (this.input.keys.has('ArrowLeft')) this.x = clamp(this.x - 240 * dt, 14, W - 14);
    if (this.input.keys.has('ArrowRight')) this.x = clamp(this.x + 240 * dt, 14, W - 14);
    this.climb += Math.min(260, 125 + this.t * 2) * dt;
    this.fill();
    this.score = Math.round((this.climb / 40) * 10) / 10;
    for (const b of this.beams) {
      const sy = BY - (b.wy - this.climb);
      if (Math.abs(sy - BY) < 13) {
        const c = this.gapCenter(b);
        if (Math.abs(this.x - c) > b.gap / 2 - 9) {
          this.sfx.play('hit');
          this.shake(10, 0.3);
          return this.finish(this.score);
        }
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#1e1b4b', '#0f172a');
    for (let i = 0; i < 30; i++) {
      const y = ((i * 97 + this.climb * 0.4) % 700);
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect((i * 137) % W, H - y, 2, 2);
    }
    for (const b of this.beams) {
      const sy = BY - (b.wy - this.climb);
      if (sy < -20 || sy > H + 20) continue;
      const c = this.gapCenter(b);
      const warn = sy < 130 && b.move === 0;
      g.shadowColor = '#f43f5e';
      g.shadowBlur = 14;
      g.fillStyle = warn ? '#fb7185' : '#f43f5e';
      g.fillRect(0, sy - 5, c - b.gap / 2, 10);
      g.fillRect(c + b.gap / 2, sy - 5, W - c - b.gap / 2, 10);
      g.shadowBlur = 0;
      g.fillStyle = '#fecdd3';
      g.fillRect(0, sy - 1.5, c - b.gap / 2, 3);
      g.fillRect(c + b.gap / 2, sy - 1.5, W - c - b.gap / 2, 3);
      emoji(g, '🔺', c - b.gap / 2, sy, 14);
      emoji(g, '🔺', c + b.gap / 2, sy, 14);
    }
    emoji(g, '🐝', this.x, BY, 36);
    text(g, formatNumber(this.score, 0) + ' m', W / 2, 44, { size: 34, stroke: 'rgba(0,0,0,.5)' });
    text(g, 'Arrastra a los lados', W / 2, 620, { size: 14, weight: 700, alpha: this.t < 4 ? 1 : 0.2 });
  }
}

export const create = (ctx: GameCtx) => new Abejorro(ctx);
