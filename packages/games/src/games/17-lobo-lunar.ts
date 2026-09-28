import { bg, circle, emoji, formatNumber, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const X0 = 60;
const GRAV = 900;
const CLOCK = 26;

const ground = (x: number) => 430 + 0.03 * x + 40 * Math.sin(x / 105) + 24 * Math.sin(x / 52 + 1.3);
const slope = (x: number) => (ground(x + 1) - ground(x - 1)) / 2;

const tri = (t: number) => {
  const m = t % 2;
  return m < 1 ? m : 2 - m;
};

class Lobo extends Game {
  phase: 'aim' | 'fly' = 'aim';
  angle = 0.5;
  x = X0;
  y = ground(X0) - 16;
  vx = 0;
  vy = 0;
  clock = CLOCK;
  frozen = false;
  perfect = false;
  camX = 0;
  maxX = X0;
  private slow = 0;
  private aimT = 0;
  private lastLandT = 0;
  grounded = false;

  protected step(dt: number) {
    if (this.phase === 'aim') {
      this.aimT += dt;
      this.angle = ((12 + 66 * tri(this.aimT * 0.9)) * Math.PI) / 180;
      if (this.input.tapped() || this.input.keyDowns().length) {
        const deg = (this.angle * 180) / Math.PI;
        this.perfect = Math.abs(deg - 45) < 4;
        const v = this.perfect ? 700 : 540;
        this.vx = Math.cos(this.angle) * v;
        this.vy = -Math.sin(this.angle) * v;
        this.phase = 'fly';
        this.frozen = this.perfect;
        if (this.perfect) {
          this.popups.add('¡Perfecto! El reloj se congela', W / 2, 300, '#86efac', 20);
          this.sfx.play('win');
        } else this.sfx.play('jump');
      }
      return;
    }
    if (!this.frozen) this.clock -= dt;
    if (this.clock <= 0) return this.finish(this.score);
    const hold = this.input.down || this.input.keys.has(' ');
    this.vy += (hold && !this.grounded ? GRAV * 2.6 : GRAV) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const gy = ground(this.x) - 16;
    this.grounded = false;
    if (this.y >= gy) {
      this.y = gy;
      const sl = slope(this.x);
      const tl = Math.hypot(1, sl);
      const tx = 1 / tl;
      const ty = sl / tl;
      const vt = this.vx * tx + this.vy * ty;
      if (this.frozen) {
        this.frozen = false;
        this.lastLandT = this.t;
      }
      this.vx = vt * tx;
      this.vy = vt * ty;
      this.grounded = true;
      const k = 1 - 0.55 * dt;
      this.vx *= k;
      this.vy *= k;
      if (hold && sl > 0.05) {
        this.vx += tx * 140 * dt;
        this.vy += ty * 140 * dt;
      }
      if (this.vx < 30) this.slow += dt;
      else this.slow = 0;
      if (this.slow > 0.9) return this.finish(this.score);
    }
    if (this.x < this.maxX - 40 && this.vx < 0) this.vx = 0;
    this.maxX = Math.max(this.maxX, this.x);
    this.score = Math.round(((this.maxX - X0) / 10) * 100) / 100;
    this.camX += (this.x - 120 - this.camX) * Math.min(1, 8 * dt);
  }

  protected draw(g: G2) {
    bg(g, '#0b1026', '#312e81');
    circle(g, 290, 110, 42, '#fef9c3');
    circle(g, 278, 100, 42, '#0b1026');
    for (let i = 0; i < 30; i++) {
      g.fillStyle = 'rgba(255,255,255,.6)';
      g.fillRect((i * 83) % W, (i * 41) % 300, 2, 2);
    }
    // montañas
    g.beginPath();
    g.moveTo(0, H);
    for (let sx = 0; sx <= W + 6; sx += 6) g.lineTo(sx, ground(sx + this.camX));
    g.lineTo(W, H);
    g.closePath();
    g.fillStyle = '#1e293b';
    g.fill();
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 4;
    g.beginPath();
    for (let sx = 0; sx <= W + 6; sx += 6) (sx ? g.lineTo(sx, ground(sx + this.camX)) : g.moveTo(sx, ground(sx + this.camX)));
    g.stroke();
    const sx = this.x - this.camX;
    emoji(g, '🐺', sx, this.y, 40, Math.atan2(this.vy, Math.max(80, this.vx)) * 0.6);
    text(g, formatNumber(this.score, 2) + ' m', W / 2, 40, { size: 32, stroke: 'rgba(0,0,0,.5)' });
    if (this.phase === 'aim') {
      const dx = Math.cos(this.angle) * 90;
      const dy = -Math.sin(this.angle) * 90;
      g.strokeStyle = '#fde047';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(sx, this.y);
      g.lineTo(sx + dx, this.y + dy);
      g.stroke();
      g.strokeStyle = 'rgba(134,239,172,.9)';
      g.lineWidth = 2;
      g.setLineDash([4, 6]);
      g.beginPath();
      g.moveTo(sx, this.y);
      g.lineTo(sx + Math.cos(Math.PI / 4) * 110, this.y - Math.sin(Math.PI / 4) * 110);
      g.stroke();
      g.setLineDash([]);
      text(g, 'Toca para fijar el ángulo (¡45° es perfecto!)', W / 2, 600, { size: 14, weight: 700 });
    } else {
      g.fillStyle = 'rgba(255,255,255,.2)';
      g.fillRect(W / 2 - 80, 68, 160, 8);
      g.fillStyle = this.frozen ? '#67e8f9' : '#fde047';
      g.fillRect(W / 2 - 80, 68, (160 * this.clock) / CLOCK, 8);
      if (this.t < 8) text(g, 'Mantén pulsado en las bajadas', W / 2, 620, { size: 14, weight: 700, alpha: 0.7 });
    }
  }
}

export const create = (ctx: GameCtx) => new Lobo(ctx);
