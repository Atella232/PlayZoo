import { bg, emoji, lives, text, W, dist, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

interface Hex {
  x: number;
  y: number;
}

class Panal extends Game {
  private pr;
  level = 1;
  cols = 3;
  rows = 3;
  r = 40;
  hexes: Hex[] = [];
  pattern: number[] = [];
  found = new Set<number>();
  phase: 'intro' | 'show' | 'input' | 'ok' = 'intro';
  timer = 0.8;
  lifes = 3;
  points = 0;
  wrong = -1;
  wrongT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.pr = ctx.rng.fork('patrones');
    this.setup();
  }

  private setup() {
    const L = this.level;
    this.cols = Math.min(6, 3 + Math.floor((L - 1) / 3));
    this.rows = Math.min(7, 3 + Math.floor(L / 3));
    const avail = W - 40;
    this.r = Math.min(46, avail / (this.cols * 1.75 + 0.9));
    const w = this.r * Math.sqrt(3);
    const h = this.r * 1.5;
    const totalW = this.cols * w + w / 2;
    const totalH = this.rows * h + this.r / 2;
    const ox = (W - totalW) / 2 + w / 2;
    const oy = 140 + (420 - totalH) / 2 + this.r;
    this.hexes = [];
    for (let rr = 0; rr < this.rows; rr++) for (let c = 0; c < this.cols; c++) this.hexes.push({ x: ox + c * w + (rr % 2 ? w / 2 : 0), y: oy + rr * h });
    const k = Math.min(Math.floor(this.hexes.length * 0.6), 2 + Math.floor(L * 0.9));
    this.pattern = this.pr.shuffle(this.hexes.map((_, i) => i)).slice(0, k);
    this.found.clear();
    this.phase = 'show';
    this.timer = 1.2 + k * 0.08;
  }

  protected step(dt: number) {
    if (this.t >= 90 || this.lifes <= 0) return this.finish(this.points);
    this.wrongT = Math.max(0, this.wrongT - dt);
    if (this.phase === 'show') {
      this.timer -= dt;
      if (this.timer <= 0) this.phase = 'input';
    } else if (this.phase === 'input') {
      for (const e of this.input.downs()) {
        const i = this.hexes.findIndex((h) => dist(h.x, h.y, e.x, e.y) < this.r * 0.92);
        if (i < 0 || this.found.has(i)) continue;
        if (this.pattern.includes(i)) {
          this.found.add(i);
          this.points++;
          this.sfx.play('tick', 1 + this.found.size * 0.06);
          if (this.found.size === this.pattern.length) {
            this.phase = 'ok';
            this.timer = 0.6;
            this.sfx.play('ok');
          }
        } else {
          this.lifes--;
          this.wrong = i;
          this.wrongT = 0.5;
          this.sfx.play('bad');
          this.shake(5, 0.15);
          this.phase = 'ok';
          this.timer = 0.9;
          this.level = Math.max(1, this.level); // repite el nivel
          this.retry = true;
        }
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (!this.retry) this.level++;
        this.retry = false;
        this.setup();
      }
    }
    this.score = this.points;
  }
  private retry = false;

  private hex(g: G2, h: Hex, fill: string, stroke: string) {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const x = h.x + Math.cos(a) * (this.r - 2);
      const y = h.y + Math.sin(a) * (this.r - 2);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = stroke;
    g.stroke();
  }

  protected draw(g: G2) {
    bg(g, '#78350f', '#451a03');
    emoji(g, '🐝', 50, 70, 56);
    text(g, String(this.points), W / 2, 62, { size: 46 });
    lives(g, this.lifes, 3, W - 14, 30);
    text(g, `Nivel ${this.level}`, W / 2, 112, { size: 16, weight: 700, color: '#fcd34d' });
    this.hexes.forEach((h, i) => {
      const inPattern = this.pattern.includes(i);
      let fill = '#92400e';
      if (this.phase === 'show' && inPattern) fill = '#fde047';
      else if (this.found.has(i)) fill = '#facc15';
      else if (this.wrong === i && this.wrongT > 0) fill = '#dc2626';
      else if (this.phase === 'ok' && this.retry && inPattern) fill = '#a16207';
      this.hex(g, h, fill, '#f59e0b');
    });
    text(g, this.phase === 'show' ? 'Memoriza el patrón' : this.phase === 'input' ? 'Reprodúcelo' : '', W / 2, 620, { size: 18, weight: 700 });
  }
}

export const create = (ctx: GameCtx) => new Panal(ctx);
