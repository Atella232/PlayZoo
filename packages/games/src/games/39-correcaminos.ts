import { bg, button, clamp, emoji, formatNumber, text, W, H, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const SEG = 200;
const LAP_SEGS = 30;
const LAPS = 2;
const LEN = SEG * LAP_SEGS;
const VMAX = 1400;
const HORIZON = 230;
const Z0 = 250;
const HALF_PX = 250;
const DRAW = 46;

const LEFT: Rect = { x: 12, y: 572, w: 100, h: 60 };
const RIGHT: Rect = { x: 122, y: 572, w: 100, h: 60 };
const BRAKE: Rect = { x: 248, y: 572, w: 100, h: 60 };

class Correcaminos extends Game {
  curves: number[] = [];
  deco: { seg: number; side: number; e: string }[] = [];
  pos = 0;
  speed = 0;
  x = 0;
  raceT = 0;
  started = false;
  private off = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    const r = ctx.rng.fork('carretera');
    let i = 0;
    const c: number[] = Array(LAP_SEGS).fill(0);
    let sign: 1 | -1 = r.sign();
    while (i < LAP_SEGS) {
      const straight = r.int(3, 5);
      i += straight;
      const len = r.int(4, 7);
      const amp = r.range(1.0, 2.5) * sign;
      for (let k = 0; k < len && i + k < LAP_SEGS; k++) {
        const ease = Math.min(1, (k + 1) / 2, (len - k) / 2);
        c[i + k] = amp * ease;
      }
      i += len;
      sign = (-sign) as 1 | -1;
    }
    this.curves = c;
    for (let s = 0; s < LAP_SEGS * 3; s++) {
      if (r.chance(0.5)) this.deco.push({ seg: s, side: r.chance(0.5) ? -1 : 1, e: r.pick(['🌵', '🪨', '🌴', '🌵']) });
    }
  }

  private curveAt(pos: number) {
    return this.curves[Math.floor(pos / SEG) % LAP_SEGS];
  }

  protected step(dt: number) {
    if (this.raceT >= 120) return this.finish(120);
    const p = [...this.input.pointers.values()];
    let steer = 0;
    let brake = this.input.keys.has('ArrowDown');
    for (const q of p) {
      if (q.x >= LEFT.x && q.x <= LEFT.x + LEFT.w && q.y >= LEFT.y) steer -= 1;
      else if (q.x >= RIGHT.x && q.x <= RIGHT.x + RIGHT.w && q.y >= RIGHT.y) steer += 1;
      else if (q.x >= BRAKE.x && q.y >= BRAKE.y) brake = true;
    }
    if (this.input.keys.has('ArrowLeft')) steer -= 1;
    if (this.input.keys.has('ArrowRight')) steer += 1;
    steer = clamp(steer, -1, 1);
    this.started = true;
    this.raceT += dt;
    const offroad = Math.abs(this.x) > 1.05;
    const cap = offroad ? 520 : VMAX;
    if (brake) this.speed = Math.max(0, this.speed - 1000 * dt);
    else if (this.speed < cap) this.speed = Math.min(cap, this.speed + 760 * dt);
    else this.speed = Math.max(cap, this.speed - 1200 * dt);
    const k = this.speed / VMAX;
    this.x += steer * 1.9 * k * dt;
    this.x -= this.curveAt(this.pos) * k * k * 0.95 * dt;
    this.x = clamp(this.x, -1.6, 1.6);
    this.pos += this.speed * dt;
    this.off = offroad ? this.off + dt : 0;
    if (this.pos >= LEN * LAPS) {
      this.sfx.play('win');
      this.finish(Math.round(this.raceT * 100) / 100);
    }
  }

  protected draw(g: G2) {
    const sky = g.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, '#0ea5e9');
    sky.addColorStop(1, '#fde68a');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, HORIZON + 1);
    // montañas
    g.fillStyle = '#b45309';
    g.beginPath();
    g.moveTo(0, HORIZON);
    for (let x = 0; x <= W; x += 20) g.lineTo(x, HORIZON - 26 - Math.abs(Math.sin((x + this.pos * 0.02 * this.curveAt(this.pos)) / 40)) * 30);
    g.lineTo(W, HORIZON);
    g.fill();
    g.fillStyle = '#65a30d';
    g.fillRect(0, HORIZON, W, H - HORIZON);
    const base = Math.floor(this.pos / SEG);
    const frac = (this.pos % SEG) / SEG;
    let dx = -this.curves[base % LAP_SEGS] * frac * 1.4;
    let cx = 0;
    const rows: { y: number; w: number; x: number; s: number }[] = [];
    for (let n = 0; n < DRAW; n++) {
      const seg = base + n;
      const z = Z0 + n * SEG - frac * SEG;
      const s = Z0 / z;
      const y = HORIZON + (H - HORIZON) * s;
      const w = HALF_PX * s;
      const sx = W / 2 + ((cx - this.x * 1000) / 1000) * HALF_PX * s;
      rows.push({ y, w, x: sx, s });
      cx += dx * 1000 * 0.001 * 1000;
      dx += this.curves[seg % LAP_SEGS] * 1.4;
      void seg;
    }
    for (let n = DRAW - 2; n >= 0; n--) {
      const a = rows[n];
      const b = rows[n + 1];
      const seg = base + n;
      const alt = seg % 2 === 0;
      g.fillStyle = alt ? '#65a30d' : '#4d7c0f';
      g.fillRect(0, b.y, W, a.y - b.y + 1);
      g.beginPath();
      g.moveTo(a.x - a.w * 1.18, a.y);
      g.lineTo(a.x + a.w * 1.18, a.y);
      g.lineTo(b.x + b.w * 1.18, b.y);
      g.lineTo(b.x - b.w * 1.18, b.y);
      g.fillStyle = alt ? '#ef4444' : '#f8fafc';
      g.fill();
      g.beginPath();
      g.moveTo(a.x - a.w, a.y);
      g.lineTo(a.x + a.w, a.y);
      g.lineTo(b.x + b.w, b.y);
      g.lineTo(b.x - b.w, b.y);
      g.fillStyle = alt ? '#57534e' : '#78716c';
      g.fill();
      if (alt) {
        g.beginPath();
        g.moveTo(a.x - a.w * 0.03, a.y);
        g.lineTo(a.x + a.w * 0.03, a.y);
        g.lineTo(b.x + b.w * 0.03, b.y);
        g.lineTo(b.x - b.w * 0.03, b.y);
        g.fillStyle = '#fde047';
        g.fill();
      }
    }
    for (const d of this.deco) {
      const n = d.seg - base;
      if (n < 1 || n >= DRAW) continue;
      const r = rows[n];
      emoji(g, d.e, r.x + d.side * (r.w * 1.5), r.y, 60 * r.s + 6);
    }
    // jugador
    const lean = 0;
    emoji(g, '🐦', W / 2 + lean, 520, 70, 0);
    text(g, formatNumber(this.raceT, 2) + ' s', 14, 26, { size: 26, align: 'left', stroke: 'rgba(0,0,0,.4)' });
    text(g, `Vuelta ${Math.min(LAPS, Math.floor(this.pos / LEN) + 1)}/${LAPS}`, W - 14, 26, { size: 20, align: 'right', stroke: 'rgba(0,0,0,.4)' });
    text(g, `${Math.round(this.speed / 5)} km/h`, W / 2, 26, { size: 15, weight: 700, stroke: 'rgba(0,0,0,.4)' });
    button(g, LEFT, '◀', { color: '#0f766e', size: 26 });
    button(g, RIGHT, '▶', { color: '#0f766e', size: 26 });
    button(g, BRAKE, 'FRENO', { color: '#dc2626', size: 18 });
    if (this.raceT < 3) text(g, 'Usa ◀ ▶ y FRENO en las curvas', W / 2, 545, { size: 14, weight: 700, stroke: 'rgba(0,0,0,.5)' });
  }
}

export const create = (ctx: GameCtx) => new Correcaminos(ctx);
