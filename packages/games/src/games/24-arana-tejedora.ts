import { bg, button, circle, emoji, inRect, line, text, W, H, clamp, type G2, type GameCtx, type Rect } from '../kits/prelude';
import { Game } from '../kits/base';

const ROT: Rect = { x: 16, y: 560, w: 150, h: 64 };
const GROW: Rect = { x: W - 166, y: 560, w: 150, h: 64 };
const MAXLEN = 320;
const CATCH = 24;

interface Node {
  x: number;
  y: number;
}

class Arana extends Game {
  private nr;
  nodes: Node[] = [];
  cur: Node;
  ang = -Math.PI / 2;
  len = 0;
  points = 0;
  camY = 0;
  camX = 0;
  private hopT = 0;
  threads: { a: Node; b: Node }[] = [];
  private breakT = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.nr = ctx.rng.fork('nodos');
    this.cur = { x: W / 2, y: 420 };
    this.nodes.push(this.cur);
    for (let i = 0; i < 5; i++) this.spawn();
    this.ang = Math.atan2(this.nodes[1].y - this.cur.y, this.nodes[1].x - this.cur.x) + this.nr.range(-1.2, 1.2);
  }

  private spawn() {
    const base = this.nodes[this.nodes.length - 1];
    const d = this.nr.range(120, 230);
    const a = -Math.PI / 2 + this.nr.range(-1.0, 1.0);
    this.nodes.push({ x: clamp(base.x + Math.cos(a) * d, 40, W - 40), y: base.y + Math.sin(a) * d });
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.points);
    if (this.breakT > 0) {
      this.breakT -= dt;
      if (this.breakT <= 0) this.finish(this.points);
      return;
    }
    this.hopT += dt;
    const rot = this.input.isDownIn(ROT) || this.input.keys.has('ArrowLeft');
    const grow = this.input.isDownIn(GROW) || this.input.keys.has('ArrowRight') || this.input.keys.has(' ');
    if (rot) this.ang += 2.3 * dt;
    if (grow) this.len += 230 * dt;
    else this.len = Math.max(0, this.len - 60 * dt);
    const tx = this.cur.x + Math.cos(this.ang) * this.len;
    const ty = this.cur.y + Math.sin(this.ang) * this.len;
    const hit = this.nodes.find((n) => n !== this.cur && !this.threads.some((t) => t.b === n) && Math.hypot(n.x - tx, n.y - ty) < CATCH && n.y < this.cur.y + 60);
    if (hit) {
      const bonus = Math.max(0, Math.round(8 - this.hopT * 2));
      const pts = 8 + bonus;
      this.points += pts;
      this.score = this.points;
      this.popups.add(`+${pts}`, W / 2, 300, '#fde047', 24);
      this.sfx.play('ok');
      this.threads.push({ a: this.cur, b: hit });
      this.cur = hit;
      this.len = 0;
      this.hopT = 0;
      while (this.nodes.length < this.nodes.indexOf(this.cur) + 6) this.spawn();
      // el siguiente nodo objetivo: apunta hacia arriba
      const nxt = this.nodes[this.nodes.indexOf(this.cur) + 1];
      this.ang = Math.atan2(nxt.y - this.cur.y, nxt.x - this.cur.x) + this.nr.range(-1.3, 1.3);
    } else if (this.len > MAXLEN || tx < 0 || tx > W) {
      this.sfx.play('lose');
      this.breakT = 0.7;
    }
    this.camY += (this.cur.y - 420 - this.camY) * Math.min(1, 4 * dt);
    void H;
    void this.camX;
  }

  protected draw(g: G2) {
    bg(g, '#2e1065', '#0f0a1e');
    g.save();
    g.translate(0, -this.camY);
    for (const t of this.threads.slice(-6)) line(g, t.a.x, t.a.y, t.b.x, t.b.y, 'rgba(255,255,255,.55)', 3);
    const tx = this.cur.x + Math.cos(this.ang) * this.len;
    const ty = this.cur.y + Math.sin(this.ang) * this.len;
    // guía de rotación
    g.setLineDash([3, 8]);
    g.strokeStyle = 'rgba(255,255,255,.2)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(this.cur.x, this.cur.y);
    g.lineTo(this.cur.x + Math.cos(this.ang) * MAXLEN, this.cur.y + Math.sin(this.ang) * MAXLEN);
    g.stroke();
    g.setLineDash([]);
    line(g, this.cur.x, this.cur.y, tx, ty, '#f5f3ff', 4);
    circle(g, tx, ty, 5, '#fde047');
    const idx = this.nodes.indexOf(this.cur);
    this.nodes.forEach((n, i) => {
      if (i < idx - 1 || i > idx + 5) return;
      circle(g, n.x, n.y, 10, n === this.cur ? '#a78bfa' : '#7c3aed', '#ede9fe', 3);
    });
    emoji(g, '🕷️', this.cur.x, this.cur.y, 34);
    g.restore();
    text(g, String(this.points), W / 2, 44, { size: 44, stroke: 'rgba(0,0,0,.5)' });
    button(g, ROT, '↻ Girar', { color: '#6d28d9', size: 20, down: this.input.isDownIn(ROT) });
    button(g, GROW, '⬆ Crecer', { color: '#0f766e', size: 20, down: this.input.isDownIn(GROW) });
    void inRect;
  }
}

export const create = (ctx: GameCtx) => new Arana(ctx);
