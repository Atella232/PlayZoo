import { bg, circle, emoji, formatNumber, text, W, clamp, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const L = 150;
const BASE_Y = 520;
const G = 1000;

class Flamenco extends Game {
  theta: number;
  omega = 0;
  xb = W / 2;
  private vb = 0;
  private target = W / 2;
  private ph1: number;
  private ph2: number;
  private grab: { id: number } | null = null;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.theta = ctx.rng.range(-0.05, 0.05);
    this.ph1 = ctx.rng.range(0, 6.28);
    this.ph2 = ctx.rng.range(0, 6.28);
  }

  protected step(dt: number) {
    if (this.t >= 120) return this.finish(this.t);
    for (const e of this.input.events) {
      if (e.type === 'down') {
        this.grab = { id: e.id };
        this.target = e.x;
      } else if (e.type === 'move' && this.grab?.id === e.id) this.target = e.x;
      else if (e.type === 'up' && this.grab?.id === e.id) this.grab = null;
    }
    if (this.input.keys.has('ArrowLeft')) this.target -= 700 * dt;
    if (this.input.keys.has('ArrowRight')) this.target += 700 * dt;
    this.target = clamp(this.target, 24, W - 24);
    const prevX = this.xb;
    this.xb += (this.target - this.xb) * Math.min(1, 16 * dt);
    const vb = (this.xb - prevX) / dt;
    const ab = clamp((vb - this.vb) / dt, -7000, 7000);
    this.vb = vb;
    const A = 0.7 + 0.055 * this.t;
    const wind = A * (Math.sin(2.1 * this.t + this.ph1) + 0.6 * Math.sin(3.7 * this.t + this.ph2));
    const acc = (G / L) * Math.sin(this.theta) - (ab / L) * Math.cos(this.theta) + wind - 0.5 * this.omega;
    this.omega += acc * dt;
    this.theta += this.omega * dt;
    this.score = Math.round(this.t * 100) / 100;
    if (Math.abs(this.theta) > 0.95) {
      this.sfx.play('lose');
      this.finish(this.t);
    }
  }

  protected draw(g: G2) {
    bg(g, '#831843', '#3b0764');
    emoji(g, '🦩', W / 2, 110, 80);
    const tx = this.xb + Math.sin(this.theta) * L;
    const ty = BASE_Y - Math.cos(this.theta) * L;
    g.strokeStyle = '#e5e7eb';
    g.lineWidth = 8;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(this.xb, BASE_Y);
    g.lineTo(tx, ty);
    g.stroke();
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(this.xb, BASE_Y);
    g.lineTo(tx, ty);
    g.stroke();
    emoji(g, '🗡️', tx, ty, 34, this.theta + Math.PI * 0.25 * 0);
    circle(g, this.xb, BASE_Y, 14, '#fde68a', '#f59e0b', 3);
    // indicador de inclinación
    g.fillStyle = 'rgba(255,255,255,.15)';
    g.fillRect(W / 2 - 100, 610, 200, 8);
    g.fillStyle = Math.abs(this.theta) > 0.6 ? '#ef4444' : '#22c55e';
    g.fillRect(W / 2 + clamp(this.theta / 0.95, -1, 1) * 100 - 4, 604, 8, 20);
    text(g, formatNumber(this.score, 2) + ' s', W / 2, 200, { size: 44, stroke: 'rgba(0,0,0,.4)' });
    if (this.t < 5) text(g, 'Mueve el dedo bajo la espada', W / 2, 250, { size: 16, weight: 700 });
  }
}

export const create = (ctx: GameCtx) => new Flamenco(ctx);
