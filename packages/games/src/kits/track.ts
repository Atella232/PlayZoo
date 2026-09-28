import type { G2 } from '@playzoo/engine';

export interface Pt {
  x: number;
  y: number;
}

/** Curva cerrada Catmull-Rom remuestreada cada `step` píxeles. */
export function closedSpline(ctrl: Pt[], step = 8): Pt[] {
  const n = ctrl.length;
  const dense: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n];
    const p1 = ctrl[i];
    const p2 = ctrl[(i + 1) % n];
    const p3 = ctrl[(i + 2) % n];
    for (let k = 0; k < 24; k++) {
      const t = k / 24;
      const t2 = t * t;
      const t3 = t2 * t;
      dense.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  // remuestreo por longitud de arco
  const cum: number[] = [0];
  for (let i = 0; i < dense.length; i++) {
    const a = dense[i];
    const b = dense[(i + 1) % dense.length];
    cum.push(cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cum[cum.length - 1];
  const N = Math.max(8, Math.round(total / step));
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < N; k++) {
    const sLen = (k * total) / N;
    while (cum[j + 1] < sLen) j++;
    const a = dense[j];
    const b = dense[(j + 1) % dense.length];
    const t = (sLen - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

export function trackLength(pts: Pt[]) {
  let l = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    l += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return l;
}

/** Muestra más cercana a (x,y) y su distancia. */
export function nearest(pts: Pt[], x: number, y: number) {
  let bi = 0;
  let bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = (pts[i].x - x) ** 2 + (pts[i].y - y) ** 2;
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  return { i: bi, d: Math.sqrt(bd) };
}

export function strokePath(g: G2, pts: Pt[], width: number, color: string, dash?: number[]) {
  g.beginPath();
  pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
  g.closePath();
  g.lineWidth = width;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = color;
  g.setLineDash(dash ?? []);
  g.stroke();
  g.setLineDash([]);
}
