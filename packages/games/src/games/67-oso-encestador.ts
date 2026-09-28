import { bg, emoji, formatNumber, text, W, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const tri = (x: number) => {
  const m = ((x % 2) + 2) % 2;
  return m < 1 ? m : 2 - m;
};

class Oso extends Game {
  private sr;
  made = 0;
  clock = 0;
  clockOn = false;
  shotStartMs = 0;
  center = 0.5;
  zone = 0.24;
  period = 1.0;
  shot: { t: number; ok: boolean; pos: number } | null = null;
  nextIn = 0;
  private phase0 = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('tiros');
    this.newShot();
  }

  private newShot() {
    this.shotStartMs = this.tickMs;
    this.period = Math.max(0.38, 1.0 - this.made * 0.026);
    this.zone = Math.max(0.09, 0.26 - this.made * 0.006);
    this.center = this.sr.range(0.25, 0.75);
    this.phase0 = this.sr.range(0, 2);
  }

  private needleAt(ms: number) {
    return tri(this.phase0 + (ms - this.shotStartMs) / 1000 / this.period);
  }

  protected step(dt: number) {
    if (this.t >= 150) return this.finish(this.made);
    if (this.clockOn) {
      this.clock -= dt;
      if (this.clock <= 0) return this.finish(this.made);
    }
    if (this.shot) {
      this.shot.t += dt;
      if (this.shot.t > 0.55) {
        this.shot = null;
        this.newShot();
      }
      return;
    }
    const tap = this.input.downs()[0];
    if (tap || this.input.keyDowns().length) {
      const ms = tap ? tap.t : this.tickMs;
      const pos = this.needleAt(ms);
      const ok = Math.abs(pos - this.center) <= this.zone / 2;
      this.shot = { t: 0, ok, pos };
      if (ok) {
        this.made++;
        this.score = this.made;
        if (!this.clockOn) {
          this.clockOn = true;
          this.clock = 20;
        } else this.clock += Math.max(0.9, 1.8 - this.made * 0.03);
        this.sfx.play('win', 1 + Math.min(this.made, 30) * 0.01);
        this.popups.add('¡Canasta!', W / 2, 250, '#86efac', 24);
      } else this.sfx.play('bad');
    }
  }

  protected draw(g: G2) {
    bg(g, '#7c2d12', '#431407');
    g.fillStyle = '#1c1917';
    g.fillRect(0, 520, W, 120);
    // tablero y aro
    g.fillStyle = '#f5f5f4';
    g.fillRect(W / 2 - 60, 110, 120, 80);
    g.strokeStyle = '#ef4444';
    g.lineWidth = 4;
    g.strokeRect(W / 2 - 24, 140, 48, 34);
    g.strokeStyle = '#f97316';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(W / 2 - 34, 200);
    g.lineTo(W / 2 + 34, 200);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(W / 2 + i * 10, 200);
      g.lineTo(W / 2 + i * 6, 232);
      g.stroke();
    }
    emoji(g, '🐻', 70, 500, 90);
    // balón
    if (this.shot) {
      const k = Math.min(1, this.shot.t / 0.5);
      const bx = 110 + (W / 2 - 110) * k + (this.shot.ok ? 0 : 60 * k * k);
      const by = 470 - 300 * k + 400 * k * k * 0.0 - Math.sin(k * Math.PI) * 120 + (this.shot.ok ? 0 : k * 40);
      emoji(g, '🏀', bx, Math.min(by, this.shot.ok ? 230 : 300), 34, k * 8);
    } else emoji(g, '🏀', 118, 475, 34);
    // medidor
    g.fillStyle = 'rgba(255,255,255,.15)';
    g.fillRect(30, 560, W - 60, 26);
    g.fillStyle = '#22c55e';
    g.fillRect(30 + (this.center - this.zone / 2) * (W - 60), 560, this.zone * (W - 60), 26);
    const pos = this.shot ? this.shot.pos : this.needleAt(this.tickMs);
    g.fillStyle = '#fff';
    g.fillRect(30 + pos * (W - 60) - 3, 552, 6, 42);
    text(g, String(this.made), W / 2, 60, { size: 56, stroke: 'rgba(0,0,0,.5)' });
    if (this.clockOn) text(g, `${formatNumber(Math.max(0, this.clock), 1)} s`, W - 16, 30, { size: 26, align: 'right', color: this.clock < 5 ? '#fca5a5' : '#fff' });
    else text(g, 'Toca en la zona verde. La 1.ª canasta activa el reloj', W / 2, 620, { size: 13, weight: 700 });
  }
}

export const create = (ctx: GameCtx) => new Oso(ctx);
