import { bg, circle, emoji, text, W, TAU, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const RING_GAP = 110;
const RX = 126;
const RY = 36;
const NSEG = 12;
const SEG = TAU / NSEG;
const BALL_R = 13;
const BALL_SY = 220;
const FRONT = Math.PI / 2;

// 0 sólido, 1 hueco, 2 rojo
type Seg = 0 | 1 | 2;
interface Ring {
  y: number;
  segs: Seg[];
  passed: boolean;
}

class Armadillo extends Game {
  private rr;
  rings: Ring[] = [];
  theta = 0;
  omega = 0;
  y = 60;
  vy = 0;
  camY = 0;
  points = 0;
  combo = 0;
  count = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.rr = ctx.rng.fork('anillos');
    for (let i = 0; i < 8; i++) this.addRing();
  }

  private addRing() {
    const i = this.rings.length;
    const segs: Seg[] = Array(NSEG).fill(0);
    const gaps = Math.max(2, 5 - Math.floor(i / 8));
    const reds = i < 3 ? 0 : Math.min(5, 1 + Math.floor(i / 5));
    const idx = this.rr.shuffle([...Array(NSEG).keys()]);
    for (let k = 0; k < gaps; k++) segs[idx[k]] = 1;
    for (let k = 0; k < reds; k++) segs[idx[gaps + k]] = 2;
    this.rings.push({ y: 260 + i * RING_GAP, segs, passed: false });
  }

  private segAt(): number {
    const a = (((FRONT - this.theta) % TAU) + TAU) % TAU;
    return Math.floor(a / SEG) % NSEG;
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.points);
    for (const e of this.input.downs()) {
      this.omega += (e.x < W / 2 ? -1 : 1) * 3.3;
    }
    for (const k of this.input.keyDowns()) {
      if (k === 'ArrowLeft') this.omega -= 3.3;
      if (k === 'ArrowRight') this.omega += 3.3;
    }
    this.theta += this.omega * dt;
    this.omega *= Math.max(0, 1 - 6 * dt);
    const hold = this.input.down || this.input.keys.has(' ') || this.input.keys.has('ArrowDown');
    this.vy = Math.min(880, this.vy + (hold ? 3200 : 1500) * dt);
    const py = this.y;
    this.y += this.vy * dt;
    if (this.vy > 0) {
      for (const r of this.rings) {
        if (r.passed || py + BALL_R > r.y || this.y + BALL_R < r.y) continue;
        const s = r.segs[this.segAt()];
        if (s === 1 || (s === 0 && hold)) {
          r.passed = true;
          this.count++;
          this.combo++;
          const pts = 10 + Math.min(this.combo, 8) * 4 + (s === 0 ? 5 : 0);
          this.points += pts;
          this.score = this.points;
          this.sfx.play(s === 0 ? 'hit' : 'coin', 1 + Math.min(this.combo, 10) * 0.04);
          this.popups.add(`+${pts}`, W / 2 + 60, BALL_SY, '#fde047', 18);
          if (s === 0) this.sparks.burst(W / 2, BALL_SY + 20, '#94a3b8', 8, 120);
          while (this.rings.length < this.count + 8) this.addRing();
        } else if (s === 2) {
          this.sfx.play('lose');
          this.shake(10, 0.3);
          return this.finish(this.points);
        } else {
          this.y = r.y - BALL_R;
          this.vy = -430;
          this.combo = 0;
          this.sfx.play('tick');
        }
        break;
      }
    }
    this.camY += (this.y - BALL_SY - this.camY) * Math.min(1, 12 * dt);
    this.rings = this.rings.filter((r) => r.y > this.camY - 200);
  }

  protected draw(g: G2) {
    bg(g, '#7c2d12', '#431407');
    // poste central
    g.fillStyle = '#292524';
    g.fillRect(W / 2 - 40, 0, 80, 640);
    g.fillStyle = 'rgba(255,255,255,.06)';
    g.fillRect(W / 2 - 40, 0, 16, 640);
    const colors = ['#f59e0b', '#22c55e', '#ef4444'];
    for (const r of this.rings) {
      const sy = r.y - this.camY;
      if (sy < -60 || sy > 700) continue;
      const cy = sy - RY;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < NSEG; i++) {
          const s = r.segs[i];
          if (s === 1) continue;
          const a0 = i * SEG + this.theta;
          const a1 = a0 + SEG;
          const mid = (a0 + a1) / 2;
          const front = Math.sin(mid) > 0;
          if ((pass === 0) === front) continue;
          const pts: [number, number][] = [];
          for (let k = 0; k <= 4; k++) {
            const a = a0 + (k * SEG) / 4;
            pts.push([W / 2 + Math.cos(a) * RX, cy + Math.sin(a) * RY]);
          }
          for (let k = 4; k >= 0; k--) {
            const a = a0 + (k * SEG) / 4;
            pts.push([W / 2 + Math.cos(a) * 48, cy + Math.sin(a) * 15]);
          }
          g.beginPath();
          pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.closePath();
          const c = colors[s === 2 ? 2 : 0];
          g.fillStyle = front ? c : 'rgba(0,0,0,.35)';
          g.fill();
          g.strokeStyle = 'rgba(0,0,0,.35)';
          g.lineWidth = 2;
          g.stroke();
          if (front) {
            g.beginPath();
            g.moveTo(pts[0][0], pts[0][1]);
            for (let k = 1; k <= 4; k++) g.lineTo(pts[k][0], pts[k][1]);
            for (let k = 4; k >= 0; k--) g.lineTo(pts[k][0], pts[k][1] + 9);
            g.closePath();
            g.fillStyle = s === 2 ? '#991b1b' : '#b45309';
            g.fill();
          }
        }
      }
    }
    const bsy = this.y - this.camY;
    circle(g, W / 2, bsy, BALL_R, '#fbbf24', '#78350f', 3);
    emoji(g, '🐢', W / 2, bsy, 18);
    text(g, String(this.points), W / 2, 44, { size: 44, stroke: 'rgba(0,0,0,.5)' });
    if (this.combo > 2) text(g, `Combo x${this.combo}`, W / 2, 84, { size: 16, color: '#fde047' });
    if (this.t < 6) text(g, 'Toca izq./der. para girar · mantén para bajar', W / 2, 620, { size: 13, weight: 700 });
  }
}

export const create = (ctx: GameCtx) => new Armadillo(ctx);
