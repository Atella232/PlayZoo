import { bg, emoji, fillRR, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

interface Plat {
  x: number;
  y: number;
  w: number;
  vx: number;
}

const G = 1500;
const JUMP = 690;

class Canguro extends Game {
  x = W / 2;
  y = 500;
  vy = -JUMP;
  plats: Plat[] = [];
  camY = 0; // altura acumulada
  private pr;
  private topY = 560;
  private grab: { id: number; fx: number; kx: number } | null = null;
  private face = 1;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.pr = ctx.rng.fork('plataformas');
    this.plats.push({ x: W / 2 - 45, y: 560, w: 90, vx: 0 });
    this.fillPlats();
  }

  private fillPlats() {
    while (this.topY > -150) {
      const h = this.camY + 560 - this.topY;
      const gap = this.pr.range(65, Math.min(122, 88 + h / 90));
      this.topY -= gap;
      const w = Math.max(48, 86 - h / 160);
      const moving = h > 1200 && this.pr.chance(0.25);
      this.plats.push({ x: this.pr.range(0, W - w), y: this.topY, w, vx: moving ? this.pr.sign() * this.pr.range(40, 90) : 0 });
    }
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    for (const e of this.input.events) {
      if (e.type === 'down') this.grab = { id: e.id, fx: e.x, kx: this.x };
      else if (e.type === 'move' && this.grab?.id === e.id) {
        const nx = this.grab.kx + (e.x - this.grab.fx);
        this.face = nx > this.x ? 1 : nx < this.x ? -1 : this.face;
        this.x = nx;
      } else if (e.type === 'up' && this.grab?.id === e.id) this.grab = null;
    }
    if (this.input.keys.has('ArrowLeft')) this.x -= 260 * dt;
    if (this.input.keys.has('ArrowRight')) this.x += 260 * dt;
    if (this.x < -10) this.x = W + 10;
    if (this.x > W + 10) this.x = -10;
    const py = this.y;
    this.vy += G * dt;
    this.y += this.vy * dt;
    for (const p of this.plats) {
      if (p.vx) {
        p.x += p.vx * dt;
        if (p.x < 0 || p.x + p.w > W) p.vx *= -1;
      }
      if (this.vy > 0 && py + 22 <= p.y && this.y + 22 >= p.y && this.x > p.x - 8 && this.x < p.x + p.w + 8) {
        this.vy = -JUMP;
        this.sfx.play('jump');
      }
    }
    if (this.y < 280) {
      const d = 280 - this.y;
      this.y = 280;
      this.camY += d;
      for (const p of this.plats) p.y += d;
      this.topY += d;
    }
    this.plats = this.plats.filter((p) => p.y < H + 30);
    this.fillPlats();
    this.score = Math.max(this.score, Math.floor((this.camY + (500 - this.y)) / 20) - 0);
    if (this.y > H + 40) {
      this.sfx.play('lose');
      this.finish(this.score);
    }
  }

  protected draw(g: G2) {
    bg(g, '#7dd3fc', '#fef3c7');
    for (let i = 0; i < 4; i++) emoji(g, '☁️', ((i * 130 + 40) % 340) + 10, ((i * 190 + this.camY * 0.3) % 700) - 30, 50, 0, false, 0.7);
    for (const p of this.plats) fillRR(g, { x: p.x, y: p.y, w: p.w, h: 12 }, 6, p.vx ? '#f97316' : '#16a34a');
    const squash = this.vy < 0 ? 1.08 : 0.95;
    g.save();
    g.translate(this.x, this.y);
    g.scale(this.face * 1, squash);
    emoji(g, '🦘', 0, 0, 52, 0, this.face < 0);
    g.restore();
    text(g, String(this.score), W / 2, 60, { size: 54, stroke: 'rgba(0,0,0,.3)' });
  }
}

export const create = (ctx: GameCtx) => new Canguro(ctx);
