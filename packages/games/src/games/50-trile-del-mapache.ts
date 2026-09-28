import { bg, circle, emoji, lerp, easeInOut, inRect, text, W, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const XS = [70, 180, 290];
const CUP_Y = 380;
const CUP_R: Rect[] = XS.map((x) => ({ x: x - 45, y: CUP_Y - 60, w: 90, h: 110 }));

interface Cup {
  pos: number;
  from: number;
  to: number;
}

class Trile extends Game {
  private sr;
  level = 0; // niveles superados
  phase: 'intro' | 'show' | 'shuffle' | 'pick' | 'reveal' = 'intro';
  cups: Cup[] = [0, 1, 2].map((i) => ({ pos: i, from: i, to: i }));
  ball = 0;
  swaps: [number, number][] = [];
  swapT = 0;
  swapDur = 0.5;
  timer = 1;
  lift = -1;
  ok = false;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('mezclas');
    this.startLevel();
  }

  private startLevel() {
    this.cups.forEach((c, i) => {
      c.pos = c.from = c.to = i;
    });
    this.ball = this.sr.int(0, 2);
    const n = 4 + this.level;
    this.swaps = [];
    for (let i = 0; i < n; i++) {
      const a = this.sr.int(0, 2);
      let b = this.sr.int(0, 2);
      while (b === a) b = this.sr.int(0, 2);
      this.swaps.push([a, b]);
    }
    this.swapDur = Math.max(0.17, 0.55 - this.level * 0.032);
    this.phase = 'show';
    this.timer = 1.1;
    this.lift = this.ball;
  }

  protected step(dt: number) {
    if (this.t > 120) return this.finish(this.level);
    if (this.phase === 'show') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.lift = -1;
        this.phase = 'shuffle';
        this.swapT = 0;
        this.startSwap();
      }
    } else if (this.phase === 'shuffle') {
      this.swapT += dt;
      const k = Math.min(1, this.swapT / this.swapDur);
      for (const c of this.cups) c.pos = lerp(c.from, c.to, easeInOut(k));
      if (k >= 1) {
        for (const c of this.cups) c.pos = c.from = c.to;
        this.swaps.shift();
        if (this.swaps.length) {
          this.swapT = 0;
          this.startSwap();
        } else this.phase = 'pick';
      }
    } else if (this.phase === 'pick') {
      for (const e of this.input.downs()) {
        // la copa en cada hueco
        const slot = XS.findIndex((_, i) => inRect(CUP_R[i], e.x, e.y));
        if (slot < 0) continue;
        const cup = this.cups.findIndex((c) => Math.round(c.pos) === slot);
        this.ok = cup === this.ball;
        this.lift = cup;
        this.phase = 'reveal';
        this.timer = 1;
        this.sfx.play(this.ok ? 'ok' : 'bad');
        break;
      }
    } else if (this.phase === 'reveal') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.ok) {
          this.level++;
          this.score = this.level;
          this.startLevel();
        } else this.finish(this.level);
      }
    }
  }

  private startSwap() {
    const [a, b] = this.swaps[0];
    const ca = this.cups.find((c) => Math.round(c.from) === a)!;
    const cb = this.cups.find((c) => Math.round(c.from) === b)!;
    ca.to = b;
    cb.to = a;
  }

  protected draw(g: G2) {
    bg(g, '#0f766e', '#134e4a');
    emoji(g, '🦝', W / 2, 110, 90);
    text(g, `Nivel ${this.level + 1}`, W / 2, 190, { size: 22, weight: 800 });
    text(g, this.phase === 'show' ? '¡Mira la bola!' : this.phase === 'shuffle' ? 'Sigue los vasos…' : this.phase === 'pick' ? '¿Dónde está la bola?' : this.ok ? '¡Bien!' : '¡Fallaste!', W / 2, 240, { size: 26, color: '#99f6e4' });
    this.cups.forEach((c, i) => {
      const x = lerp(XS[0], XS[2], c.pos / 2);
      const lifted = this.lift === i;
      const k = Math.min(1, this.swapT / this.swapDur);
      const off = this.phase === 'shuffle' && c.to !== c.from ? Math.sin(k * Math.PI) * 34 * Math.sign(c.to - c.from) : 0;
      const y = CUP_Y - (lifted ? 70 : 0) - off;
      if (i === this.ball && (lifted || this.phase === 'show')) circle(g, x, CUP_Y + 30, 16, '#ef4444', '#7f1d1d', 3);
      g.fillStyle = '#f59e0b';
      g.strokeStyle = '#92400e';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x - 28, y - 55);
      g.lineTo(x + 28, y - 55);
      g.lineTo(x + 42, y + 45);
      g.lineTo(x - 42, y + 45);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#fbbf24';
      g.fillRect(x - 30, y - 30, 60, 10);
    });
  }
}

export const create = (ctx: GameCtx) => new Trile(ctx);
