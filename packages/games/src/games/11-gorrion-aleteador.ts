import { bg, clamp, emoji, hint, rectRect, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const BIRD_X = 100;
const GRAVITY = 1500;
const FLAP = -430;
const GROUND = 590;
const COL_W = 56;
const SPACING = 190;

interface Col {
  x: number;
  gapY: number;
  gap: number;
  scored: boolean;
}

class Gorrion extends Game {
  y = 300;
  vy = 0;
  started = false;
  cols: Col[] = [];
  private colRng;
  private nextX = 460;
  private scroll = 0;
  private lastGap = 300;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.colRng = ctx.rng.fork('columnas');
    while (this.nextX < W + 300) this.spawn();
  }

  private spawn() {
    const gap = clamp(178 - this.score * 1.6, 128, 178);
    const lo = gap / 2 + 70;
    const hi = GROUND - gap / 2 - 50;
    const gapY = Math.max(lo, Math.min(hi, this.lastGap + this.colRng.range(-130, 130)));
    this.lastGap = gapY;
    this.cols.push({ x: this.nextX, gapY, gap, scored: false });
    this.nextX += SPACING;
  }

  private get speed() {
    return Math.min(215, 125 + this.score * 3);
  }

  protected step(dt: number) {
    if (this.input.tapped() || this.input.keyDowns().length) {
      this.started = true;
      this.vy = FLAP;
      this.sfx.play('jump');
    }
    if (!this.started) {
      this.y = 300 + Math.sin(this.t * 5) * 8;
      return;
    }
    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;
    const dx = this.speed * dt;
    this.scroll += dx;
    this.nextX -= dx;
    for (const c of this.cols) {
      c.x -= dx;
      if (!c.scored && c.x + COL_W < BIRD_X - 12) {
        c.scored = true;
        this.score++;
        this.sfx.play('coin');
        this.popups.add('+1', BIRD_X, this.y - 30);
      }
      const top = rectRect(BIRD_X - 13, this.y - 13, 26, 26, c.x, 0, COL_W, c.gapY - c.gap / 2);
      const bot = rectRect(BIRD_X - 13, this.y - 13, 26, 26, c.x, c.gapY + c.gap / 2, COL_W, GROUND);
      if (top || bot) return this.crash();
    }
    this.cols = this.cols.filter((c) => c.x > -COL_W - 10);
    while (this.nextX < W + 300) this.spawn();
    if (this.y < 6 || this.y > GROUND - 12) this.crash();
    if (this.t > 60) this.finish();
  }

  private crash() {
    this.sfx.play('hit');
    this.shake();
    this.finish();
  }

  protected draw(g: G2) {
    bg(g, '#7dd3fc', '#e0f2fe');
    // nubes
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 170 - this.scroll * 0.2) % (W + 120) + W + 120) % (W + 120) - 40;
      emoji(g, '☁️', cx, 90 + i * 70, 54, 0, false, 0.85);
    }
    for (const c of this.cols) {
      g.fillStyle = '#16a34a';
      g.fillRect(c.x, 0, COL_W, c.gapY - c.gap / 2);
      g.fillRect(c.x, c.gapY + c.gap / 2, COL_W, GROUND);
      g.fillStyle = '#15803d';
      g.fillRect(c.x - 4, c.gapY - c.gap / 2 - 22, COL_W + 8, 22);
      g.fillRect(c.x - 4, c.gapY + c.gap / 2, COL_W + 8, 22);
    }
    g.fillStyle = '#a16207';
    g.fillRect(0, GROUND, W, 60);
    g.fillStyle = '#65a30d';
    g.fillRect(0, GROUND, W, 10);
    emoji(g, '🐦', BIRD_X, this.y, 34, clamp(this.vy / 900, -0.5, 0.9), true);
    text(g, String(this.score), W / 2, 60, { size: 54, stroke: 'rgba(0,0,0,0.4)' });
    if (!this.started) hint(g, 'Toca para aletear', 470);
  }
}

export const create = (ctx: GameCtx) => new Gorrion(ctx);
