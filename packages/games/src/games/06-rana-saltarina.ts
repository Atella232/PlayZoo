import { bg, circle, emoji, text, W, clamp, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const PY = 450;
const MAXD = 300;
const JT = 0.55;

interface Pad {
  x: number;
  r: number;
}

class Rana extends Game {
  private pr;
  pads: Pad[] = [];
  cur = 0;
  camX = 0;
  charge = 0;
  charging = false;
  jump: { x0: number; d: number; t: number } | null = null;
  points = 0;
  combo = 0;
  fx = 0;
  private falling = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.pr = ctx.rng.fork('nenufares');
    this.pads.push({ x: 90, r: 46 });
    this.addPad();
    this.addPad();
    this.fx = 90;
    this.camX = 0;
  }

  private addPad() {
    const last = this.pads[this.pads.length - 1];
    const n = this.pads.length;
    this.pads.push({ x: last.x + this.pr.range(110, 245), r: Math.max(24, 42 - n * 0.3) });
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.points);
    if (this.falling > 0) {
      this.falling += dt;
      if (this.falling > 0.7) this.finish(this.points);
      return;
    }
    const pressed = this.input.down || this.input.keys.has(' ');
    if (!this.jump) {
      if (pressed) {
        this.charging = true;
        this.charge = clamp(this.charge + dt * 1.15, 0, 1);
      } else if (this.charging) {
        this.charging = false;
        if (this.charge > 0.04) {
          this.jump = { x0: this.pads[this.cur].x, d: this.charge * MAXD, t: 0 };
          this.sfx.play('jump');
        }
        this.charge = 0;
      }
    } else {
      this.jump.t += dt / JT;
      this.fx = this.jump.x0 + this.jump.d * Math.min(1, this.jump.t);
      if (this.jump.t >= 1) {
        const lx = this.jump.x0 + this.jump.d;
        this.jump = null;
        const idx = this.pads.findIndex((p, i) => Math.abs(lx - p.x) <= p.r + 2 && i >= this.cur);
        if (idx < 0) {
          this.falling = 0.001;
          this.sfx.play('lose');
        } else if (idx === this.cur) {
          this.fx = this.pads[this.cur].x;
        } else {
          const p = this.pads[idx];
          const perfect = Math.abs(lx - p.x) < 9;
          let pts = 10 * (idx - this.cur);
          if (perfect) {
            this.combo++;
            pts += 5 + Math.min(this.combo, 5) * 2;
            this.popups.add(`¡Perfecto! +${pts}`, W / 2, 330, '#86efac', 22);
            this.sfx.play('win');
          } else {
            this.combo = 0;
            this.popups.add(`+${pts}`, W / 2, 330, '#fde047', 22);
            this.sfx.play('ok');
          }
          this.points += pts;
          this.cur = idx;
          this.fx = p.x;
          while (this.pads.length < this.cur + 5) this.addPad();
        }
      }
    }
    this.camX += (this.pads[this.cur].x - 100 - this.camX) * Math.min(1, 4 * dt);
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#7dd3fc', '#0e7490');
    g.fillStyle = '#0c4a6e';
    g.fillRect(0, PY + 18, W, 300);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = 'rgba(255,255,255,.12)';
      g.fillRect(((i * 70 - this.camX * 0.5) % (W + 60) + W + 60) % (W + 60) - 30, PY + 40 + (i % 3) * 40, 40, 4);
    }
    const sx = (x: number) => x - this.camX;
    this.pads.forEach((p, i) => {
      if (sx(p.x) < -60 || sx(p.x) > W + 60) return;
      g.beginPath();
      g.ellipse(sx(p.x), PY + 20, p.r, p.r * 0.32, 0, 0, Math.PI * 2);
      g.fillStyle = i === this.cur ? '#22c55e' : '#16a34a';
      g.fill();
      g.strokeStyle = '#14532d';
      g.lineWidth = 3;
      g.stroke();
      if (i === this.cur + 1) {
        g.setLineDash([4, 5]);
        g.strokeStyle = 'rgba(255,255,255,.7)';
        g.beginPath();
        g.arc(sx(p.x), PY + 20, p.r + 6, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
      }
    });
    // trayectoria marcada
    if (this.charging && !this.jump) {
      const d = this.charge * MAXD;
      const x0 = this.pads[this.cur].x;
      for (let k = 1; k <= 14; k++) {
        const t = k / 14;
        circle(g, sx(x0 + d * t), PY - 4 * (40 + d * 0.3) * t * (1 - t) + 4, 3.5, 'rgba(255,255,255,.85)');
      }
    }
    let fy = PY;
    if (this.jump) fy = PY - 4 * (40 + this.jump.d * 0.3) * this.jump.t * (1 - this.jump.t);
    if (this.falling > 0) fy = PY + this.falling * 260;
    const squash = this.charging ? 1 - this.charge * 0.25 : 1;
    g.save();
    g.translate(sx(this.fx), fy);
    g.scale(1, squash);
    emoji(g, '🐸', 0, 0, 44);
    g.restore();
    text(g, String(this.points), W / 2, 60, { size: 52, stroke: 'rgba(0,0,0,.35)' });
    if (this.charging) {
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(W / 2 - 80, 100, 160, 10);
      g.fillStyle = '#fde047';
      g.fillRect(W / 2 - 80, 100, 160 * this.charge, 10);
    } else text(g, 'Mantén pulsado para saltar', W / 2, 610, { size: 14, weight: 700, alpha: this.t < 5 ? 1 : 0.2 });
  }
}

export const create = (ctx: GameCtx) => new Rana(ctx);
