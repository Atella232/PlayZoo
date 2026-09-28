import { Swipe, bg, emoji, fillRR, formatNumber, rectRect, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const TS = 40;
const COLS = 9;
const OX = (W - COLS * TS) / 2;
const DURATION = 40;

interface Lane {
  road: boolean;
  speed: number; // px/s (con signo)
  spacing: number;
  offset: number;
  car: string;
  deco: number[];
}

class Erizo extends Game {
  private lr;
  lanes: Lane[] = [];
  col = 4;
  row = 0; // fila lógica (0 = salida, crece hacia arriba)
  best = 0;
  camRow = 0;
  private swipe = new Swipe(20);
  idle = 0;
  private hopT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.lr = ctx.rng.fork('calles');
    for (let i = 0; i < 40; i++) this.gen(i);
  }

  private gen(i: number) {
    if (this.lanes[i]) return;
    const road = i > 1 && this.lr.chance(i < 4 ? 0.55 : 0.68);
    const sp = this.lr.range(60, 150 + Math.min(80, i * 2)) * this.lr.sign();
    this.lanes[i] = {
      road,
      speed: road ? sp : 0,
      spacing: this.lr.range(150, 260),
      offset: this.lr.range(0, 300),
      car: this.lr.pick(['🚗', '🚕', '🚙', '🚌', '🚚']),
      deco: road ? [] : [this.lr.int(0, COLS - 1), this.lr.int(0, COLS - 1)].filter((c) => c !== 4),
    };
  }

  /** x del centro de cada coche del carril en el instante t. */
  private carsOf(l: Lane, t: number): number[] {
    const span = COLS * TS + 160;
    const n = Math.ceil(span / l.spacing) + 1;
    const out: number[] = [];
    for (let k = 0; k < n; k++) {
      let x = (l.offset + k * l.spacing + l.speed * t) % (n * l.spacing);
      if (x < 0) x += n * l.spacing;
      out.push(OX - 80 + x);
    }
    return out;
  }

  private blockedDeco(col: number, row: number) {
    const l = this.lanes[row];
    return !!l && !l.road && l.deco.includes(col);
  }

  protected step(dt: number) {
    if (this.t >= DURATION) return this.finish(this.best);
    this.hopT = Math.max(0, this.hopT - dt);
    const d = this.swipe.update(this.input);
    if (d) {
      let nc = this.col;
      let nr = this.row;
      if (d === 'left') nc--;
      if (d === 'right') nc++;
      if (d === 'up') nr++;
      if (d === 'down') nr--;
      if (nc >= 0 && nc < COLS && nr >= 0 && nr >= this.best - 4 && !this.blockedDeco(nc, nr)) {
        this.col = nc;
        this.row = nr;
        this.idle = 0;
        this.hopT = 0.1;
        this.sfx.play('tick');
        if (nr > this.best) {
          this.best = nr;
          this.score = nr;
          for (let i = 0; i < 12; i++) this.gen(nr + i + 30);
        }
      }
    }
    // los taps simples cuentan como "adelante"
    this.camRow += (this.best - this.camRow) * Math.min(1, 6 * dt);
    this.idle += dt;
    if (this.idle > 3) {
      this.sfx.play('lose');
      this.popups.add('¡El águila!', W / 2, 300, '#fca5a5', 26);
      return this.finish(this.best);
    }
    const l = this.lanes[this.row];
    if (l?.road) {
      const px = OX + this.col * TS + TS / 2;
      for (const cx of this.carsOf(l, this.t)) {
        if (rectRect(px - 12, 0, 24, 1, cx - 26, 0, 52, 1)) {
          this.sfx.play('hit');
          this.shake(9, 0.3);
          return this.finish(this.best);
        }
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#4ade80');
    const rowY = (r: number) => 480 - (r - this.camRow) * TS;
    for (let r = Math.max(0, Math.floor(this.camRow) - 3); r < this.camRow + 14; r++) {
      const l = this.lanes[r];
      if (!l) continue;
      const y = rowY(r);
      fillRR(g, { x: 0, y: y - TS / 2, w: W, h: TS }, 0, l.road ? '#4b5563' : r % 2 ? '#86efac' : '#4ade80');
      if (l.road) {
        g.fillStyle = 'rgba(255,255,255,.35)';
        for (let x = 0; x < W; x += 40) g.fillRect(x, y + TS / 2 - 2, 22, 3);
        for (const cx of this.carsOf(l, this.t)) emoji(g, l.car, cx, y, 36, 0, l.speed > 0);
      } else for (const c of l.deco) emoji(g, '🌳', OX + c * TS + TS / 2, y, 34);
    }
    const hop = this.hopT > 0 ? Math.sin((this.hopT / 0.1) * Math.PI) * 10 : 0;
    emoji(g, '🦔', OX + this.col * TS + TS / 2, rowY(this.row) - hop, 34);
    text(g, String(this.best), W / 2, 60, { size: 56, stroke: 'rgba(0,0,0,.4)' });
    text(g, formatNumber(Math.max(0, DURATION - this.t), 0) + ' s', W - 14, 26, { size: 20, align: 'right', stroke: 'rgba(0,0,0,.4)' });
    void H;
  }
}

export const create = (ctx: GameCtx) => new Erizo(ctx);
