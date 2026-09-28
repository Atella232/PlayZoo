import { bg, emoji, formatNumber, text, W, clamp, clipPolygon, polygonArea, type G2, type GameCtx, type Pt } from '../kits/prelude';
import { Game } from '../kits/base';

const TARGETS = [0.5, 1 / 3, 0.25];
const LABEL = ['por la mitad (50 %)', 'un tercio', 'un cuarto'];

class Medusa extends Game {
  private mr;
  poly: Pt[] = [];
  round = 0;
  cutFrom: Pt | null = null;
  cutTo: Pt | null = null;
  cutting = false;
  precs: number[] = [];
  pieces: { poly: Pt[]; dx: number; dy: number }[] | null = null;
  phase: 'cut' | 'result' = 'cut';
  timer = 0;
  private lastF = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.mr = ctx.rng.fork('medusas');
    this.newShape();
  }

  private newShape() {
    const n = 14;
    const base = this.mr.range(105, 125);
    const rs: number[] = [];
    for (let i = 0; i < n; i++) rs.push(base * (1 + this.mr.range(-0.22, 0.22)));
    this.poly = rs.map((r, i) => {
      const a = (i / n) * Math.PI * 2;
      const rr = (rs[i] + rs[(i + 1) % n] + rs[(i + n - 1) % n]) / 3;
      void r;
      return { x: W / 2 + Math.cos(a) * rr * 1.08, y: 300 + Math.sin(a) * rr * 0.92 };
    });
    this.cutFrom = this.cutTo = null;
    this.pieces = null;
    this.phase = 'cut';
  }

  private measure(a: Pt, b: Pt) {
    const total = polygonArea(this.poly);
    const left = clipPolygon(this.poly, a, b);
    const right = clipPolygon(this.poly, b, a);
    const la = polygonArea(left);
    const f = Math.min(la, total - la) / total;
    return { f, left, right };
  }

  protected step(dt: number) {
    if (this.phase === 'result') {
      this.timer -= dt;
      if (this.pieces) for (const p of this.pieces) {
        p.dx *= 1 + dt * 2;
        p.dy *= 1 + dt * 2;
      }
      if (this.timer <= 0) {
        this.round++;
        if (this.round >= 3) return this.finish(this.precs.reduce((a, b) => a + b, 0) / 3);
        this.newShape();
      }
      return;
    }
    for (const e of this.input.events) {
      if (e.type === 'down') {
        this.cutting = true;
        this.cutFrom = { x: e.x, y: e.y };
        this.cutTo = { x: e.x, y: e.y };
      } else if (e.type === 'move' && this.cutting) this.cutTo = { x: e.x, y: e.y };
      else if (e.type === 'up' && this.cutting) {
        this.cutting = false;
        this.cutTo = { x: e.x, y: e.y };
        const a = this.cutFrom!;
        const b = this.cutTo;
        if (Math.hypot(b.x - a.x, b.y - a.y) < 40) continue;
        const m = this.measure(a, b);
        if (m.left.length < 3 || m.right.length < 3) continue; // no ha cortado la medusa
        const t = TARGETS[this.round];
        const prec = clamp(100 - 150 * Math.abs(m.f - t), 0, 100);
        this.precs.push(prec);
        this.lastF = m.f;
        const nx = -(b.y - a.y);
        const ny = b.x - a.x;
        const l = Math.hypot(nx, ny) || 1;
        this.pieces = [
          { poly: m.left, dx: (nx / l) * 8, dy: (ny / l) * 8 },
          { poly: m.right, dx: (-nx / l) * 8, dy: (-ny / l) * 8 },
        ];
        this.phase = 'result';
        this.timer = 1.7;
        this.sfx.play(prec > 95 ? 'win' : prec > 80 ? 'ok' : 'bad');
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#0c4a6e', '#082f49');
    emoji(g, '🪼', W / 2, 90, 60);
    text(g, `Corta ${LABEL[Math.min(this.round, 2)]}`, W / 2, 160, { size: 20, weight: 800 });
    text(g, `Corte ${Math.min(this.round + 1, 3)} de 3`, W / 2, 190, { size: 14, weight: 700, color: '#7dd3fc' });
    const draw = (poly: Pt[], ox = 0, oy = 0) => {
      g.beginPath();
      poly.forEach((p, i) => (i ? g.lineTo(p.x + ox, p.y + oy) : g.moveTo(p.x + ox, p.y + oy)));
      g.closePath();
      g.fillStyle = 'rgba(244,114,182,.75)';
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = '#f9a8d4';
      g.stroke();
    };
    if (this.pieces) for (const p of this.pieces) draw(p.poly, p.dx, p.dy);
    else draw(this.poly);
    if (this.cutFrom && this.cutTo && this.phase === 'cut') {
      g.strokeStyle = '#fde047';
      g.lineWidth = 3;
      g.setLineDash([8, 6]);
      g.beginPath();
      g.moveTo(this.cutFrom.x, this.cutFrom.y);
      g.lineTo(this.cutTo.x, this.cutTo.y);
      g.stroke();
      g.setLineDash([]);
    }
    if (this.phase === 'result') {
      text(g, `${formatNumber(this.precs[this.precs.length - 1], 1)} %`, W / 2, 530, { size: 46 });
      text(g, `Trozo pequeño: ${formatNumber(this.lastF * 100, 1)} % (objetivo ${formatNumber(TARGETS[this.round] * 100, 1)} %)`, W / 2, 575, { size: 14, weight: 700, color: '#bae6fd' });
    } else text(g, 'Arrastra el dedo sobre la medusa', W / 2, 610, { size: 15, weight: 700, color: '#bae6fd' });
  }
}

export const create = (ctx: GameCtx) => new Medusa(ctx);
