import { bg, emoji, formatNumber, text, W, H, clamp, wrapAngle, type G2, type GameCtx } from '../kits/prelude';
import { nearest, strokePath, type Pt } from '../kits/track';
import { pickTrack } from '../kits/tracks';
import { Game } from '../kits/base';

const HALF = 34;
const VMAX = 178;
const LAPS = 2;

class Galgos extends Game {
  pts: Pt[];
  N: number;
  x: number;
  y: number;
  ang: number;
  speed = 0;
  vx = 0;
  vy = 0;
  idx = 0;
  progress = 0;
  started = false;
  raceT = 0;
  private trail: Pt[] = [];

  constructor(ctx: GameCtx) {
    super(ctx);
    this.pts = pickTrack(ctx.rng.fork('circuito'));
    this.N = this.pts.length;
    this.x = this.pts[0].x;
    this.y = this.pts[0].y;
    const b = this.pts[3];
    this.ang = Math.atan2(b.y - this.y, b.x - this.x);
    this.vx = Math.cos(this.ang) * 0;
    this.vy = 0;
  }

  protected step(dt: number) {
    if (this.raceT >= 120) return this.finish(120);
    const pts = [...this.input.pointers.values()];
    let steer = 0;
    for (const p of pts) steer += p.x < W / 2 ? -1 : 1;
    if (this.input.keys.has('ArrowLeft')) steer -= 1;
    if (this.input.keys.has('ArrowRight')) steer += 1;
    steer = clamp(steer, -1, 1);
    this.started = true;
    this.raceT += dt;
    const near = nearest(this.pts, this.x, this.y);
    const on = near.d < HALF;
    const target = (on ? VMAX : VMAX * 0.45) * (1 - 0.22 * Math.abs(steer));
    this.speed += (target - this.speed) * Math.min(1, (this.speed < target ? 2.2 : 3.5) * dt);
    this.ang += steer * 2.7 * dt * (0.5 + 0.5 * Math.min(1, this.speed / VMAX));
    const dvx = Math.cos(this.ang) * this.speed;
    const dvy = Math.sin(this.ang) * this.speed;
    const grip = Math.min(1, 7 * dt);
    this.vx += (dvx - this.vx) * grip;
    this.vy += (dvy - this.vy) * grip;
    this.x = clamp(this.x + this.vx * dt, 8, W - 8);
    this.y = clamp(this.y + this.vy * dt, 8, H - 8);
    if (this.tick % 3 === 0) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 10) this.trail.shift();
    }
    const n2 = nearest(this.pts, this.x, this.y);
    let d = n2.i - this.idx;
    if (d > this.N / 2) d -= this.N;
    if (d < -this.N / 2) d += this.N;
    if (Math.abs(d) <= 30) {
      this.progress += d;
      this.idx = n2.i;
    }
    if (this.progress < 0) this.progress = 0;
    if (this.progress >= LAPS * this.N - 2) {
      this.sfx.play('win');
      this.finish(Math.round(this.raceT * 100) / 100);
    }
  }

  protected draw(g: G2) {
    bg(g, '#4d7c0f', '#365314');
    strokePath(g, this.pts, HALF * 2 + 16, '#d6d3d1');
    strokePath(g, this.pts, HALF * 2, '#57534e');
    strokePath(g, this.pts, 2, 'rgba(255,255,255,.4)', [12, 14]);
    const a = this.pts[0];
    const b = this.pts[1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
    g.save();
    g.translate(a.x, a.y);
    g.rotate(ang);
    for (let i = -HALF; i < HALF; i += 8) {
      g.fillStyle = (i / 8) % 2 === 0 ? '#fff' : '#111';
      g.fillRect(i, -4, 8, 8);
    }
    g.restore();
    this.trail.forEach((p, i) => {
      g.globalAlpha = (i / this.trail.length) * 0.35;
      g.fillStyle = '#e7e5e4';
      g.beginPath();
      g.arc(p.x, p.y, 5, 0, Math.PI * 2);
      g.fill();
    });
    g.globalAlpha = 1;
    emoji(g, '🐕', this.x, this.y, 30, this.ang + Math.PI / 2 - wrapAngle(0));
    const lap = Math.min(LAPS, Math.floor(this.progress / this.N) + 1);
    text(g, formatNumber(this.raceT, 2) + ' s', 14, 26, { size: 26, align: 'left', stroke: 'rgba(0,0,0,.4)' });
    text(g, `Vuelta ${lap}/${LAPS}`, W - 14, 26, { size: 20, align: 'right', stroke: 'rgba(0,0,0,.4)' });
    if (this.raceT < 4) text(g, 'Mantén pulsada la mitad izquierda o derecha para girar', W / 2, H - 20, { size: 13, weight: 700, stroke: 'rgba(0,0,0,.4)' });
  }
}

export const create = (ctx: GameCtx) => new Galgos(ctx);
