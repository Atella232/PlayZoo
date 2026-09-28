import { bg, circle, emoji, pointSegment, text, W, H, wrapAngle, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const RAD = 56;
const ZONE = 32;
const CORRIDOR = 52;

interface Corner {
  kx: number;
  ky: number;
  h0: number; // rumbo de entrada
  h1: number; // rumbo de salida
  ax: number; // ancla
  ay: number;
  t0x: number;
  t0y: number;
  turn: 1 | -1; // 1 = gira en sentido horario en pantalla (ángulo creciente)
  sx: number; // punto de fin del tramo siguiente
  sy: number;
}

class Lemur extends Game {
  private cr;
  corners: Corner[] = [];
  start = { x: W / 2, y: 560 };
  x: number;
  y: number;
  h: number;
  mode: 'line' | 'orbit' = 'line';
  ci = 0; // esquina objetivo
  orb = { ax: 0, ay: 0, r: 0, ang: 0, w: 0, total: 0 };
  points = 0;
  camY = 0;
  camX = 0;
  private lastK = { x: 0, y: 0 };
  private lastH = 0;
  private sgn = 1;
  private done = false;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.cr = ctx.rng.fork('curvas');
    this.lastK = { x: W / 2, y: 560 };
    this.lastH = -Math.PI / 2 + 0.55;
    this.sgn = 1;
    this.h = this.lastH;
    this.x = this.start.x;
    this.y = this.start.y;
    for (let i = 0; i < 8; i++) this.addCorner();
  }

  private get speed() {
    return Math.min(500, 290 + this.points * 2.4);
  }

  private addCorner() {
    const d0 = this.lastH;
    const len = this.cr.range(155, 205);
    const kx = this.lastK.x + Math.cos(d0) * len;
    const ky = this.lastK.y + Math.sin(d0) * len;
    // el nuevo rumbo alterna izquierda/derecha y se corrige si el camino se acerca a los bordes
    const delta = this.cr.range(0.4, 0.8);
    let tilt = -this.sgn;
    if (kx < 110) tilt = 1;
    else if (kx > W - 110) tilt = -1;
    this.sgn = tilt;
    const h1 = -Math.PI / 2 + tilt * delta;
    // mantener dentro de pantalla horizontalmente: si se sale, invertimos la elección
    const turnAng = wrapAngle(h1 - d0);
    const turn: 1 | -1 = turnAng > 0 ? 1 : -1;
    const phi = Math.abs(turnAng);
    const off = RAD * Math.tan(phi / 2);
    const t0x = kx - Math.cos(d0) * off;
    const t0y = ky - Math.sin(d0) * off;
    // ancla: normal interior a la entrada (gira hacia turn)
    const n0x = -Math.sin(d0) * turn;
    const n0y = Math.cos(d0) * turn;
    const ax = t0x + n0x * RAD;
    const ay = t0y + n0y * RAD;
    const next = { sx: kx + Math.cos(h1) * len, sy: ky + Math.sin(h1) * len };
    this.corners.push({ kx, ky, h0: d0, h1, ax, ay, t0x, t0y, turn, sx: next.sx, sy: next.sy });
    this.lastK = { x: kx, y: ky };
    this.lastH = h1;
  }

  private corridorDist(px: number, py: number) {
    let best = 1e9;
    let px0 = this.start.x;
    let py0 = this.start.y;
    for (let i = Math.max(0, this.ci - 2); i < Math.min(this.corners.length, this.ci + 3); i++) {
      const c = this.corners[i];
      const s1 = pointSegment(px, py, px0, py0, c.kx, c.ky);
      best = Math.min(best, s1.d);
      px0 = c.kx;
      py0 = c.ky;
      const s2 = pointSegment(px, py, c.kx, c.ky, c.sx, c.sy);
      best = Math.min(best, s2.d);
    }
    return best;
  }

  protected step(dt: number) {
    if (this.t >= 90 || this.done) return this.finish(this.points);
    const c = this.corners[this.ci];
    const v = this.speed;
    const pressed = this.input.down || this.input.keys.has(' ');
    if (this.mode === 'line') {
      this.x += Math.cos(this.h) * v * dt;
      this.y += Math.sin(this.h) * v * dt;
      if (pressed && Math.hypot(this.x - c.t0x, this.y - c.t0y) <= ZONE) {
        const r = Math.hypot(this.x - c.ax, this.y - c.ay);
        this.orb = { ax: c.ax, ay: c.ay, r: Math.max(20, r), ang: Math.atan2(this.y - c.ay, this.x - c.ax), w: c.turn * (v / Math.max(20, r)), total: 0 };
        this.mode = 'orbit';
        this.sfx.play('pop');
      }
      // avance de esquina: ya se superó el punto de salida del arco
      const along = (this.x - c.kx) * Math.cos(c.h1) + (this.y - c.ky) * Math.sin(c.h1);
      if (along > 6 && this.corridorDist(this.x, this.y) < CORRIDOR * 0.85) {
        this.points++;
        this.score = this.points;
        this.ci++;
        this.sfx.play('coin', 1 + Math.min(this.points, 40) * 0.01);
        if (this.corners.length - this.ci < 6) this.addCorner();
      }
    } else {
      const o = this.orb;
      o.ang += o.w * dt;
      o.total += Math.abs(o.w) * dt;
      this.x = o.ax + Math.cos(o.ang) * o.r;
      this.y = o.ay + Math.sin(o.ang) * o.r;
      this.h = o.ang + Math.sign(o.w) * (Math.PI / 2);
      if (!pressed) {
        this.mode = 'line';
        const err = Math.abs(wrapAngle(this.h - c.h1));
        if (err < 0.4) {
          // asistencia: si sueltas apuntando casi recto, el lémur se alinea con el tramo
          this.h = c.h1;
          if (err < 0.12) this.popups.add('¡Perfecto!', W / 2, 300, '#86efac', 22);
        }
      } else if (o.total > Math.PI * 1.7) {
        this.done = true;
        this.sfx.play('lose');
      }
    }
    if (this.corridorDist(this.x, this.y) > CORRIDOR + 6) {
      this.done = true;
      this.sfx.play('hit');
      this.shake();
    }
    const targetCam = this.y - 470;
    this.camY += (targetCam - this.camY) * Math.min(1, 6 * dt);
    this.camX += (this.x - W / 2 - this.camX) * Math.min(1, 5 * dt);
    void H;
  }

  protected draw(g: G2) {
    bg(g, '#312e81', '#0f172a');
    for (let i = 0; i < 25; i++) {
      g.fillStyle = 'rgba(255,255,255,.4)';
      g.fillRect((i * 97) % W, (((i * 61 - this.camY * 0.3) % 700) + 700) % 700, 2, 2);
    }
    g.save();
    g.translate(-this.camX, -this.camY);
    // camino
    g.beginPath();
    g.moveTo(this.start.x, this.start.y);
    for (let i = 0; i < this.corners.length; i++) g.lineTo(this.corners[i].kx, this.corners[i].ky);
    g.lineJoin = 'round';
    g.lineWidth = CORRIDOR * 1.6;
    g.strokeStyle = 'rgba(99,102,241,.25)';
    g.stroke();
    g.lineWidth = 3;
    g.setLineDash([8, 10]);
    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.stroke();
    g.setLineDash([]);
    for (let i = this.ci; i < Math.min(this.corners.length, this.ci + 4); i++) {
      const c = this.corners[i];
      circle(g, c.ax, c.ay, 9, '#a78bfa', '#4c1d95', 3);
      g.beginPath();
      g.arc(c.t0x, c.t0y, ZONE, 0, Math.PI * 2);
      g.fillStyle = i === this.ci ? 'rgba(239,68,68,.35)' : 'rgba(239,68,68,.15)';
      g.fill();
      g.strokeStyle = '#ef4444';
      g.lineWidth = 2;
      g.stroke();
    }
    if (this.mode === 'orbit') {
      g.strokeStyle = '#c4b5fd';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(this.orb.ax, this.orb.ay);
      g.lineTo(this.x, this.y);
      g.stroke();
    }
    circle(g, this.x, this.y, 13, '#f97316', '#fff', 3);
    emoji(g, '🐒', this.x, this.y, 18);
    g.restore();
    text(g, String(this.points), W / 2, 44, { size: 46, stroke: 'rgba(0,0,0,.5)' });
    if (this.t < 5) text(g, 'Pulsa en la zona roja y suelta al apuntar recto', W / 2, 620, { size: 13, weight: 700 });
  }
}

export const create = (ctx: GameCtx) => new Lemur(ctx);
