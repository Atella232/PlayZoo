import { bg, button, emoji, formatNumber, text, W, H, wrapAngle, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { strokePath, type Pt } from '../kits/track';
import { pickTrack } from '../kits/tracks';
import { Game } from '../kits/base';

const LAPS = 3;
const ALAT = 560;
const VMAX = 560;
const GAS: Rect = { x: W - 150, y: 570, w: 134, h: 62 };
const BRAKE: Rect = { x: 16, y: 570, w: 134, h: 62 };

class Hamster extends Game {
  pts: Pt[];
  N: number;
  kappa: number[] = [];
  s = 0; // índice continuo
  v = 0;
  raceT = 0;
  started = false;
  derail = 0;
  ratio = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.pts = pickTrack(ctx.rng.fork('circuito'));
    this.N = this.pts.length;
    const th: number[] = [];
    for (let i = 0; i < this.N; i++) {
      const a = this.pts[i];
      const b = this.pts[(i + 1) % this.N];
      th.push(Math.atan2(b.y - a.y, b.x - a.x));
    }
    const raw = th.map((t, i) => Math.abs(wrapAngle(th[(i + 1) % this.N] - t)) / 8);
    for (let i = 0; i < this.N; i++) {
      let sum = 0;
      for (let k = -5; k <= 5; k++) sum += raw[(i + k + this.N) % this.N];
      this.kappa.push(sum / 11);
    }
  }

  private safe(i: number) {
    const k = this.kappa[((Math.floor(i) % this.N) + this.N) % this.N];
    return Math.max(150, Math.min(VMAX + 40, Math.sqrt(ALAT / Math.max(k, 1e-4))));
  }

  private ahead(i: number) {
    let m = 1e9;
    for (let k = 0; k <= 34; k++) m = Math.min(m, this.safe(i + k));
    return m;
  }

  protected step(dt: number) {
    if (this.raceT >= 120) return this.finish(120);
    const gas = this.input.isDownIn(GAS) || this.input.keys.has('ArrowUp') || this.input.keys.has(' ');
    const brake = this.input.isDownIn(BRAKE) || this.input.keys.has('ArrowDown');
    if (gas) this.started = true;
    if (!this.started) return;
    this.raceT += dt;
    if (this.derail > 0) {
      this.derail -= dt;
      return;
    }
    if (brake) this.v = Math.max(0, this.v - 700 * dt);
    else if (gas) this.v = Math.min(VMAX, this.v + 300 * dt);
    else this.v = Math.max(0, this.v - 70 * dt);
    this.s += (this.v * dt) / 8;
    this.ratio = this.v / this.ahead(this.s);
    if (this.v > this.safe(this.s) * 1.12) {
      this.derail = 1.0;
      this.v = 0;
      this.sfx.play('bad');
      this.shake(8, 0.3);
      this.popups.add('¡Te sales!', W / 2, 300, '#fca5a5', 24);
    }
    if (this.s >= LAPS * this.N) {
      this.sfx.play('win');
      this.finish(Math.round(this.raceT * 100) / 100);
    }
  }

  protected draw(g: G2) {
    bg(g, '#fde68a', '#f59e0b');
    strokePath(g, this.pts, 16, '#78350f');
    strokePath(g, this.pts, 8, '#1c1917');
    strokePath(g, this.pts, 1.5, '#fbbf24');
    const a = this.pts[0];
    g.fillStyle = '#fff';
    g.fillRect(a.x - 18, a.y - 2, 36, 4);
    const i = Math.floor(this.s) % this.N;
    const f = this.s - Math.floor(this.s);
    const p = this.pts[i];
    const q = this.pts[(i + 1) % this.N];
    const x = p.x + (q.x - p.x) * f;
    const y = p.y + (q.y - p.y) * f;
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    emoji(g, '🐹', x, y, 30, ang + Math.PI / 2 + (this.derail > 0 ? Math.sin(this.derail * 30) * 0.6 : 0), false, this.derail > 0 && Math.floor(this.derail * 10) % 2 ? 0.4 : 1);
    const lap = Math.min(LAPS, Math.floor(this.s / this.N) + 1);
    text(g, formatNumber(this.raceT, 2) + ' s', 14, 26, { size: 26, align: 'left', stroke: 'rgba(0,0,0,.35)' });
    text(g, `Vuelta ${lap}/${LAPS}`, W - 14, 26, { size: 20, align: 'right', stroke: 'rgba(0,0,0,.35)' });
    // barra de peligro
    g.fillStyle = 'rgba(0,0,0,.3)';
    g.fillRect(W / 2 - 80, 46, 160, 12);
    g.fillStyle = this.ratio > 1 ? '#ef4444' : this.ratio > 0.85 ? '#f59e0b' : '#22c55e';
    g.fillRect(W / 2 - 80, 46, Math.min(1.2, this.ratio) * (160 / 1.2), 12);
    button(g, GAS, 'GAS', { color: '#16a34a', size: 22, down: this.input.isDownIn(GAS) });
    button(g, BRAKE, 'FRENO', { color: '#dc2626', size: 22, down: this.input.isDownIn(BRAKE) });
    void H;
  }
}

export const create = (ctx: GameCtx) => new Hamster(ctx);
