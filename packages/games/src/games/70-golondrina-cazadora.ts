import { bg, circle, emoji, lives, text, W, dist, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

interface Target {
  x: number;
  y: number;
  left: number;
  total: number;
}

class Golondrina extends Game {
  targets: Target[] = [];
  private tr;
  private spawnAt = 0.4;
  lifes = 3;
  points = 0;
  combo = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.tr = ctx.rng.fork('objetivos');
  }

  protected step(dt: number) {
    if (this.t >= 60 || this.lifes <= 0) return this.finish(this.points);
    this.spawnAt -= dt;
    if (this.spawnAt <= 0 && this.targets.length < 5) {
      const total = Math.max(0.55, 1.55 - this.t * 0.02);
      let x = 0;
      let y = 0;
      for (let k = 0; k < 10; k++) {
        x = this.tr.range(45, W - 45);
        y = this.tr.range(120, 570);
        if (this.targets.every((t) => dist(t.x, t.y, x, y) > 80)) break;
      }
      this.targets.push({ x, y, left: total, total });
      this.spawnAt = Math.max(0.27, 0.85 - this.t * 0.012);
    }
    for (const t of this.targets) t.left -= dt;
    const gone = this.targets.filter((t) => t.left <= 0);
    if (gone.length) {
      this.lifes -= gone.length;
      this.combo = 0;
      this.sfx.play('bad');
      this.shake(5, 0.15);
      this.targets = this.targets.filter((t) => t.left > 0);
    }
    for (const e of this.input.downs()) {
      const hit = this.targets.filter((t) => dist(t.x, t.y, e.x, e.y) <= 40).sort((a, b) => dist(a.x, a.y, e.x, e.y) - dist(b.x, b.y, e.x, e.y))[0];
      if (hit) {
        const pts = 10 + Math.round(20 * (hit.left / hit.total)) + Math.min(10, this.combo);
        this.points += pts;
        this.combo++;
        this.targets = this.targets.filter((t) => t !== hit);
        this.sfx.play('coin', 1 + Math.min(this.combo, 10) * 0.05);
        this.popups.add(`+${pts}`, hit.x, hit.y - 20, '#fde047');
        this.sparks.burst(hit.x, hit.y, '#facc15', 8);
      } else {
        this.combo = 0;
      }
    }
    this.score = this.points;
  }

  protected draw(g: G2) {
    bg(g, '#38bdf8', '#e0f2fe');
    emoji(g, '☁️', 80, 150, 60, 0, false, 0.7);
    emoji(g, '☁️', 280, 400, 70, 0, false, 0.7);
    for (const t of this.targets) {
      const f = t.left / t.total;
      circle(g, t.x, t.y, 38, 'rgba(255,255,255,.55)');
      g.beginPath();
      g.arc(t.x, t.y, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
      g.lineWidth = 5;
      g.strokeStyle = f < 0.35 ? '#ef4444' : '#0ea5e9';
      g.stroke();
      emoji(g, '🦟', t.x, t.y, 34);
    }
    emoji(g, '🐦', 44, 70, 54);
    text(g, String(this.points), W / 2, 60, { size: 46, color: '#0c4a6e' });
    lives(g, this.lifes, 3, W - 14, 30);
    if (this.combo > 1) text(g, `Racha x${this.combo}`, W / 2, 98, { size: 16, color: '#0369a1' });
    text(g, `${Math.max(0, Math.ceil(60 - this.t))} s`, 14, 620, { size: 16, align: 'left', color: '#0c4a6e' });
  }
}

export const create = (ctx: GameCtx) => new Golondrina(ctx);
