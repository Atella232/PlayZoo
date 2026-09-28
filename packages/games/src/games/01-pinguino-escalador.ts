import { bg, circle, emoji, formatNumber, text, W, H, clamp, wrapAngle, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const R = 50;
const OMEGA = 2.3;
const FLY = 400;
const HOP_LIMIT = 3.2;

interface Anchor {
  x: number;
  y: number;
}

class Pinguino extends Game {
  private ar;
  anchors: Anchor[] = [];
  cur = 0;
  ang: number;
  dir: 1 | -1 = 1;
  mode: 'orbit' | 'fly' = 'orbit';
  px = 0;
  py = 0;
  vx = 0;
  vy = 0;
  flown = 0;
  hopT = 0;
  perfects = 0;
  camY = 0;
  private falling = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.ar = ctx.rng.fork('piolets');
    this.anchors.push({ x: W / 2, y: 470 });
    for (let i = 0; i < 6; i++) this.addAnchor();
    this.ang = ctx.rng.range(0, Math.PI * 2);
    this.camY = 0;
    this.place();
  }

  private catchR() {
    return Math.max(24, 36 - this.cur * 0.35);
  }

  private addAnchor() {
    const l = this.anchors[this.anchors.length - 1];
    const dy = this.ar.range(115, 155);
    const x = clamp(l.x + this.ar.range(-120, 120), 70, W - 70);
    this.anchors.push({ x, y: l.y - dy });
  }

  private place() {
    const a = this.anchors[this.cur];
    this.px = a.x + Math.cos(this.ang) * R;
    this.py = a.y + Math.sin(this.ang) * R;
  }

  private get meters() {
    return (470 - this.anchors[this.cur].y) / 40 + this.perfects * 10;
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    if (this.falling > 0) {
      this.falling += dt;
      this.py += 420 * dt;
      if (this.falling > 0.6) this.finish(this.score);
      return;
    }
    if (this.mode === 'orbit') {
      this.ang += this.dir * OMEGA * dt;
      this.hopT += dt;
      this.place();
      if (this.hopT > HOP_LIMIT) {
        this.falling = 0.001;
        this.sfx.play('lose');
        return;
      }
      if (this.input.tapped() || this.input.keyDowns().length) {
        const tx = -Math.sin(this.ang) * this.dir;
        const ty = Math.cos(this.ang) * this.dir;
        this.vx = tx * FLY;
        this.vy = ty * FLY;
        this.mode = 'fly';
        this.flown = 0;
        this.sfx.play('jump');
      }
    } else {
      const nx = this.px + this.vx * dt;
      const ny = this.py + this.vy * dt;
      const n = this.anchors[this.cur + 1];
      const dPrev = Math.hypot(n.x - this.px, n.y - this.py);
      const dNow = Math.hypot(n.x - nx, n.y - ny);
      this.flown += Math.hypot(nx - this.px, ny - this.py);
      this.px = nx;
      this.py = ny;
      if (dPrev > R && dNow <= R) {
        // el pingüino entra en la órbita: ¿su trayectoria apunta a la zona verde?
        const sp = Math.hypot(this.vx, this.vy) || 1;
        const dLine = Math.abs((n.x - nx) * (this.vy / sp) - (n.y - ny) * (this.vx / sp));
        if (dLine <= this.catchR()) {
          this.cur++;
          this.ang = Math.atan2(ny - n.y, nx - n.x);
          this.dir = Math.cos(this.ang) * this.vy - Math.sin(this.ang) * this.vx >= 0 ? 1 : -1;
          this.mode = 'orbit';
          this.hopT = 0;
          this.place();
          if (dLine < 5) {
            this.perfects++;
            this.popups.add('¡Perfecto! +10 m', W / 2, 250, '#86efac', 22);
            this.sfx.play('win');
          } else this.sfx.play('ok');
          while (this.anchors.length < this.cur + 6) this.addAnchor();
          this.score = Math.round(this.meters * 10) / 10;
        }
      }
      if (this.mode === 'fly' && (this.flown > 400 || this.py > H + 50 || this.px < -30 || this.px > W + 30)) {
        this.falling = 0.001;
        this.sfx.play('lose');
      }
    }
    const target = this.anchors[this.cur].y - 470;
    this.camY += (target - this.camY) * Math.min(1, 4 * dt);
  }

  protected draw(g: G2) {
    bg(g, '#0c4a6e', '#e0f2fe');
    for (let i = 0; i < 20; i++) {
      g.fillStyle = 'rgba(255,255,255,.7)';
      g.fillRect((i * 83) % W, (((i * 117 - this.camY * 0.5) % 700) + 700) % 700, 3, 3);
    }
    g.save();
    g.translate(0, -this.camY);
    this.anchors.forEach((a, i) => {
      if (i < this.cur - 1 || i > this.cur + 5) return;
      // placa de hielo seguro (zona verde)
      g.beginPath();
      g.arc(a.x, a.y, this.catchR(), 0, Math.PI * 2);
      g.fillStyle = i === this.cur + 1 ? 'rgba(74,222,128,.55)' : 'rgba(186,230,253,.55)';
      g.fill();
      g.strokeStyle = i === this.cur + 1 ? '#22c55e' : '#7dd3fc';
      g.lineWidth = 3;
      g.stroke();
      circle(g, a.x, a.y, 6, '#475569');
      emoji(g, '⛏️', a.x, a.y, 20);
      if (i === this.cur) {
        g.setLineDash([4, 6]);
        g.strokeStyle = 'rgba(255,255,255,.6)';
        g.beginPath();
        g.arc(a.x, a.y, R, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
      }
    });
    if (this.mode === 'orbit' && this.falling === 0) {
      const a = this.anchors[this.cur];
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(this.px, this.py);
      g.stroke();
    }
    emoji(g, '🐧', this.px, this.py, 34, this.mode === 'fly' ? Math.atan2(this.vy, this.vx) + Math.PI / 2 : this.ang + Math.PI / 2 * this.dir);
    g.restore();
    text(g, formatNumber(this.score, 1) + ' m', W / 2, 44, { size: 34, stroke: 'rgba(0,0,0,.4)' });
    if (this.mode === 'orbit') text(g, 'Toca para soltarte', W / 2, 620, { size: 14, weight: 700, alpha: this.t < 5 ? 1 : 0.25, stroke: 'rgba(0,0,0,.4)' });
    void wrapAngle;
  }
}

export const create = (ctx: GameCtx) => new Pinguino(ctx);
