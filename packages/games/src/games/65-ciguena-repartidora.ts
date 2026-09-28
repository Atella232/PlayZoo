import { Swipe, bar, bg, emoji, fillRR, inRect, lives, text, W, type Dir, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const KINDS: { dir: Dir; color: string; sym: string; rect: Rect }[] = [
  { dir: 'left', color: '#ef4444', sym: '●', rect: { x: 12, y: 330, w: 92, h: 100 } },
  { dir: 'up', color: '#22c55e', sym: '▲', rect: { x: W / 2 - 46, y: 130, w: 92, h: 100 } },
  { dir: 'right', color: '#3b82f6', sym: '■', rect: { x: W - 104, y: 330, w: 92, h: 100 } },
];

class Ciguena extends Game {
  queue: number[] = [];
  private qr;
  private swipe = new Swipe(24);
  lifes = 3;
  points = 0;
  timeLeft = 3;
  flash: { i: number; ok: boolean; t: number } | null = null;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.qr = ctx.rng.fork('paquetes');
    for (let i = 0; i < 4; i++) this.queue.push(this.qr.int(0, 2));
    this.timeLeft = this.limit();
  }

  private limit() {
    return Math.max(1.05, 3 - this.t * 0.032);
  }

  private answer(dir: Dir) {
    const idx = KINDS.findIndex((k) => k.dir === dir);
    if (idx < 0) return;
    const front = this.queue[0];
    const ok = idx === front;
    this.flash = { i: idx, ok, t: 0.25 };
    if (ok) {
      this.points++;
      this.sfx.play('ok');
      this.popups.add('+1', W / 2, 380, '#fde047');
    } else {
      this.lifes--;
      this.sfx.play('bad');
      this.shake(6, 0.2);
    }
    this.next();
  }

  private next() {
    this.queue.shift();
    this.queue.push(this.qr.int(0, 2));
    this.timeLeft = this.limit();
  }

  protected step(dt: number) {
    if (this.t >= 60 || this.lifes <= 0) return this.finish(this.points);
    if (this.flash) {
      this.flash.t -= dt;
      if (this.flash.t <= 0) this.flash = null;
    }
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.lifes--;
      this.sfx.play('bad');
      this.popups.add('¡Tarde!', W / 2, 380, '#fca5a5');
      this.next();
    }
    for (const e of this.input.downs()) {
      const k = KINDS.find((x) => inRect(x.rect, e.x, e.y));
      if (k) this.answer(k.dir);
    }
    const d = this.swipe.update(this.input);
    if (d && d !== 'down') this.answer(d);
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#e0f2fe', '#7dd3fc');
    emoji(g, '🦢', 56, 70, 64);
    text(g, String(this.points), W / 2, 60, { size: 46, color: '#0c4a6e' });
    text(g, `${Math.max(0, Math.ceil(60 - this.t))} s`, W - 14, 26, { size: 20, align: 'right', color: '#0c4a6e' });
    lives(g, this.lifes, 3, W - 14, 56);
    KINDS.forEach((k, i) => {
      const on = this.flash?.i === i;
      fillRR(g, k.rect, 18, on ? (this.flash!.ok ? '#bbf7d0' : '#fecaca') : '#fff');
      g.lineWidth = 6;
      g.strokeStyle = k.color;
      g.stroke();
      text(g, k.sym, k.rect.x + k.rect.w / 2, k.rect.y + 42, { size: 44, color: k.color });
      text(g, k.dir === 'left' ? '←' : k.dir === 'up' ? '↑' : '→', k.rect.x + k.rect.w / 2, k.rect.y + 82, { size: 22, color: '#334155' });
    });
    // cinta desde abajo
    fillRR(g, { x: W / 2 - 40, y: 340, w: 80, h: 300 }, 0, '#57534e');
    this.queue.slice(0, 4).forEach((q, i) => {
      const y = 380 + i * 68;
      const s = i === 0 ? 1 : 0.8;
      fillRR(g, { x: W / 2 - 30 * s, y: y - 26 * s, w: 60 * s, h: 52 * s }, 10, KINDS[q].color);
      text(g, KINDS[q].sym, W / 2, y, { size: 30 * s, color: '#fff' });
      if (i === 0) emoji(g, '📦', W / 2, y - 30, 22);
    });
    bar(g, 40, 300, W - 80, 12, this.timeLeft / this.limit(), this.timeLeft < 0.7 ? '#ef4444' : '#f59e0b');
    text(g, 'Desliza o toca hacia el color del paquete', W / 2, 610, { size: 14, weight: 700, color: '#0c4a6e' });
  }
}

export const create = (ctx: GameCtx) => new Ciguena(ctx);
