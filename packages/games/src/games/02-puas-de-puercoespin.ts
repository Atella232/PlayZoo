import { bg, emoji, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const WALL = 34;
const TOP = 100;
const BOT = 590;
const SLOTS = 11;
const SLOT_H = (BOT - TOP) / SLOTS;

class Puas extends Game {
  side: 0 | 1 = 0; // pared donde está la púa móvil
  y = (TOP + BOT) / 2;
  dir: 1 | -1 = 1;
  fixed: boolean[] = [];
  shot: { y: number; t: number; toSide: number } | null = null;
  private pr;
  count = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.pr = ctx.rng.fork('patron');
    this.regen();
  }

  private regen() {
    const k = Math.min(8, 3 + Math.floor(this.count / 2));
    const idx = this.pr.shuffle([...Array(SLOTS).keys()]).slice(0, k);
    this.fixed = Array.from({ length: SLOTS }, (_, i) => idx.includes(i));
  }

  private get speed() {
    return Math.min(720, 250 + this.count * 16);
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.count);
    if (this.shot) {
      this.shot.t += dt / 0.11;
      if (this.shot.t >= 1) {
        const slot = Math.max(0, Math.min(SLOTS - 1, Math.floor((this.shot.y - TOP) / SLOT_H)));
        if (this.fixed[slot]) {
          this.sfx.play('hit');
          this.shake();
          return this.finish(this.count);
        }
        this.count++;
        this.score = this.count;
        this.sfx.play('coin');
        this.popups.add('+1', W / 2, this.shot.y, '#fde047');
        this.side = this.shot.toSide as 0 | 1;
        this.y = this.shot.y;
        this.shot = null;
        this.regen();
      }
      return;
    }
    this.y += this.dir * this.speed * dt;
    if (this.y > BOT - 14) {
      this.y = BOT - 14;
      this.dir = -1;
    }
    if (this.y < TOP + 14) {
      this.y = TOP + 14;
      this.dir = 1;
    }
    if (this.input.tapped() || this.input.keyDowns().length) {
      this.shot = { y: this.y, t: 0, toSide: 1 - this.side };
      this.sfx.play('jump');
    }
  }

  protected draw(g: G2) {
    bg(g, '#fef3c7', '#fde68a');
    g.fillStyle = '#78350f';
    g.fillRect(0, 0, WALL, H);
    g.fillRect(W - WALL, 0, WALL, H);
    g.fillStyle = '#92400e';
    g.fillRect(0, 0, W, TOP - 30);
    g.fillRect(0, BOT + 24, W, H);
    const fixedSide = this.shot ? this.shot.toSide : 1 - this.side;
    const wallX = fixedSide === 0 ? WALL : W - WALL;
    const sgn = fixedSide === 0 ? 1 : -1;
    for (let i = 0; i < SLOTS; i++) {
      if (!this.fixed[i]) continue;
      const y0 = TOP + i * SLOT_H;
      g.fillStyle = '#b91c1c';
      g.beginPath();
      g.moveTo(wallX, y0 + 3);
      g.lineTo(wallX + sgn * 46, y0 + SLOT_H / 2);
      g.lineTo(wallX, y0 + SLOT_H - 3);
      g.closePath();
      g.fill();
    }
    // púa móvil
    const mx = this.side === 0 ? WALL + 8 : W - WALL - 8;
    let px = mx;
    if (this.shot) {
      const tx = this.shot.toSide === 0 ? WALL + 8 : W - WALL - 8;
      px = mx + (tx - mx) * this.shot.t;
    }
    const py = this.shot ? this.shot.y : this.y;
    if (!this.shot) {
      g.setLineDash([6, 8]);
      g.strokeStyle = 'rgba(0,0,0,.25)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(WALL, py);
      g.lineTo(W - WALL, py);
      g.stroke();
      g.setLineDash([]);
    }
    emoji(g, '🦔', px, py, 34, this.side === 0 || (this.shot && this.shot.toSide === 1) ? Math.PI / 2 * 0 : 0, this.shot ? this.shot.toSide === 0 : this.side === 1);
    text(g, String(this.count), W / 2, 56, { size: 56, color: '#78350f', stroke: '#fff' });
  }
}

export const create = (ctx: GameCtx) => new Puas(ctx);
