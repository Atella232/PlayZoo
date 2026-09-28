import { bg, emoji, formatNumber, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const LX = 34;
const RX = W - 34;
const GY = 470;

interface Spike {
  side: 0 | 1; // 0 izquierda, 1 derecha
  y: number; // y de pantalla (centro)
  h: number;
}

class Gecko extends Game {
  side: 0 | 1 = 0;
  x = LX + 14;
  jump: { from: number; to: number; t: number } | null = null;
  spikes: Spike[] = [];
  private sr;
  private nextY = 120;
  dist = 0;
  private lastH = 60;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('pinchos');
    this.nextY = -60;
    this.fill();
    this.spikes = this.spikes.filter((s) => s.y < GY - 160 || s.y > GY + 120);
  }

  private get v() {
    return Math.min(240, 110 + this.t * 2.6);
  }

  private fill() {
    while (this.nextY > -200) {
      const h = this.sr.range(46, 96);
      // siempre queda un hueco libre para poder saltar entre dos grupos de pinchos
      this.nextY -= this.lastH / 2 + h / 2 + this.sr.range(95, 150);
      this.lastH = h;
      if (this.sr.chance(0.88)) this.spikes.push({ side: this.sr.chance(0.5) ? 0 : 1, y: this.nextY, h });
    }
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    const v = this.v;
    this.dist += v * dt;
    this.score = Math.round((this.dist / 70) * 10) / 10;
    for (const s of this.spikes) s.y += v * dt;
    this.nextY += v * dt;
    this.fill();
    this.spikes = this.spikes.filter((s) => s.y < H + 100);
    if (!this.jump && (this.input.tapped() || this.input.keyDowns().length)) {
      this.jump = { from: this.side, to: (1 - this.side) as 0 | 1, t: 0 };
      this.sfx.play('jump');
    }
    if (this.jump) {
      this.jump.t += dt / 0.24;
      const k = Math.min(1, this.jump.t);
      const a = this.jump.from === 0 ? LX + 14 : RX - 14;
      const b = this.jump.to === 0 ? LX + 14 : RX - 14;
      this.x = a + (b - a) * k;
      if (k >= 1) {
        this.side = this.jump.to as 0 | 1;
        this.jump = null;
      }
    }
    // colisión: en contacto con una pared (parado o aterrizando) contra pinchos de esa pared
    const onSide = this.jump ? (this.jump.t > 0.8 ? this.jump.to : -1) : this.side;
    if (onSide >= 0) {
      for (const s of this.spikes) {
        if (s.side === onSide && Math.abs(s.y - GY) < s.h / 2 + 16) {
          this.sfx.play('hit');
          this.shake();
          return this.finish(this.score);
        }
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#365314', '#1a2e05');
    g.fillStyle = '#57534e';
    g.fillRect(0, 0, LX, H);
    g.fillRect(RX, 0, W - RX, H);
    g.fillStyle = 'rgba(255,255,255,.08)';
    for (let i = 0; i < 12; i++) {
      const y = ((i * 60 + this.dist) % 720) - 40;
      g.fillRect(0, y, LX, 6);
      g.fillRect(RX, y, W - RX, 6);
    }
    for (const s of this.spikes) {
      g.fillStyle = '#e5e7eb';
      const n = Math.max(2, Math.round(s.h / 20));
      for (let i = 0; i < n; i++) {
        const y0 = s.y - s.h / 2 + (i * s.h) / n;
        g.beginPath();
        if (s.side === 0) {
          g.moveTo(LX, y0);
          g.lineTo(LX + 26, y0 + s.h / n / 2);
          g.lineTo(LX, y0 + s.h / n);
        } else {
          g.moveTo(RX, y0);
          g.lineTo(RX - 26, y0 + s.h / n / 2);
          g.lineTo(RX, y0 + s.h / n);
        }
        g.closePath();
        g.fill();
      }
    }
    const rot = this.jump ? (this.jump.to === 1 ? -0.5 : 0.5) : this.side === 0 ? 0.3 : -0.3;
    emoji(g, '🦎', this.x, GY, 44, rot + (this.side === 0 ? Math.PI / 2 : -Math.PI / 2) * 0);
    text(g, formatNumber(this.score, 1) + ' m', W / 2, 44, { size: 32, stroke: 'rgba(0,0,0,.5)' });
  }
}

export const create = (ctx: GameCtx) => new Gecko(ctx);
