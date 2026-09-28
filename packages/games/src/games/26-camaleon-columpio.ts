import { bg, circle, emoji, formatNumber, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

interface Anchor {
  x: number;
  y: number;
}

class Camaleon extends Game {
  private ar;
  anchors: Anchor[] = [];
  x = 60;
  y = 260;
  vx = 160;
  vy = 0;
  attached: { a: Anchor; len: number } | null = null;
  camX = 0;
  private nextX = 200;
  maxX = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.ar = ctx.rng.fork('columnas');
    this.fill();
  }

  private fill() {
    while (this.nextX < this.camX + 900) {
      this.anchors.push({ x: this.nextX, y: this.ar.range(70, 190) });
      this.nextX += this.ar.range(130, 210);
    }
    this.anchors = this.anchors.filter((a) => a.x > this.camX - 200);
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    const pressed = this.input.down || this.input.keys.has(' ');
    if (pressed && !this.attached) {
      let best: Anchor | null = null;
      let bd = 1e9;
      for (const a of this.anchors) {
        if (a.x < this.x + 10 || a.x > this.x + 300) continue;
        const d = Math.hypot(a.x - this.x, a.y - this.y);
        if (d < 320 && d < bd) {
          bd = d;
          best = a;
        }
      }
      if (best) {
        this.attached = { a: best, len: Math.max(90, bd) };
        this.sfx.play('pop');
      }
    } else if (!pressed && this.attached) {
      this.attached = null;
      this.vx *= 1.06;
      this.sfx.play('jump');
    }
    this.vy += 1050 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.attached) {
      const { a, len } = this.attached;
      let dx = this.x - a.x;
      let dy = this.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > len) {
        dx /= d;
        dy /= d;
        this.x = a.x + dx * len;
        this.y = a.y + dy * len;
        const vr = this.vx * dx + this.vy * dy;
        if (vr > 0) {
          this.vx -= vr * dx;
          this.vy -= vr * dy;
        }
      }
    } else this.vx *= 1 - 0.05 * dt;
    if (this.x < this.camX + 30) {
      this.x = this.camX + 30;
      this.vx = Math.max(this.vx, 40);
    }
    this.camX += (this.x - 110 - this.camX) * Math.min(1, 6 * dt);
    this.fill();
    this.maxX = Math.max(this.maxX, this.x);
    this.score = Math.floor((this.maxX - 60) / 8);
    if (this.y > H + 30) {
      this.sfx.play('lose');
      this.finish(this.score);
    }
  }

  protected draw(g: G2) {
    bg(g, '#14532d', '#052e16');
    for (let i = 0; i < 10; i++) {
      const px = (((i * 190 - this.camX * 0.4) % (W + 200)) + W + 200) % (W + 200) - 60;
      emoji(g, '🌴', px, 560, 90, 0, false, 0.5);
    }
    const sx = (x: number) => x - this.camX;
    for (const a of this.anchors) {
      g.fillStyle = '#78350f';
      g.fillRect(sx(a.x) - 5, 0, 10, a.y);
      circle(g, sx(a.x), a.y, 9, '#a16207', '#451a03', 3);
    }
    if (this.attached) {
      g.strokeStyle = '#f472b6';
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(sx(this.attached.a.x), this.attached.a.y);
      g.lineTo(sx(this.x), this.y);
      g.stroke();
    }
    emoji(g, '🦎', sx(this.x), this.y, 40, Math.atan2(this.vy, Math.max(60, this.vx)) * 0.5);
    text(g, formatNumber(this.score, 0), W / 2, 44, { size: 40, stroke: 'rgba(0,0,0,.4)' });
    if (this.t < 5) text(g, 'Mantén pulsado para colgarte', W / 2, 620, { size: 14, weight: 700 });
  }
}

export const create = (ctx: GameCtx) => new Camaleon(ctx);
