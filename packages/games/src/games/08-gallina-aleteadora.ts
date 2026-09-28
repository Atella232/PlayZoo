import { bg, emoji, formatNumber, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const HY = 460;
const STEP = 150;

interface WP {
  y: number; // y del mundo (crece al subir)
  cx: number;
  w: number;
}

class Gallina extends Game {
  x = W / 2;
  vx = 0;
  climb = 0; // px subidos
  wps: WP[] = [];
  private sr;
  wind = 0;
  private windTarget = 0;
  private windIn = 3;
  private flap = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('desfiladero');
    this.wps.push({ y: -400, cx: W / 2, w: 300 });
    this.wps.push({ y: -400 + STEP, cx: W / 2, w: 300 });
    this.extend();
  }

  private extend() {
    while (this.wps[this.wps.length - 1].y < this.climb + 900) {
      const last = this.wps[this.wps.length - 1];
      const m = last.y / 50;
      const w = Math.max(128, 260 - m * 0.5);
      const cx = Math.max(w / 2 + 12, Math.min(W - w / 2 - 12, last.cx + this.sr.range(-70, 70)));
      this.wps.push({ y: last.y + STEP, cx, w });
    }
    while (this.wps.length > 6 && this.wps[2].y < this.climb - 400) this.wps.shift();
  }

  private at(wy: number) {
    for (let i = 0; i < this.wps.length - 1; i++) {
      const a = this.wps[i];
      const b = this.wps[i + 1];
      if (wy >= a.y && wy <= b.y) {
        const t = (wy - a.y) / (b.y - a.y);
        return { cx: a.cx + (b.cx - a.cx) * t, w: a.w + (b.w - a.w) * t };
      }
    }
    const l = this.wps[this.wps.length - 1];
    return { cx: l.cx, w: l.w };
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    this.flap = Math.max(0, this.flap - dt * 6);
    const v = Math.min(240, 140 + this.t * 1.8);
    this.climb += v * dt;
    this.windIn -= dt;
    if (this.windIn <= 0) {
      this.windIn = this.sr.range(2, 4);
      const m = this.climb / 50;
      this.windTarget = this.sr.chance(0.3) ? 0 : this.sr.sign() * this.sr.range(40, 90 + Math.min(120, m));
    }
    this.wind += (this.windTarget - this.wind) * Math.min(1, 1.5 * dt);
    const taps: number[] = this.input.downs().map((e) => (e.x < W / 2 ? -1 : 1));
    for (const k of this.input.keyDowns()) taps.push(k === 'ArrowLeft' ? -1 : 1);
    for (const d of taps) {
      this.vx = Math.max(-260, Math.min(260, this.vx + d * 230));
      this.flap = 1;
      this.sfx.play('jump', 1 + d * 0.15);
    }
    this.vx += this.wind * dt;
    this.vx *= 1 - Math.min(1, 1.3 * dt);
    this.x += this.vx * dt;
    this.extend();
    const c = this.at(this.climb + 0);
    if (Math.abs(this.x - c.cx) > c.w / 2 - 14) {
      this.sfx.play('hit');
      this.shake();
      return this.finish(this.score);
    }
    this.score = Math.round((this.climb / 50) * 10) / 10;
  }

  protected draw(g: G2) {
    bg(g, '#e0f2fe', '#7dd3fc');
    // paredes del desfiladero
    const rows: { y: number; c: number; w: number }[] = [];
    for (let sy = H + 20; sy >= -20; sy -= 20) {
      const wy = this.climb + (HY - sy);
      const r = this.at(wy);
      rows.push({ y: sy, c: r.cx, w: r.w });
    }
    g.fillStyle = '#78716c';
    g.beginPath();
    g.moveTo(0, H + 20);
    rows.forEach((r) => g.lineTo(r.c - r.w / 2, r.y));
    g.lineTo(0, -20);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(W, H + 20);
    rows.forEach((r) => g.lineTo(r.c + r.w / 2, r.y));
    g.lineTo(W, -20);
    g.closePath();
    g.fill();
    g.strokeStyle = '#a8a29e';
    g.lineWidth = 4;
    g.beginPath();
    rows.forEach((r, i) => (i ? g.lineTo(r.c - r.w / 2, r.y) : g.moveTo(r.c - r.w / 2, r.y)));
    g.stroke();
    g.beginPath();
    rows.forEach((r, i) => (i ? g.lineTo(r.c + r.w / 2, r.y) : g.moveTo(r.c + r.w / 2, r.y)));
    g.stroke();
    // viento
    if (Math.abs(this.wind) > 25) text(g, this.wind > 0 ? '💨 →' : '← 💨', W / 2, 110, { size: 24, alpha: Math.min(1, Math.abs(this.wind) / 80) });
    emoji(g, '🐔', this.x, HY, 44, this.vx * 0.0018 - this.flap * 0.15 * Math.sign(this.vx));
    text(g, formatNumber(this.score, 0) + ' m', W / 2, 44, { size: 34, stroke: 'rgba(0,0,0,.4)' });
    text(g, 'Toca a izquierda o derecha', W / 2, 620, { size: 14, weight: 700, alpha: this.t < 4 ? 1 : 0.2, stroke: 'rgba(0,0,0,.4)' });
  }
}

export const create = (ctx: GameCtx) => new Gallina(ctx);
