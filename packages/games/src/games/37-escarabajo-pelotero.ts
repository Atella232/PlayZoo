import { bg, circle, clamp, emoji, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';
import { closedSpline, nearest, strokePath, type Pt } from '../kits/track';

const TRACKS: Pt[][] = [
  [[70, 130], [290, 110], [320, 260], [220, 330], [300, 420], [280, 560], [100, 580], [50, 450], [120, 360], [60, 250]],
  [[180, 100], [310, 240], [290, 420], [200, 590], [70, 500], [60, 300], [130, 220]],
  [[60, 110], [300, 110], [300, 300], [170, 300], [170, 430], [300, 430], [300, 590], [60, 590]],
].map((t) => t.map(([x, y]) => ({ x, y })));

const HALF = 32;
const VMAX = 215;
const STICK = 46;

class Escarabajo extends Game {
  pts: Pt[];
  N: number;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  idx = 0;
  progress = 0;
  round = 0;
  times: number[] = [];
  running = false;
  roundT = 0;
  pause = 0;
  origin: Pt | null = null;
  knob: Pt | null = null;
  private trail: Pt[] = [];

  constructor(ctx: GameCtx) {
    super(ctx);
    const base = TRACKS[ctx.rng.int(0, TRACKS.length - 1)];
    const flip = ctx.rng.chance(0.5);
    this.pts = closedSpline(base.map((p) => ({ x: flip ? W - p.x : p.x, y: p.y })), 8);
    this.N = this.pts.length;
    this.x = this.pts[0].x;
    this.y = this.pts[0].y;
  }

  private reset() {
    this.x = this.pts[0].x;
    this.y = this.pts[0].y;
    this.vx = this.vy = 0;
    this.idx = 0;
    this.progress = 0;
    this.running = false;
    this.roundT = 0;
    this.trail = [];
  }

  protected step(dt: number) {
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.pause <= 0) {
        if (this.round >= 2) this.finish(Math.min(...this.times));
        else this.reset();
      }
      return;
    }
    // joystick flotante
    for (const e of this.input.downs()) {
      this.origin = { x: e.x, y: e.y };
    }
    const p = this.input.primary();
    let ix = 0;
    let iy = 0;
    if (p && this.origin) {
      let dx = p.x - this.origin.x;
      let dy = p.y - this.origin.y;
      const d = Math.hypot(dx, dy);
      if (d > STICK) {
        dx = (dx / d) * STICK;
        dy = (dy / d) * STICK;
      }
      this.knob = { x: this.origin.x + dx, y: this.origin.y + dy };
      ix = dx / STICK;
      iy = dy / STICK;
      if (!this.running && d > 6) this.running = true;
    } else {
      this.knob = null;
      this.origin = null;
    }
    if (this.running) this.roundT += dt;

    const near = nearest(this.pts, this.x, this.y);
    const onTrack = near.d < HALF;
    const vmax = onTrack ? VMAX : VMAX * 0.38;
    const k = Math.min(1, 7 * dt);
    this.vx += (ix * vmax - this.vx) * k;
    this.vy += (iy * vmax - this.vy) * k;
    this.x = clamp(this.x + this.vx * dt, 8, W - 8);
    this.y = clamp(this.y + this.vy * dt, 8, H - 8);
    if (this.tick % 3 === 0) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 12) this.trail.shift();
    }

    // progreso monótono a lo largo del circuito
    const n2 = nearest(this.pts, this.x, this.y);
    let d = n2.i - this.idx;
    if (d > this.N / 2) d -= this.N;
    if (d < -this.N / 2) d += this.N;
    if (Math.abs(d) <= 30) {
      this.progress += d;
      this.idx = n2.i;
    }
    if (this.progress < 0) this.progress = 0;
    if (this.progress >= this.N - 1) {
      this.times.push(this.roundT);
      this.round++;
      this.running = false;
      this.pause = 1.4;
      this.sfx.play('win');
    }
  }

  protected draw(g: G2) {
    bg(g, '#65a30d', '#4d7c0f');
    strokePath(g, this.pts, HALF * 2 + 14, '#d6c08f');
    strokePath(g, this.pts, HALF * 2, '#78716c');
    strokePath(g, this.pts, 2, 'rgba(255,255,255,0.35)', [10, 12]);
    // meta
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
    // estela
    this.trail.forEach((t, i) => {
      g.globalAlpha = (i / this.trail.length) * 0.4;
      circle(g, t.x, t.y, 6, '#422006');
    });
    g.globalAlpha = 1;
    // bola y escarabajo
    const sp = Math.hypot(this.vx, this.vy);
    const heading = sp > 5 ? Math.atan2(this.vy, this.vx) : 0;
    emoji(g, '🪲', this.x - Math.cos(heading) * 20, this.y - Math.sin(heading) * 20, 20, heading + Math.PI / 2);
    circle(g, this.x, this.y, 10, '#92400e', '#451a03', 2);
    circle(g, this.x - 3, this.y - 3, 3, 'rgba(255,255,255,0.35)');
    // joystick
    if (this.origin && this.knob) {
      circle(g, this.origin.x, this.origin.y, STICK, 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.5)', 2);
      circle(g, this.knob.x, this.knob.y, 20, 'rgba(255,255,255,0.6)');
    }
    // marcador
    const tShow = this.pause > 0 ? this.times[this.times.length - 1] : this.roundT;
    text(g, tShow.toFixed(2).replace('.', ',') + ' s', 14, 26, { size: 26, align: 'left', stroke: 'rgba(0,0,0,0.4)' });
    text(g, `Ronda ${Math.min(this.round + 1, 2)}/2`, W - 14, 26, { size: 20, align: 'right', stroke: 'rgba(0,0,0,0.4)' });
    if (this.times.length) text(g, 'Mejor ' + Math.min(...this.times).toFixed(2).replace('.', ','), W - 14, 52, { size: 15, align: 'right', weight: 600, stroke: 'rgba(0,0,0,0.4)' });
    if (!this.running && this.pause <= 0) text(g, 'Arrastra para empezar', W / 2, H - 30, { size: 18, stroke: 'rgba(0,0,0,0.4)' });
  }
}

export const create = (ctx: GameCtx) => new Escarabajo(ctx);
