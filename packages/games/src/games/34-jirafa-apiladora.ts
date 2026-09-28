import { bg, emoji, fillRR, text, W, H, clamp, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const BH = 24;
const START_W = 200;
const BASE_Y = 560;
const LIMIT = 40;

interface Block {
  x: number;
  w: number;
  hue: number;
}

class Jirafa extends Game {
  stack: Block[] = [{ x: (W - START_W) / 2, w: START_W, hue: 30 }];
  cur: Block;
  dir: 1 | -1;
  count = 0;
  camY = 0;
  falling: { x: number; w: number; y: number; vy: number; hue: number }[] = [];

  constructor(ctx: GameCtx) {
    super(ctx);
    this.dir = ctx.rng.sign();
    this.cur = { x: this.dir > 0 ? -START_W : W, w: START_W, hue: 40 };
  }

  private get speed() {
    return Math.min(560, 230 + this.count * 4);
  }

  protected step(dt: number) {
    const top = this.stack[this.stack.length - 1];
    this.cur.x += this.dir * this.speed * dt;
    if (this.cur.x + this.cur.w > W + 30) this.dir = -1;
    if (this.cur.x < -30) this.dir = 1;
    for (const f of this.falling) {
      f.vy += 1400 * dt;
      f.y += f.vy * dt;
    }
    this.falling = this.falling.filter((f) => f.y < H + 200);
    // cámara suave
    const target = Math.max(0, (this.stack.length - 8) * BH);
    this.camY += (target - this.camY) * Math.min(1, 6 * dt);

    if (this.t >= LIMIT) return this.finish(this.count);

    if (this.input.tapped() || this.input.keyDowns().length) {
      const l = Math.max(this.cur.x, top.x);
      const r = Math.min(this.cur.x + this.cur.w, top.x + top.w);
      const yBlock = BASE_Y - this.stack.length * BH;
      if (r - l <= 0) {
        this.falling.push({ x: this.cur.x, w: this.cur.w, y: yBlock, vy: 0, hue: this.cur.hue });
        this.sfx.play('lose');
        return this.finish(this.count);
      }
      const perfect = Math.abs(this.cur.x - top.x) < 4;
      let nb: Block;
      if (perfect) {
        nb = { x: top.x, w: Math.min(START_W, top.w + 3), hue: this.cur.hue };
        this.sfx.play('win', 1 + Math.min(1, this.count / 60));
        this.popups.add('¡Perfecto!', W / 2, 300, '#86efac', 20);
      } else {
        nb = { x: l, w: r - l, hue: this.cur.hue };
        const cutX = this.cur.x < top.x ? this.cur.x : r;
        const cutW = this.cur.w - (r - l);
        this.falling.push({ x: cutX, w: cutW, y: yBlock, vy: 0, hue: this.cur.hue });
        this.sfx.play('tick', 1 + this.count / 80);
      }
      this.stack.push(nb);
      this.count++;
      this.score = this.count;
      const w = nb.w;
      // el siguiente bloque entra desde el lado contrario, cerca de la torre, para poder encadenar toques rápidos
      this.dir = (-this.dir) as 1 | -1;
      this.cur = { x: nb.x - this.dir * w * 0.3, w, hue: (this.cur.hue + 9) % 360 };
    }
  }

  protected draw(g: G2) {
    bg(g, '#0ea5e9', '#bae6fd');
    g.save();
    g.translate(0, this.camY);
    emoji(g, '🦒', 60, BASE_Y + 24, 70);
    this.stack.forEach((b, i) => {
      const y = BASE_Y - (i + 1) * BH;
      fillRR(g, { x: b.x, y, w: b.w, h: BH - 2 }, 6, `hsl(${b.hue},80%,55%)`);
    });
    const cy = BASE_Y - (this.stack.length + 1) * BH;
    fillRR(g, { x: this.cur.x, y: cy, w: this.cur.w, h: BH - 2 }, 6, `hsl(${this.cur.hue},85%,60%)`);
    for (const f of this.falling) fillRR(g, { x: f.x, y: f.y, w: f.w, h: BH - 2 }, 6, `hsl(${f.hue},70%,50%)`);
    g.restore();
    text(g, String(this.count), W / 2, 70, { size: 60, stroke: 'rgba(0,0,0,.35)' });
    text(g, `${Math.max(0, Math.ceil(LIMIT - this.t))} s`, W - 14, 26, { size: 22, align: 'right', stroke: 'rgba(0,0,0,.35)' });
    void clamp;
  }
}

export const create = (ctx: GameCtx) => new Jirafa(ctx);
