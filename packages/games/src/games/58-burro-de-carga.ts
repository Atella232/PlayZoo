import { Dpad, Swipe, bg, button, emoji, fillRR, inRect, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { generateLevel, isSolved, move, type SokoLevel } from '../kits/sokoban';
import { Game } from '../kits/base';

const RESET: Rect = { x: 20, y: 590, w: 110, h: 40 };

class Burro extends Game {
  private lr;
  lvl = 0;
  level!: SokoLevel;
  player = 0;
  boxes: number[] = [];
  points = 0;
  private onGoalPrev = 0;
  pad = new Dpad(W - 90, 560, 40, 6);
  swipe = new Swipe(20);
  solvedT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.lr = ctx.rng.fork('niveles');
    this.load();
  }

  private load() {
    const i = this.lvl;
    const nb = Math.min(3, 1 + Math.floor(i / 2));
    const iw = i < 3 ? 4 : i < 6 ? 5 : 6;
    const ih = i < 3 ? 4 : 5;
    this.level = generateLevel(this.lr, iw, ih, nb, 16 + i * 6, i < 2 ? 0 : Math.min(4, i - 1));
    this.reset();
  }

  private reset() {
    this.player = this.level.player;
    this.boxes = this.level.boxes.slice();
    this.onGoalPrev = this.boxes.filter((b) => this.level.goals.includes(b)).length;
    this.solvedT = 0;
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.points);
    this.pad.update(dt);
    if (this.solvedT > 0) {
      this.solvedT -= dt;
      if (this.solvedT <= 0) {
        this.lvl++;
        this.load();
      }
      return;
    }
    for (const e of this.input.downs()) if (inRect(RESET, e.x, e.y)) this.reset();
    const d = this.pad.poll(this.input) ?? this.swipe.update(this.input);
    if (d) {
      const [dx, dy] = d === 'left' ? [-1, 0] : d === 'right' ? [1, 0] : d === 'up' ? [0, -1] : [0, 1];
      const r = move(this.level, this.player, this.boxes, dx, dy);
      if (r) {
        this.player = r.player;
        this.boxes = r.boxes;
        if (r.pushed) {
          this.sfx.play('tick');
          const on = this.boxes.filter((b) => this.level.goals.includes(b)).length;
          if (on > this.onGoalPrev) {
            this.points += on - this.onGoalPrev;
            this.sfx.play('ok');
            this.popups.add('+1', W / 2, 150, '#fde047');
          }
          this.onGoalPrev = on;
        }
        if (isSolved(this.level, this.boxes)) {
          this.points += 3;
          this.solvedT = 0.8;
          this.popups.add('¡Nivel! +3', W / 2, 190, '#86efac', 28);
          this.sfx.play('win');
        }
      }
    }
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#57534e', '#292524');
    text(g, String(this.points), W / 2, 50, { size: 44 });
    text(g, `${Math.max(0, Math.ceil(60 - this.t))} s`, W - 14, 26, { size: 20, align: 'right' });
    text(g, `Nivel ${this.lvl + 1}`, 14, 26, { size: 18, align: 'left', weight: 700, color: '#d6d3d1' });
    const L = this.level;
    const ts = Math.min(52, 320 / L.w, 330 / L.h);
    const ox = (W - L.w * ts) / 2;
    const oy = 100 + (350 - L.h * ts) / 2;
    for (let i = 0; i < L.w * L.h; i++) {
      const x = ox + (i % L.w) * ts;
      const y = oy + Math.floor(i / L.w) * ts;
      if (L.walls[i]) fillRR(g, { x, y, w: ts - 1, h: ts - 1 }, 6, '#78716c');
      else {
        fillRR(g, { x, y, w: ts - 1, h: ts - 1 }, 6, '#d6c9a8');
        if (L.goals.includes(i)) {
          g.beginPath();
          g.arc(x + ts / 2, y + ts / 2, ts * 0.2, 0, Math.PI * 2);
          g.fillStyle = '#ef4444';
          g.fill();
        }
      }
    }
    for (const b of this.boxes) {
      const x = ox + (b % L.w) * ts;
      const y = oy + Math.floor(b / L.w) * ts;
      if (L.goals.includes(b)) fillRR(g, { x, y, w: ts - 1, h: ts - 1 }, 6, 'rgba(34,197,94,.55)');
      emoji(g, '📦', x + ts / 2, y + ts / 2, ts * 0.78);
    }
    emoji(g, '🐴', ox + (this.player % L.w) * ts + ts / 2, oy + Math.floor(this.player / L.w) * ts + ts / 2, ts * 0.8);
    button(g, RESET, '↺ Reintentar', { color: '#57534e', size: 14 });
    this.pad.draw(g, '#57534e');
  }
}

export const create = (ctx: GameCtx) => new Burro(ctx);
