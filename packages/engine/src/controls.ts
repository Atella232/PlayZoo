import type { G2 } from './types';
import { Input, inRect, type Rect } from './input';
import { button, circle, fillRR, text } from './ui';
import { clamp } from './geom';

export type Dir = 'left' | 'right' | 'up' | 'down';

export const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
export const DIR_ARROW: Record<Dir, string> = { left: '←', right: '→', up: '↑', down: '↓' };
export const DIRS: Dir[] = ['left', 'right', 'up', 'down'];

/** Detecta gestos de deslizar; dispara en cuanto se supera la distancia mínima. */
export class Swipe {
  private start: { x: number; y: number; id: number; fired: boolean } | null = null;
  constructor(private min = 26) {}

  update(input: Input): Dir | null {
    let out: Dir | null = null;
    for (const e of input.events) {
      if (e.type === 'down' && !this.start) this.start = { x: e.x, y: e.y, id: e.id, fired: false };
      else if (e.type === 'move' && this.start && e.id === this.start.id && !this.start.fired) {
        const dx = e.x - this.start.x;
        const dy = e.y - this.start.y;
        if (Math.hypot(dx, dy) >= this.min) {
          this.start.fired = true;
          out = out ?? (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        }
      } else if (e.type === 'up' && this.start && e.id === this.start.id) {
        if (!this.start.fired) {
          const dx = e.x - this.start.x;
          const dy = e.y - this.start.y;
          if (Math.hypot(dx, dy) >= this.min) out = out ?? (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        }
        this.start = null;
      }
    }
    for (const k of input.keyDowns()) {
      if (k === 'ArrowLeft') out = out ?? 'left';
      if (k === 'ArrowRight') out = out ?? 'right';
      if (k === 'ArrowUp') out = out ?? 'up';
      if (k === 'ArrowDown') out = out ?? 'down';
    }
    return out;
  }
}

/** Cruceta táctil (también responde a las flechas del teclado). */
export class Dpad {
  rects: Record<Dir, Rect>;
  private press = new Map<Dir, number>();
  constructor(cx: number, cy: number, size = 64, gap = 8) {
    const s = size;
    this.rects = {
      up: { x: cx - s / 2, y: cy - s * 1.5 - gap, w: s, h: s },
      down: { x: cx - s / 2, y: cy + s * 0.5 + gap, w: s, h: s },
      left: { x: cx - s * 1.5 - gap, y: cy - s / 2, w: s, h: s },
      right: { x: cx + s * 0.5 + gap, y: cy - s / 2, w: s, h: s },
    };
  }
  poll(input: Input): Dir | null {
    for (const e of input.downs()) {
      for (const d of DIRS) {
        if (inRect(this.rects[d], e.x, e.y)) {
          this.press.set(d, 0.12);
          return d;
        }
      }
    }
    for (const k of input.keyDowns()) {
      const d = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' } as Record<string, Dir>)[k];
      if (d) {
        this.press.set(d, 0.12);
        return d;
      }
    }
    return null;
  }
  update(dt: number) {
    for (const [d, v] of this.press) {
      if (v - dt <= 0) this.press.delete(d);
      else this.press.set(d, v - dt);
    }
  }
  draw(g: G2, color = '#475569') {
    for (const d of DIRS) button(g, this.rects[d], DIR_ARROW[d], { color, size: 30, down: this.press.has(d) });
  }
}

/** Joystick flotante: nace donde se toca. Devuelve un vector de -1 a 1. */
export class Joystick {
  origin: { x: number; y: number } | null = null;
  knob: { x: number; y: number } | null = null;
  vec = { x: 0, y: 0 };
  active = false;
  constructor(private radius = 46) {}

  update(input: Input) {
    for (const e of input.downs()) this.origin = { x: e.x, y: e.y };
    const p = input.primary();
    if (p && this.origin) {
      let dx = p.x - this.origin.x;
      let dy = p.y - this.origin.y;
      const d = Math.hypot(dx, dy);
      if (d > this.radius) {
        dx = (dx / d) * this.radius;
        dy = (dy / d) * this.radius;
      }
      this.knob = { x: this.origin.x + dx, y: this.origin.y + dy };
      this.vec = { x: dx / this.radius, y: dy / this.radius };
      this.active = true;
    } else {
      this.origin = null;
      this.knob = null;
      this.vec = { x: 0, y: 0 };
      this.active = false;
    }
    // teclado como alternativa
    const k = input.keys;
    if (!this.active && (k.has('ArrowLeft') || k.has('ArrowRight') || k.has('ArrowUp') || k.has('ArrowDown'))) {
      this.vec = { x: (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0), y: (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0) };
      this.active = true;
    }
  }

  draw(g: G2) {
    if (this.origin && this.knob) {
      circle(g, this.origin.x, this.origin.y, this.radius, 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.5)', 2);
      circle(g, this.knob.x, this.knob.y, 20, 'rgba(255,255,255,0.6)');
    }
  }
}

/** Deslizador horizontal arrastrable (valor 0..1). */
export class Slider {
  value: number;
  private grab: number | null = null;
  constructor(public rect: Rect, value = 0.5, public label = '') {
    this.value = value;
  }
  update(input: Input) {
    const hit: Rect = { x: this.rect.x - 12, y: this.rect.y - 16, w: this.rect.w + 24, h: this.rect.h + 32 };
    for (const e of input.events) {
      if (e.type === 'down' && inRect(hit, e.x, e.y)) {
        this.grab = e.id;
        this.value = clamp((e.x - this.rect.x) / this.rect.w, 0, 1);
      } else if (e.type === 'move' && this.grab === e.id) {
        this.value = clamp((e.x - this.rect.x) / this.rect.w, 0, 1);
      } else if (e.type === 'up' && this.grab === e.id) {
        this.grab = null;
      }
    }
  }
  draw(g: G2, colorAt: (t: number) => string) {
    const { x, y, w, h } = this.rect;
    const n = 32;
    for (let i = 0; i < n; i++) {
      g.fillStyle = colorAt(i / (n - 1));
      g.fillRect(x + (i * w) / n, y, w / n + 1, h);
    }
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 2;
    g.strokeRect(x, y, w, h);
    const kx = x + this.value * w;
    fillRR(g, { x: kx - 6, y: y - 8, w: 12, h: h + 16 }, 6, '#fff');
    if (this.label) text(g, this.label, x, y - 16, { size: 13, align: 'left', weight: 700, color: '#cbd5e1' });
  }
}
