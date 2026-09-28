import { bg, circle, emoji, text, W, H, clamp, dist, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

interface Ast {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rot: number;
  counted: boolean;
}

class Libelula extends Game {
  x = W / 2;
  y = 500;
  asts: Ast[] = [];
  private sr;
  private spawnIn = 0.6;
  private grab: { id: number; fx: number; fy: number; bx: number; by: number } | null = null;
  passed = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('asteroides');
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.passed);
    for (const e of this.input.events) {
      if (e.type === 'down') this.grab = { id: e.id, fx: e.x, fy: e.y, bx: this.x, by: this.y };
      else if (e.type === 'move' && this.grab?.id === e.id) {
        this.x = clamp(this.grab.bx + (e.x - this.grab.fx), 14, W - 14);
        this.y = clamp(this.grab.by + (e.y - this.grab.fy), 300, 610);
      } else if (e.type === 'up' && this.grab?.id === e.id) this.grab = null;
    }
    const k = this.input.keys;
    if (k.has('ArrowLeft')) this.x = clamp(this.x - 260 * dt, 14, W - 14);
    if (k.has('ArrowRight')) this.x = clamp(this.x + 260 * dt, 14, W - 14);
    if (k.has('ArrowUp')) this.y = clamp(this.y - 260 * dt, 300, 610);
    if (k.has('ArrowDown')) this.y = clamp(this.y + 260 * dt, 300, 610);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const r = this.sr.range(16, 34);
      this.asts.push({ x: this.sr.range(r, W - r), y: -r, r, vx: this.sr.chance(0.35) ? this.sr.range(-50, 50) : 0, vy: 170 + Math.min(200, this.t * 3.5) * this.sr.range(0.8, 1.2), rot: 0, counted: false });
      this.spawnIn = Math.max(0.3, 0.85 - this.t * 0.01);
    }
    for (const a of this.asts) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += dt;
      if (!a.counted && a.y - a.r > this.y + 20) {
        a.counted = true;
        this.passed++;
        this.score = this.passed;
        this.sfx.play('tick', 1 + Math.min(this.passed, 40) * 0.01);
      }
      if (dist(a.x, a.y, this.x, this.y) < a.r * 0.85 + 9) {
        this.sfx.play('hit');
        this.shake(10, 0.3);
        return this.finish(this.passed);
      }
    }
    this.asts = this.asts.filter((a) => a.y < H + 60);
  }

  protected draw(g: G2) {
    bg(g, '#0b1026', '#312e81');
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.fillRect((i * 79) % W, (i * 131 + this.t * 60 * (1 + (i % 3))) % H, 2, 2);
    }
    for (const a of this.asts) {
      circle(g, a.x, a.y, a.r, '#78716c', '#44403c', 3);
      circle(g, a.x - a.r * 0.3, a.y - a.r * 0.2, a.r * 0.25, '#57534e');
      circle(g, a.x + a.r * 0.3, a.y + a.r * 0.35, a.r * 0.18, '#57534e');
    }
    emoji(g, '🪰', this.x, this.y, 34, 0);
    text(g, String(this.passed), W / 2, 50, { size: 50, stroke: 'rgba(0,0,0,.5)' });
    text(g, 'Arrastra para guiar la libélula', W / 2, 620, { size: 14, weight: 700, alpha: this.t < 4 ? 1 : 0.2 });
  }
}

export const create = (ctx: GameCtx) => new Libelula(ctx);
