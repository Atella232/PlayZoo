import type { Rng } from '@playzoo/engine';

export interface ZigOpts {
  halfWidth: number;
  speed0: number;
  accel: number;
  speedMax: number;
  segMin: number;
  segMax: number;
  /** Velocidad a la que el rumbo real sigue al pedido (1/s). Muy alto = giro instantáneo. */
  turn: number;
  /** Pendiente lateral por unidad de avance. */
  slope?: number;
}

/**
 * Núcleo de los juegos de camino en zigzag: el jugador avanza hacia arriba y
 * cada toque cambia la dirección lateral. Coordenadas del mundo: y decrece al avanzar.
 */
export class ZigzagCore {
  verts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  x = 0;
  y = 0;
  heading = 1; // rumbo real en [-1,1]
  dir = 1; // rumbo pedido
  distance = 0;
  readonly k: number;
  private next = 0;

  constructor(private rng: Rng, public o: ZigOpts) {
    this.k = o.slope ?? 0.7;
    this.extend();
  }

  get speed() {
    return Math.min(this.o.speedMax, this.o.speed0 + this.o.accel * (this.distance / 100));
  }

  toggle() {
    this.dir = -this.dir;
  }

  private extend() {
    while (this.verts[this.verts.length - 1].y > this.y - 1100) {
      const last = this.verts[this.verts.length - 1];
      const s = this.verts.length % 2 === 1 ? 1 : -1;
      const L = this.rng.range(this.o.segMin, this.o.segMax);
      this.verts.push({ x: last.x + s * this.k * L, y: last.y - L });
    }
    // liberar vértices ya lejanos
    while (this.verts.length > 6 && this.verts[2].y > this.y + 500) {
      this.verts.shift();
      this.next++;
    }
  }

  centerAt(y: number): number {
    const v = this.verts;
    for (let i = 0; i < v.length - 1; i++) {
      if (y <= v[i].y && y >= v[i + 1].y) {
        const t = (v[i].y - y) / (v[i].y - v[i + 1].y || 1);
        return v[i].x + (v[i + 1].x - v[i].x) * t;
      }
    }
    return y > v[0].y ? v[0].x : v[v.length - 1].x;
  }

  step(dt: number) {
    const t = Math.min(1, this.o.turn * dt);
    this.heading += (this.dir - this.heading) * t;
    const sp = this.speed;
    this.y -= sp * dt;
    this.x += this.heading * this.k * sp * dt;
    this.distance += sp * dt;
    this.extend();
  }

  /** Distancia lateral al centro del camino. */
  offset(): number {
    return Math.abs(this.x - this.centerAt(this.y));
  }

  isOff(): boolean {
    return this.offset() > this.o.halfWidth;
  }

  /** Vértices de giro ya superados (nº absoluto). */
  passed(): number {
    let n = this.next;
    for (const v of this.verts) if (v.y > this.y) n++;
    return Math.max(0, n - 1);
  }
}
