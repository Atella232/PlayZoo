import { bg, circle, emoji, lives, text, W, H, clamp, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const PX = W / 2;
const PY = 300;
const BEAM = 260; // longitud del haz (centrado en el pivote)
const FLOWERS = [
  { x: 55, c: '#f472b6', sym: '●' },
  { x: 180, c: '#facc15', sym: '▲' },
  { x: 305, c: '#38bdf8', sym: '■' },
];
const FY = 590;

interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: number;
  guided: boolean;
  ph: number;
}

class Luciernagas extends Game {
  private fr;
  flies: Fly[] = [];
  angle = Math.PI / 2;
  lifes = 3;
  points = 0;
  private spawnIn = 0.6;
  private grab = false;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.fr = ctx.rng.fork('luciernagas');
  }

  protected step(dt: number) {
    if (this.t >= 60 || this.lifes <= 0) return this.finish(this.points);
    for (const e of this.input.events) {
      if (e.type === 'down' || (e.type === 'move' && this.grab)) {
        this.grab = true;
        this.angle = clamp(Math.atan2(Math.max(20, e.y - PY), e.x - PX), 0.35, Math.PI - 0.35);
      } else if (e.type === 'up') this.grab = false;
    }
    if (this.input.keys.has('ArrowLeft')) this.angle = clamp(this.angle + 2 * dt, 0.35, Math.PI - 0.35);
    if (this.input.keys.has('ArrowRight')) this.angle = clamp(this.angle - 2 * dt, 0.35, Math.PI - 0.35);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      // todas las luciérnagas convergen en la linterna; llegan espaciadas para poder reorientar el haz
      const x = this.fr.range(30, W - 30);
      const dur = Math.max(0.95, 1.8 - this.t * 0.014);
      const dx = PX - x;
      const dy = PY + 10;
      this.flies.push({ x, y: -10, vx: dx / dur, vy: dy / dur, kind: this.fr.int(0, 2), guided: false, ph: 0 });
      this.spawnIn = Math.max(0.42, 1.05 - this.t * 0.011);
    }
    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);
    for (const f of this.flies) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (!f.guided && Math.hypot(f.x - PX, f.y - PY) < 16) {
        f.guided = true;
        f.x = PX;
        f.y = PY;
        f.vx = ca * 270;
        f.vy = sa * 270;
        this.sfx.play('tick');
      }
    }
    for (const f of this.flies) {
      // llegada a una flor
      if (f.y >= FY - 30) {
        const fl = FLOWERS.reduce((b, c, i) => (Math.abs(c.x - f.x) < Math.abs(FLOWERS[b].x - f.x) ? i : b), 0);
        if (Math.abs(FLOWERS[fl].x - f.x) < 42) {
          if (fl === f.kind) {
            this.points++;
            this.score = this.points;
            this.sfx.play('coin');
            this.popups.add('+1', FLOWERS[fl].x, FY - 40, '#fde047');
            this.sparks.burst(FLOWERS[fl].x, FY - 20, FLOWERS[fl].c, 8, 110);
          } else {
            this.lifes--;
            this.sfx.play('bad');
            this.shake(5, 0.15);
          }
          f.y = H + 100;
        } else if (f.y > FY + 20) {
          this.lifes--;
          this.sfx.play('bad');
          f.y = H + 100;
        }
      }
      if (f.x < -30 || f.x > W + 30) {
        this.lifes--;
        f.y = H + 100;
      }
    }
    this.flies = this.flies.filter((f) => f.y < H + 60);
  }

  protected draw(g: G2) {
    bg(g, '#0b1026', '#1e1b4b');
    circle(g, 60, 90, 34, '#fef9c3');
    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);
    const x1 = PX + ca * BEAM;
    const y1 = PY + sa * BEAM;
    g.strokeStyle = 'rgba(254,249,195,.3)';
    g.lineWidth = 30;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(PX, PY);
    g.lineTo(x1, y1);
    g.stroke();
    g.strokeStyle = 'rgba(254,249,195,.9)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(PX, PY);
    g.lineTo(x1, y1);
    g.stroke();
    g.setLineDash([4, 8]);
    g.strokeStyle = 'rgba(254,249,195,.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(PX + (ca / sa) * (FY - PY), FY);
    g.stroke();
    g.setLineDash([]);
    g.shadowColor = '#fef9c3';
    g.shadowBlur = 24;
    circle(g, PX, PY, 14, '#fef9c3');
    g.shadowBlur = 0;
    FLOWERS.forEach((f) => {
      emoji(g, '🌸', f.x, FY, 44);
      circle(g, f.x, FY + 34, 14, f.c);
      text(g, f.sym, f.x, FY + 35, { size: 14, color: '#0f172a' });
    });
    for (const f of this.flies) {
      const c = FLOWERS[f.kind].c;
      g.shadowColor = c;
      g.shadowBlur = 16;
      circle(g, f.x, f.y, 9, c);
      g.shadowBlur = 0;
      text(g, FLOWERS[f.kind].sym, f.x, f.y + 1, { size: 10, color: '#0f172a' });
    }
    text(g, String(this.points), W / 2, 44, { size: 44, stroke: 'rgba(0,0,0,.5)' });
    lives(g, this.lifes, 3, W - 14, 30);
    text(g, 'Toca la flor o arrastra para orientar el haz', W / 2, 20, { size: 11, weight: 700, alpha: this.t < 6 ? 0.9 : 0 });
  }
}

export const create = (ctx: GameCtx) => new Luciernagas(ctx);
