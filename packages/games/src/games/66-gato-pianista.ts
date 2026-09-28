import { bg, emoji, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const COLS = 4;
const CW = W / COLS;
const RH = 150;

interface Row {
  y: number;
  col: number;
  hit: boolean;
}

class Gato extends Game {
  rows: Row[] = [];
  private rr;
  count = 0;
  private topY = 0;
  failCol = -1;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.rr = ctx.rng.fork('teclas');
    let y = 330;
    for (let i = 0; i < 5; i++) {
      this.rows.push({ y, col: this.rr.int(0, COLS - 1), hit: false });
      y -= RH;
    }
    this.topY = y + RH;
  }

  private get speed() {
    return RH * Math.min(6.5, 2.3 + this.count * 0.03);
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.count);
    const v = this.speed;
    for (const r of this.rows) r.y += v * dt;
    this.topY += v * dt;
    while (this.topY > -RH) {
      this.topY -= RH;
      this.rows.push({ y: this.topY, col: this.rr.int(0, COLS - 1), hit: false });
    }
    this.rows = this.rows.filter((r) => r.y < H + RH);
    const target = this.rows.filter((r) => !r.hit).sort((a, b) => b.y - a.y)[0];
    if (target && target.y > H) {
      this.sfx.play('lose');
      return this.finish(this.count);
    }
    for (const e of this.input.downs()) {
      if (!target) break;
      const col = Math.min(COLS - 1, Math.max(0, Math.floor(e.x / CW)));
      if (col === target.col) {
        target.hit = true;
        this.count++;
        this.score = this.count;
        this.sfx.play('tick', 0.8 + (col * 0.15));
        this.sparks.burst(col * CW + CW / 2, Math.min(H - 40, target.y + RH / 2), '#fbbf24', 6);
      } else {
        this.failCol = col;
        this.sfx.play('bad');
        return this.finish(this.count);
      }
      break;
    }
  }

  protected draw(g: G2) {
    bg(g, '#f8fafc');
    g.strokeStyle = '#cbd5e1';
    g.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      g.beginPath();
      g.moveTo(c * CW, 0);
      g.lineTo(c * CW, H);
      g.stroke();
    }
    for (const r of this.rows) {
      g.beginPath();
      g.moveTo(0, r.y);
      g.lineTo(W, r.y);
      g.stroke();
      g.fillStyle = r.hit ? '#cbd5e1' : '#0f172a';
      g.fillRect(r.col * CW + 2, r.y + 2, CW - 4, RH - 4);
      if (!r.hit) emoji(g, '🐱', r.col * CW + CW / 2, r.y + RH / 2, 34);
    }
    if (this.failCol >= 0) {
      g.fillStyle = 'rgba(239,68,68,.5)';
      g.fillRect(this.failCol * CW, 0, CW, H);
    }
    text(g, String(this.count), W / 2, 60, { size: 60, color: '#ef4444', stroke: '#fff' });
  }
}

export const create = (ctx: GameCtx) => new Gato(ctx);
