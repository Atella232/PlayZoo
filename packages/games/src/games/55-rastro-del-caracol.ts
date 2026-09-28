import { bg, circle, emoji, lives, line, pointSegment, text, W, dist, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const COLS = 4;
const ROWS = 6;
const CW = 80;
const AX = (W - COLS * CW) / 2;
const AY = 150;
const TOL = 36;
const CORRIDOR = 46;

interface P {
  x: number;
  y: number;
}

class Caracol extends Game {
  private pr;
  level = 1;
  pts: P[] = [];
  phase: 'show' | 'trace' | 'ok' | 'fail' = 'show';
  timer = 0;
  shownLen = 0;
  reached = 0;
  points = 0;
  lifes = 3;
  drawn: P[] = [];
  private tracing = false;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.pr = ctx.rng.fork('rastros');
    this.setup();
  }

  private setup() {
    const m = Math.min(12, 2 + this.level);
    const cells = this.pr.shuffle([...Array(COLS * ROWS).keys()]).slice(0, m);
    this.pts = cells.map((c) => ({ x: AX + (c % COLS) * CW + CW / 2 + this.pr.range(-14, 14), y: AY + Math.floor(c / COLS) * CW + CW / 2 + this.pr.range(-14, 14) }));
    this.phase = 'show';
    this.shownLen = 0;
    this.timer = 0.6;
    this.reached = 0;
    this.drawn = [];
    this.tracing = false;
  }

  protected step(dt: number) {
    if (this.t >= 100 || this.lifes <= 0) return this.finish(this.points);
    if (this.phase === 'show') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.shownLen += dt * 3.2;
        if (this.shownLen >= this.pts.length - 1 + 0.6) {
          this.phase = 'trace';
        }
      }
    } else if (this.phase === 'trace') {
      for (const e of this.input.events) {
        if (e.type === 'down' && !this.tracing) {
          if (dist(e.x, e.y, this.pts[0].x, this.pts[0].y) <= TOL + 10) {
            this.tracing = true;
            this.reached = 1;
            this.points++;
            this.drawn = [{ x: e.x, y: e.y }];
            this.sfx.play('tick');
          }
        } else if (e.type === 'move' && this.tracing) {
          this.drawn.push({ x: e.x, y: e.y });
          if (this.reached < this.pts.length) {
            const a = this.pts[this.reached - 1];
            const b = this.pts[this.reached];
            const seg = pointSegment(e.x, e.y, a.x, a.y, b.x, b.y);
            if (dist(e.x, e.y, b.x, b.y) <= TOL) {
              this.reached++;
              this.points++;
              this.sfx.play('tick', 1 + this.reached * 0.05);
            } else if (seg.d > CORRIDOR) {
              this.failRound();
              return;
            }
          }
        } else if (e.type === 'up' && this.tracing) {
          if (this.reached >= this.pts.length) {
            this.phase = 'ok';
            this.timer = 0.7;
            this.sfx.play('ok');
          } else {
            this.failRound();
            return;
          }
        }
      }
      if (this.tracing && this.reached >= this.pts.length && this.phase === 'trace') {
        this.phase = 'ok';
        this.timer = 0.7;
        this.sfx.play('ok');
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.phase === 'ok') this.level++;
        this.setup();
      }
    }
    this.score = this.points;
  }

  private failRound() {
    this.lifes--;
    this.phase = 'fail';
    this.timer = 0.9;
    this.tracing = false;
    this.sfx.play('bad');
    this.shake(5, 0.15);
  }

  protected draw(g: G2) {
    bg(g, '#365314', '#1a2e05');
    emoji(g, '🐌', 50, 70, 56);
    text(g, String(this.points), W / 2, 62, { size: 46 });
    lives(g, this.lifes, 3, W - 14, 30);
    text(g, `Nivel ${this.level}`, W / 2, 112, { size: 16, weight: 700, color: '#d9f99d' });
    // recorrido mostrado
    if (this.phase === 'show' || this.phase === 'fail' || this.phase === 'ok') {
      const upto = this.phase === 'show' ? this.shownLen : this.pts.length;
      for (let i = 0; i < this.pts.length - 1; i++) {
        const f = Math.max(0, Math.min(1, upto - i));
        if (f <= 0) break;
        const a = this.pts[i];
        const b = this.pts[i + 1];
        line(g, a.x, a.y, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, this.phase === 'fail' ? '#fca5a5' : '#bef264', 8);
      }
    }
    this.pts.forEach((p, i) => circle(g, p.x, p.y, 15, this.phase === 'trace' && i < this.reached ? '#84cc16' : i === 0 ? '#facc15' : '#ecfccb', '#3f6212', 3));
    if (this.drawn.length > 1 && this.phase === 'trace') {
      g.beginPath();
      this.drawn.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.strokeStyle = '#fde047';
      g.lineWidth = 6;
      g.lineJoin = 'round';
      g.stroke();
    }
    text(g, this.phase === 'show' ? 'Mira el recorrido' : this.phase === 'trace' ? 'Repítelo desde el punto amarillo' : this.phase === 'ok' ? '¡Bien!' : 'Te saliste', W / 2, 620, { size: 17, weight: 700 });
  }
}

export const create = (ctx: GameCtx) => new Caracol(ctx);
