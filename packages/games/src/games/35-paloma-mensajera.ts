import { bg, emoji, fillRR, hint, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const BELT_Y = 400;
const STAMP_X = W / 2;
const ZONE = 34;

interface Letter {
  x: number;
  bad: boolean;
  sealed: boolean;
}

class Paloma extends Game {
  letters: Letter[] = [];
  private spawnAt = 0.2;
  private sr;
  points = 0;
  stampFlash = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('cartas');
  }

  private get speed() {
    return Math.min(330, 140 + this.t * 3.2);
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(Math.max(0, this.points));
    this.stampFlash = Math.max(0, this.stampFlash - dt);
    this.spawnAt -= dt;
    if (this.spawnAt <= 0) {
      this.letters.push({ x: -30, bad: this.sr.chance(0.22), sealed: false });
      this.spawnAt = this.sr.range(0.55, 0.95) * (180 / this.speed) * 1.9;
    }
    for (const l of this.letters) l.x += this.speed * dt;
    this.letters = this.letters.filter((l) => l.x < W + 40);
    for (const _ of this.input.downs()) {
      void _;
      this.stampFlash = 0.15;
      const cand = this.letters.filter((l) => !l.sealed && Math.abs(l.x - STAMP_X) <= ZONE).sort((a, b) => Math.abs(a.x - STAMP_X) - Math.abs(b.x - STAMP_X))[0];
      if (!cand) {
        this.points -= 1;
        this.sfx.play('bad');
        this.popups.add('-1', STAMP_X, BELT_Y - 90, '#fca5a5');
        continue;
      }
      cand.sealed = true;
      if (cand.bad) {
        this.points -= 2;
        this.sfx.play('bad');
        this.popups.add('-2', cand.x, BELT_Y - 60, '#fca5a5');
      } else {
        const perfect = Math.abs(cand.x - STAMP_X) < 9;
        this.points += perfect ? 3 : 1;
        this.sfx.play(perfect ? 'win' : 'ok');
        this.popups.add(perfect ? '¡Perfecto +2!' : '+1', cand.x, BELT_Y - 60, perfect ? '#86efac' : '#fde047');
      }
    }
    this.score = Math.max(0, this.points);
  }

  protected draw(g: G2) {
    bg(g, '#fde68a', '#f59e0b');
    fillRR(g, { x: 0, y: BELT_Y - 26, w: W, h: 52 }, 0, '#57534e');
    g.fillStyle = '#44403c';
    for (let i = 0; i < 20; i++) g.fillRect(((i * 24 + this.t * this.speed) % (W + 24)) - 24, BELT_Y + 20, 12, 6);
    // matasellos
    const dy = this.stampFlash > 0 ? 34 : 0;
    fillRR(g, { x: STAMP_X - 22, y: 160 + dy, w: 44, h: 130 }, 10, '#b91c1c');
    fillRR(g, { x: STAMP_X - 34, y: 285 + dy, w: 68, h: 24 }, 8, '#7f1d1d');
    g.strokeStyle = 'rgba(0,0,0,.25)';
    g.setLineDash([6, 6]);
    g.strokeRect(STAMP_X - ZONE, BELT_Y - 60, ZONE * 2, 120);
    g.setLineDash([]);
    for (const l of this.letters) {
      emoji(g, l.sealed ? '📨' : '✉️', l.x, BELT_Y - 8, 46);
      if (l.bad) text(g, '✖', l.x + 14, BELT_Y - 34, { size: 22, color: '#ef4444', stroke: '#fff' });
    }
    emoji(g, '🕊️', 60, 100, 70);
    text(g, `${this.score}`, W / 2, 70, { size: 54, stroke: 'rgba(0,0,0,.3)' });
    text(g, `${Math.max(0, Math.ceil(60 - this.t))} s`, W - 14, 26, { size: 22, align: 'right', stroke: 'rgba(0,0,0,.3)' });
    hint(g, 'Toca cuando la carta esté bajo el sello. ✖ = no sellar', 560);
  }
}

export const create = (ctx: GameCtx) => new Paloma(ctx);
