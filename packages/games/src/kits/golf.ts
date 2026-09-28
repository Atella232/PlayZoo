import type { Rng } from '@playzoo/engine';
import { circleRect, clamp } from '@playzoo/engine';

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Course {
  start: { x: number; y: number };
  hole: { x: number; y: number };
  walls: WallRect[];
}

export const BOUNDS = { x0: 16, y0: 90, x1: 344, y1: 604 };
export const HOLE_R = 15;
export const BALL_R = 8;

/** Genera un campo simple: salida abajo, hoyo arriba y algunos obstáculos. */
export function genCourse(rng: Rng, opts: { walls: number; from?: { x: number; y: number }; maxDist?: number } = { walls: 2 }): Course {
  for (let attempt = 0; attempt < 80; attempt++) {
    const start = opts.from ? { ...opts.from } : { x: rng.range(50, 310), y: rng.range(500, 580) };
    const maxD = opts.maxDist ?? 480;
    let hole = { x: rng.range(50, 310), y: rng.range(140, 300) };
    if (opts.maxDist) {
      const a = rng.range(-Math.PI * 0.95, -Math.PI * 0.05);
      const d = rng.range(160, maxD);
      hole = { x: clamp(start.x + Math.cos(a) * d, 40, 320), y: clamp(start.y + Math.sin(a) * d, 130, 560) };
    }
    if (Math.hypot(hole.x - start.x, hole.y - start.y) < 150) continue;
    const walls: WallRect[] = [];
    let guard = 0;
    while (walls.length < opts.walls && guard++ < 40) {
      const horizontal = rng.chance(0.6);
      const len = rng.range(70, 160);
      const t = 16;
      const cx = rng.range(BOUNDS.x0 + 30, BOUNDS.x1 - 30);
      const cy = rng.range(BOUNDS.y0 + 80, BOUNDS.y1 - 80);
      const w: WallRect = horizontal ? { x: cx - len / 2, y: cy - t / 2, w: len, h: t } : { x: cx - t / 2, y: cy - len / 2, w: t, h: len };
      if (w.x < BOUNDS.x0 || w.x + w.w > BOUNDS.x1) continue;
      const near = (p: { x: number; y: number }) => circleRect(p.x, p.y, 44, w.x, w.y, w.w, w.h);
      if (near(start) || near(hole)) continue;
      if (walls.some((o) => o.x < w.x + w.w + 40 && o.x + o.w + 40 > w.x && o.y < w.y + w.h + 40 && o.y + o.h + 40 > w.y)) continue;
      walls.push(w);
    }
    if (walls.length < opts.walls) continue;
    return { start, hole, walls };
  }
  return { start: { x: 180, y: 540 }, hole: { x: 180, y: 200 }, walls: [] };
}

/** Bola de golf con fricción, rebotes contra muros y caída al hoyo. */
export class GolfBall {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  sunk = false;
  constructor(public course: Course) {
    this.x = course.start.x;
    this.y = course.start.y;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  hit(vx: number, vy: number) {
    this.vx = vx;
    this.vy = vy;
  }

  step(dt: number): boolean {
    const n = 4;
    const h = dt / n;
    for (let i = 0; i < n && !this.sunk; i++) {
      this.x += this.vx * h;
      this.y += this.vy * h;
      if (this.x < BOUNDS.x0 + BALL_R) {
        this.x = BOUNDS.x0 + BALL_R;
        this.vx = Math.abs(this.vx) * 0.8;
      }
      if (this.x > BOUNDS.x1 - BALL_R) {
        this.x = BOUNDS.x1 - BALL_R;
        this.vx = -Math.abs(this.vx) * 0.8;
      }
      if (this.y < BOUNDS.y0 + BALL_R) {
        this.y = BOUNDS.y0 + BALL_R;
        this.vy = Math.abs(this.vy) * 0.8;
      }
      if (this.y > BOUNDS.y1 - BALL_R) {
        this.y = BOUNDS.y1 - BALL_R;
        this.vy = -Math.abs(this.vy) * 0.8;
      }
      for (const w of this.course.walls) {
        if (!circleRect(this.x, this.y, BALL_R, w.x, w.y, w.w, w.h)) continue;
        const l = this.x + BALL_R - w.x;
        const r = w.x + w.w - (this.x - BALL_R);
        const t = this.y + BALL_R - w.y;
        const b = w.y + w.h - (this.y - BALL_R);
        const m = Math.min(l, r, t, b);
        if (m === l) {
          this.x = w.x - BALL_R;
          this.vx = -Math.abs(this.vx) * 0.78;
        } else if (m === r) {
          this.x = w.x + w.w + BALL_R;
          this.vx = Math.abs(this.vx) * 0.78;
        } else if (m === t) {
          this.y = w.y - BALL_R;
          this.vy = -Math.abs(this.vy) * 0.78;
        } else {
          this.y = w.y + w.h + BALL_R;
          this.vy = Math.abs(this.vy) * 0.78;
        }
      }
      const d = Math.hypot(this.x - this.course.hole.x, this.y - this.course.hole.y);
      const sp = this.speed;
      if (d < HOLE_R && sp < 430) {
        this.sunk = true;
        this.x = this.course.hole.x;
        this.y = this.course.hole.y;
        this.vx = this.vy = 0;
      } else if (d < HOLE_R * 2 && sp < 200) {
        const k = 260 * h;
        this.vx += ((this.course.hole.x - this.x) / (d || 1)) * k;
        this.vy += ((this.course.hole.y - this.y) / (d || 1)) * k;
      }
    }
    // fricción
    const sp = this.speed;
    if (sp > 0) {
      const dec = (sp * 0.9 + 30) * dt;
      const ns = Math.max(0, sp - dec);
      if (ns < 9) {
        this.vx = this.vy = 0;
      } else {
        this.vx *= ns / sp;
        this.vy *= ns / sp;
      }
    }
    return this.sunk;
  }
}

/** Velocidad de golpe a partir del arrastre hacia atrás (en unidades del campo). */
export function shotVelocity(dx: number, dy: number, maxPower = 620): { vx: number; vy: number; power: number } {
  const len = Math.hypot(dx, dy);
  const power = clamp(len / 150, 0, 1);
  if (len < 1) return { vx: 0, vy: 0, power: 0 };
  return { vx: (dx / len) * power * maxPower, vy: (dy / len) * power * maxPower, power };
}
