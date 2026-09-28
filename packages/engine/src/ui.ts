import type { G2 } from './types';
import { W } from './types';
import { inRect, type Rect } from './input';

export const FONT = `ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const EMOJI_FONT = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;

export function bg(g: G2, top: string, bottom?: string, h = 640) {
  if (!bottom) {
    g.fillStyle = top;
  } else {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    g.fillStyle = gr;
  }
  g.fillRect(0, 0, W, h);
}

export interface TextOpts {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  base?: CanvasTextBaseline;
  weight?: string | number;
  stroke?: string;
  alpha?: number;
}

export function text(g: G2, s: string, x: number, y: number, o: TextOpts = {}) {
  g.font = `${o.weight ?? 800} ${o.size ?? 20}px ${FONT}`;
  g.textAlign = o.align ?? 'center';
  g.textBaseline = o.base ?? 'middle';
  if (o.alpha !== undefined) g.globalAlpha = o.alpha;
  if (o.stroke) {
    g.lineWidth = Math.max(2, (o.size ?? 20) / 6);
    g.lineJoin = 'round';
    g.strokeStyle = o.stroke;
    g.strokeText(s, x, y);
  }
  g.fillStyle = o.color ?? '#fff';
  g.fillText(s, x, y);
  if (o.alpha !== undefined) g.globalAlpha = 1;
}

export function emoji(g: G2, e: string, x: number, y: number, size: number, rot = 0, flipX = false, alpha = 1) {
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  if (flipX) g.scale(-1, 1);
  if (alpha !== 1) g.globalAlpha = alpha;
  g.font = `${size}px ${EMOJI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(e, 0, size * 0.04);
  g.restore();
}

export function rrectPath(g: G2, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

export function fillRR(g: G2, r: Rect, radius: number, color: string) {
  rrectPath(g, r.x, r.y, r.w, r.h, radius);
  g.fillStyle = color;
  g.fill();
}

export function circle(g: G2, x: number, y: number, r: number, color: string, stroke?: string, lw = 2) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  if (stroke) {
    g.lineWidth = lw;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

export function line(g: G2, x1: number, y1: number, x2: number, y2: number, color: string, lw = 2) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineCap = 'round';
  g.stroke();
}

export interface ButtonOpts {
  color?: string;
  textColor?: string;
  size?: number;
  down?: boolean;
  disabled?: boolean;
}

export function button(g: G2, r: Rect, label: string, o: ButtonOpts = {}) {
  const c = o.color ?? '#4f46e5';
  g.save();
  if (o.disabled) g.globalAlpha = 0.4;
  const dy = o.down ? 3 : 0;
  fillRR(g, { x: r.x, y: r.y + 4, w: r.w, h: r.h }, 14, 'rgba(0,0,0,0.25)');
  fillRR(g, { x: r.x, y: r.y + dy, w: r.w, h: r.h }, 14, c);
  text(g, label, r.x + r.w / 2, r.y + r.h / 2 + dy, { size: o.size ?? 22, color: o.textColor ?? '#fff' });
  g.restore();
}

export function bar(g: G2, x: number, y: number, w: number, h: number, frac: number, color: string, back = 'rgba(0,0,0,0.3)') {
  fillRR(g, { x, y, w, h }, h / 2, back);
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) fillRR(g, { x, y, w: Math.max(h, w * f), h }, h / 2, color);
}

/** Texto de marcador arriba. */
export function hud(g: G2, left: string, right?: string, color = '#fff') {
  text(g, left, 14, 26, { size: 24, align: 'left', color, stroke: 'rgba(0,0,0,0.35)' });
  if (right) text(g, right, W - 14, 26, { size: 22, align: 'right', color, stroke: 'rgba(0,0,0,0.35)' });
}

export function lives(g: G2, n: number, max = 3, x = W - 14, y = 58) {
  for (let i = 0; i < max; i++) {
    emoji(g, i < n ? '❤️' : '🖤', x - 12 - i * 26, y, 22);
  }
}

interface Popup {
  s: string;
  x: number;
  y: number;
  life: number;
  color: string;
  size: number;
}

/** Textos flotantes tipo "+10". */
export class Popups {
  private list: Popup[] = [];
  add(s: string, x: number, y: number, color = '#fde047', size = 22) {
    this.list.push({ s, x, y, life: 0.8, color, size });
  }
  update(dt: number) {
    for (const p of this.list) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
  render(g: G2) {
    for (const p of this.list) {
      text(g, p.s, p.x, p.y, { size: p.size, color: p.color, stroke: 'rgba(0,0,0,0.5)', alpha: Math.min(1, p.life * 2) });
    }
  }
}

/** Partículas simples. */
export class Sparks {
  private list: { x: number; y: number; vx: number; vy: number; life: number; c: string; r: number }[] = [];
  burst(x: number, y: number, color: string, n = 10, speed = 140) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + i;
      const s = speed * (0.4 + ((i * 37) % 10) / 12);
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, c: color, r: 3 });
    }
  }
  update(dt: number) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
  render(g: G2) {
    for (const p of this.list) {
      g.globalAlpha = Math.max(0, p.life * 2);
      circle(g, p.x, p.y, p.r, p.c);
    }
    g.globalAlpha = 1;
  }
}

export interface KeypadKey {
  label: string;
  value: string;
  rect: Rect;
  color: string;
}

/** Teclado numérico en pantalla (opcionalmente con dígitos de color). */
export class Keypad {
  keys: KeypadKey[] = [];
  private pressed = new Map<string, number>();
  constructor(area: Rect, opts: { colored?: boolean; backspace?: boolean; enter?: string } = {}) {
    const labels: string[][] = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      [opts.backspace ? '⌫' : '', '0', opts.enter ?? ''],
    ];
    const gap = 8;
    const kw = (area.w - gap * 2) / 3;
    const kh = (area.h - gap * 3) / 4;
    labels.forEach((row, r) =>
      row.forEach((l, c) => {
        if (!l) return;
        const isDigit = /\d/.test(l);
        this.keys.push({
          label: l,
          value: l === '⌫' ? 'back' : l === opts.enter ? 'enter' : l,
          rect: { x: area.x + c * (kw + gap), y: area.y + r * (kh + gap), w: kw, h: kh },
          color: opts.colored && isDigit ? DIGIT_COLORS[+l] : isDigit ? '#334155' : '#7c3aed',
        });
      }),
    );
  }
  hit(x: number, y: number): string | null {
    for (const k of this.keys) {
      if (inRect(k.rect, x, y)) {
        this.pressed.set(k.value, 0.1);
        return k.value;
      }
    }
    return null;
  }
  update(dt: number) {
    for (const [k, v] of this.pressed) {
      if (v - dt <= 0) this.pressed.delete(k);
      else this.pressed.set(k, v - dt);
    }
  }
  render(g: G2) {
    for (const k of this.keys) button(g, k.rect, k.label, { color: k.color, size: 28, down: this.pressed.has(k.value) });
  }
}

export const DIGIT_COLORS = ['#64748b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#a16207'];

/** Cuadro de instrucciones dentro del canvas: "Toca para..." */
export function hint(g: G2, s: string, y = 600, alpha = 1) {
  text(g, s, W / 2, y, { size: 16, color: '#fff', alpha: alpha * 0.85, stroke: 'rgba(0,0,0,0.4)' });
}
