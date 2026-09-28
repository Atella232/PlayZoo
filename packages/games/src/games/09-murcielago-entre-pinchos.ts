import { bg, emoji, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const WALL = 30;
const TOP = 60;
const BOT = 600;

interface Spike {
  y: number;
  h: number;
}

class Murcielago extends Game {
  x = W / 2;
  y = 300;
  vy = 0;
  dir: 1 | -1 = 1;
  spikes: { side: 0 | 1; list: Spike[] } = { side: 1, list: [] };
  private sr;
  count = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('pinchos');
    this.makeSpikes(1);
  }

  private makeSpikes(side: 0 | 1) {
    const n = Math.min(4, 1 + Math.floor(this.count / 7));
    const list: Spike[] = [];
    let guard = 0;
    while (list.length < n && guard++ < 50) {
      const y = this.sr.range(TOP + 40, BOT - 40);
      if (list.every((s) => Math.abs(s.y - y) > 130)) list.push({ y, h: 44 });
    }
    this.spikes = { side, list };
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.count);
    if (this.input.tapped() || this.input.keyDowns().length) {
      this.vy = -320;
      this.sfx.play('jump');
    }
    this.vy += 1000 * dt;
    this.y += this.vy * dt;
    const sp = Math.min(290, 180 + this.count * 3);
    this.x += this.dir * sp * dt;
    if (this.y < TOP || this.y > BOT) {
      this.sfx.play('hit');
      this.shake();
      return this.finish(this.count);
    }
    const hitWall = this.dir > 0 ? this.x >= W - WALL - 16 : this.x <= WALL + 16;
    if (hitWall) {
      const side = this.dir > 0 ? 1 : 0;
      if (this.spikes.side === side && this.spikes.list.some((s) => Math.abs(s.y - this.y) < s.h / 2 + 12)) {
        this.sfx.play('hit');
        this.shake();
        return this.finish(this.count);
      }
      this.x = this.dir > 0 ? W - WALL - 16 : WALL + 16;
      this.dir = (-this.dir) as 1 | -1;
      this.count++;
      this.score = this.count;
      this.sfx.play('coin');
      this.makeSpikes(this.dir > 0 ? 1 : 0);
    }
  }

  protected draw(g: G2) {
    bg(g, '#1e1b4b', '#0f172a');
    g.fillStyle = '#334155';
    g.fillRect(0, 0, WALL, H);
    g.fillRect(W - WALL, 0, WALL, H);
    g.fillStyle = '#7f1d1d';
    g.fillRect(0, 0, W, TOP - 10);
    g.fillRect(0, BOT + 14, W, H - BOT);
    for (const s of this.spikes.list) {
      g.fillStyle = '#f87171';
      const n = 3;
      for (let i = 0; i < n; i++) {
        const y0 = s.y - s.h / 2 + (i * s.h) / n;
        g.beginPath();
        if (this.spikes.side === 0) {
          g.moveTo(WALL, y0);
          g.lineTo(WALL + 28, y0 + s.h / n / 2);
          g.lineTo(WALL, y0 + s.h / n);
        } else {
          g.moveTo(W - WALL, y0);
          g.lineTo(W - WALL - 28, y0 + s.h / n / 2);
          g.lineTo(W - WALL, y0 + s.h / n);
        }
        g.closePath();
        g.fill();
      }
    }
    emoji(g, '🦇', this.x, this.y, 40, this.vy * 0.0005, this.dir < 0);
    text(g, String(this.count), W / 2, 30, { size: 40, stroke: 'rgba(0,0,0,.5)' });
  }
}

export const create = (ctx: GameCtx) => new Murcielago(ctx);
