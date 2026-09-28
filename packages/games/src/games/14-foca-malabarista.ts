import { bg, circle, emoji, fillRR, text, W, H, clamp, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const PAD_Y = 520;
const PAD_W = 96;
const BR = 13;

class Foca extends Game {
  padX = W / 2;
  bx: number;
  by = 250;
  vx: number;
  vy = 0;
  private grab: { id: number; fx: number; px: number } | null = null;
  started = false;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.bx = ctx.rng.range(120, 240);
    this.vx = ctx.rng.range(-60, 60);
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    for (const e of this.input.events) {
      if (e.type === 'down') {
        this.grab = { id: e.id, fx: e.x, px: this.padX };
        this.started = true;
      } else if (e.type === 'move' && this.grab?.id === e.id) this.padX = clamp(this.grab.px + (e.x - this.grab.fx), PAD_W / 2, W - PAD_W / 2);
      else if (e.type === 'up' && this.grab?.id === e.id) this.grab = null;
    }
    if (this.input.keys.has('ArrowLeft')) this.padX = clamp(this.padX - 300 * dt, PAD_W / 2, W - PAD_W / 2);
    if (this.input.keys.has('ArrowRight')) this.padX = clamp(this.padX + 300 * dt, PAD_W / 2, W - PAD_W / 2);
    if (!this.started && !this.input.keys.size) return;
    this.started = true;
    this.vy += 900 * dt;
    const py = this.by;
    this.bx += this.vx * dt;
    this.by += this.vy * dt;
    if (this.bx < BR) {
      this.bx = BR;
      this.vx = Math.abs(this.vx);
    }
    if (this.bx > W - BR) {
      this.bx = W - BR;
      this.vx = -Math.abs(this.vx);
    }
    if (this.by < BR + 60) {
      this.by = BR + 60;
      this.vy = Math.abs(this.vy) * 0.5;
    }
    if (this.vy > 0 && py + BR <= PAD_Y && this.by + BR >= PAD_Y && Math.abs(this.bx - this.padX) < PAD_W / 2 + BR * 0.6) {
      this.vy = -Math.min(760, 560 + this.score * 6);
      this.vx = clamp(this.vx * 0.4 + (this.bx - this.padX) * 6, -240, 240);
      this.score++;
      this.sfx.play('pop', 1 + Math.min(this.score, 30) * 0.01);
      this.sparks.burst(this.bx, PAD_Y, '#fef08a', 5, 90);
    }
    if (this.by > H + 30) {
      this.sfx.play('lose');
      this.finish(this.score);
    }
  }

  protected draw(g: G2) {
    bg(g, '#0e7490', '#164e63');
    for (let i = 0; i < 5; i++) fillRR(g, { x: 0, y: 600 + i * 12, w: W, h: 8 }, 4, `rgba(255,255,255,${0.12 - i * 0.02})`);
    emoji(g, '🦭', this.padX, PAD_Y + 26, 62);
    fillRR(g, { x: this.padX - PAD_W / 2, y: PAD_Y - 6, w: PAD_W, h: 10 }, 5, '#fef3c7');
    circle(g, this.bx, this.by, BR, '#ef4444', '#fff', 3);
    circle(g, this.bx - 4, this.by - 4, 3, 'rgba(255,255,255,.7)');
    text(g, String(this.score), W / 2, 62, { size: 60, stroke: 'rgba(0,0,0,.35)' });
    if (!this.started) text(g, 'Mantén pulsado y arrastra', W / 2, 610, { size: 18, stroke: 'rgba(0,0,0,.4)' });
  }
}

export const create = (ctx: GameCtx) => new Foca(ctx);
