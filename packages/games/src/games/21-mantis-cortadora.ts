import { bg, emoji, fillRR, lives, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const CUT_Y = 470;

interface Cube {
  y: number;
  red: boolean;
  cut: boolean;
  half: number;
}

class Mantis extends Game {
  cubes: Cube[] = [];
  private cr;
  private nextIn = 0.3;
  lifes = 3;
  points = 0;
  streak = 0;
  private runLeft = 0;
  private redNext = false;
  blade = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.cr = ctx.rng.fork('cubos');
    this.newRun();
  }

  private newRun() {
    this.runLeft = this.cr.int(2, 5);
    this.redNext = true;
  }

  private get speed() {
    return Math.min(520, 250 + this.t * 5);
  }

  protected step(dt: number) {
    if (this.t >= 60 || this.lifes <= 0) return this.finish(this.points);
    const hold = this.input.down || this.input.keys.has(' ');
    this.blade = hold ? Math.min(1, this.blade + dt * 10) : Math.max(0, this.blade - dt * 10);
    this.nextIn -= dt;
    if (this.nextIn <= 0) {
      const red = this.runLeft <= 0;
      this.cubes.push({ y: -30, red, cut: false, half: 0 });
      if (red) this.newRun();
      else this.runLeft--;
      this.nextIn = (red ? 0.55 : 0.36) * (250 / this.speed) * 1.6;
    }
    const v = this.speed;
    for (const c of this.cubes) {
      const py = c.y;
      c.y += v * dt;
      if (c.cut) c.half += dt;
      if (!c.cut && py < CUT_Y && c.y >= CUT_Y && hold) {
        c.cut = true;
        if (c.red) {
          this.lifes--;
          this.streak = 0;
          this.sfx.play('bad');
          this.shake(6, 0.2);
          this.popups.add('¡Prohibido!', W / 2, CUT_Y - 40, '#fca5a5');
        } else {
          this.streak++;
          const pts = 2 + Math.round(Math.min(this.streak, 12) * 0.5);
          this.points += pts;
          this.sfx.play('tick', 1 + Math.min(this.streak, 15) * 0.05);
          this.popups.add(`+${pts}`, W / 2, CUT_Y - 40, '#fde047', 18);
          this.sparks.burst(W / 2, CUT_Y, '#86efac', 6, 120);
        }
      } else if (!c.cut && py < CUT_Y && c.y >= CUT_Y && !c.red) {
        this.streak = 0; // un verde sin cortar rompe la racha
      }
    }
    this.cubes = this.cubes.filter((c) => c.y < H + 60 && c.half < 0.5);
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#14532d', '#022c22');
    for (const c of this.cubes) {
      const col = c.red ? '#ef4444' : '#22c55e';
      if (c.cut) {
        const d = c.half * 160;
        fillRR(g, { x: W / 2 - 26 - d, y: c.y - 26, w: 26, h: 52 }, 6, col);
        fillRR(g, { x: W / 2 + d, y: c.y - 26, w: 26, h: 52 }, 6, col);
      } else {
        fillRR(g, { x: W / 2 - 26, y: c.y - 26, w: 52, h: 52 }, 8, col);
        if (c.red) text(g, '✖', W / 2, c.y, { size: 28 });
      }
    }
    g.globalAlpha = 0.25 + this.blade * 0.75;
    g.fillStyle = '#e2e8f0';
    g.fillRect(0, CUT_Y - 3, W, 6);
    g.globalAlpha = 1;
    emoji(g, '🦂', 46, CUT_Y + 36, 54, 0, false, 0.4 + this.blade * 0.6);
    emoji(g, '🗡️', W - 46, CUT_Y - 4, 40, -0.6, false, 0.4 + this.blade * 0.6);
    text(g, String(this.points), W / 2, 50, { size: 46, stroke: 'rgba(0,0,0,.4)' });
    lives(g, this.lifes, 3, W - 14, 30);
    if (this.streak > 2) text(g, `Racha x${this.streak}`, W / 2, 92, { size: 16, color: '#fde047' });
    text(g, 'Mantén pulsado para cortar. Suelta ante los ✖', W / 2, 620, { size: 14, weight: 700, alpha: this.t < 6 ? 1 : 0.25 });
  }
}

export const create = (ctx: GameCtx) => new Mantis(ctx);
