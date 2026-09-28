import { Swipe, bg, emoji, fillRR, text, W, type Dir, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const CS = 20;
const COLS = 18;
const ROWS = 26;
const OX = 0;
const OY = 90;
const V: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const OPP: Record<Dir, Dir> = { left: 'right', right: 'left', up: 'down', down: 'up' };

class Serpiente extends Game {
  body: [number, number][] = [
    [8, 14],
    [7, 14],
    [6, 14],
  ];
  dir: Dir = 'right';
  queue: Dir[] = [];
  fruit: [number, number] = [12, 14];
  rocks: [number, number][] = [];
  private acc = 0;
  private fr;
  private swipe = new Swipe(20);
  eaten = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.fr = ctx.rng.fork('frutas');
    this.placeFruit();
  }

  private occupied(c: number, r: number) {
    return this.body.some(([x, y]) => x === c && y === r) || this.rocks.some(([x, y]) => x === c && y === r);
  }

  private placeFruit() {
    for (let i = 0; i < 200; i++) {
      const c = this.fr.int(0, COLS - 1);
      const r = this.fr.int(0, ROWS - 1);
      if (!this.occupied(c, r)) {
        this.fruit = [c, r];
        return;
      }
    }
  }

  private addRock() {
    const [hx, hy] = this.body[0];
    for (let i = 0; i < 200; i++) {
      const c = this.fr.int(0, COLS - 1);
      const r = this.fr.int(0, ROWS - 1);
      if (!this.occupied(c, r) && (c !== this.fruit[0] || r !== this.fruit[1]) && Math.abs(c - hx) + Math.abs(r - hy) > 6) {
        this.rocks.push([c, r]);
        return;
      }
    }
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.eaten);
    const d = this.swipe.update(this.input);
    if (d) {
      const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
      if (d !== last && d !== OPP[last] && this.queue.length < 2) this.queue.push(d);
    }
    const rate = Math.min(14, 6 + this.eaten * 0.32);
    this.acc += dt * rate;
    while (this.acc >= 1 && !this.over) {
      this.acc -= 1;
      if (this.queue.length) this.dir = this.queue.shift()!;
      const [dx, dy] = V[this.dir];
      const nx = this.body[0][0] + dx;
      const ny = this.body[0][1] + dy;
      const grow = nx === this.fruit[0] && ny === this.fruit[1];
      const tail = grow ? 0 : 1;
      const hitSelf = this.body.slice(0, this.body.length - tail).some(([x, y]) => x === nx && y === ny);
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || hitSelf || this.rocks.some(([x, y]) => x === nx && y === ny)) {
        this.sfx.play('hit');
        this.shake();
        return this.finish(this.eaten);
      }
      this.body.unshift([nx, ny]);
      if (grow) {
        this.eaten++;
        this.score = this.eaten;
        this.sfx.play('coin');
        this.popups.add('+1', OX + nx * CS + 10, OY + ny * CS, '#fde047', 18);
        this.placeFruit();
        if (this.eaten % 3 === 0) this.addRock();
      } else this.body.pop();
    }
  }

  protected draw(g: G2) {
    bg(g, '#14532d');
    fillRR(g, { x: OX, y: OY, w: COLS * CS, h: ROWS * CS }, 0, '#166534');
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ((r + c) % 2) {
      g.fillStyle = 'rgba(0,0,0,.08)';
      g.fillRect(OX + c * CS, OY + r * CS, CS, CS);
    }
    for (const [c, r] of this.rocks) emoji(g, '🪨', OX + c * CS + CS / 2, OY + r * CS + CS / 2, CS);
    emoji(g, '🍎', OX + this.fruit[0] * CS + CS / 2, OY + this.fruit[1] * CS + CS / 2, CS + 2);
    this.body.forEach(([c, r], i) => {
      const k = 1 - (i / this.body.length) * 0.4;
      fillRR(g, { x: OX + c * CS + 1, y: OY + r * CS + 1, w: CS - 2, h: CS - 2 }, i === 0 ? 9 : 6, i === 0 ? '#facc15' : `rgb(${Math.round(132 * k)},${Math.round(204 * k)},22)`);
    });
    const [hx, hy] = this.body[0];
    emoji(g, '🐍', OX + hx * CS + CS / 2, OY + hy * CS + CS / 2, CS);
    text(g, String(this.eaten), W / 2, 45, { size: 44, stroke: 'rgba(0,0,0,.4)' });
  }
}

export const create = (ctx: GameCtx) => new Serpiente(ctx);
