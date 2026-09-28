import { bg, circle, emoji, text, W, clamp, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const WATER = 480;
const BX = 56;
const BY = 430;
const G = 900;
const THROWS = 10;

class Nutria extends Game {
  private tr;
  n = 0;
  hits = 0;
  wind = 0;
  fx = 250;
  fr = 34;
  phase: 'aim' | 'fly' | 'result' = 'aim';
  bx = BX;
  by = BY;
  vx = 0;
  vy = 0;
  drag: { id: number; x: number; y: number } | null = null;
  cur: { x: number; y: number } | null = null;
  timer = 0;
  ok = false;
  splashX = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.tr = ctx.rng.fork('lanzamientos');
    this.setup();
  }

  private setup() {
    this.fr = Math.max(22, 34 - this.n * 1.3);
    this.fx = this.tr.range(190, 325);
    this.wind = this.tr.range(-130, 130) * Math.min(1, 0.3 + this.n * 0.12);
    this.phase = 'aim';
    this.bx = BX;
    this.by = BY;
    this.drag = null;
    this.cur = null;
  }

  private launchVec() {
    if (!this.drag || !this.cur) return null;
    const dx = clamp((this.drag.x - this.cur.x) * 3.4, -650, 650);
    const dy = clamp((this.drag.y - this.cur.y) * 3.4, -650, 650);
    return { vx: dx, vy: dy };
  }

  protected step(dt: number) {
    if (this.t >= 120) return this.finish(this.hits * 100);
    if (this.phase === 'aim') {
      for (const e of this.input.events) {
        if (e.type === 'down' && !this.drag) {
          this.drag = { id: e.id, x: e.x, y: e.y };
          this.cur = { x: e.x, y: e.y };
        } else if (e.type === 'move' && this.drag?.id === e.id) this.cur = { x: e.x, y: e.y };
        else if (e.type === 'up' && this.drag?.id === e.id) {
          this.cur = { x: e.x, y: e.y };
          const v = this.launchVec();
          if (v && Math.hypot(v.vx, v.vy) > 140 && v.vx > 0) {
            this.vx = v.vx;
            this.vy = v.vy;
            this.phase = 'fly';
            this.sfx.play('jump');
          } else {
            this.drag = null;
            this.cur = null;
          }
        }
      }
    } else if (this.phase === 'fly') {
      this.vx += this.wind * dt;
      this.vy += G * dt;
      this.bx += this.vx * dt;
      this.by += this.vy * dt;
      if (this.by >= WATER || this.bx > W + 40 || this.bx < -40) {
        this.splashX = this.bx;
        this.ok = this.by >= WATER && Math.abs(this.bx - this.fx) <= this.fr;
        if (this.ok) {
          this.hits++;
          this.score = this.hits * 100;
          this.popups.add('+100', this.fx, WATER - 40, '#fde047', 26);
          this.sfx.play('win');
        } else this.sfx.play('bad');
        this.phase = 'result';
        this.timer = 0.9;
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.n++;
        if (this.n >= THROWS) return this.finish(this.hits * 100);
        this.setup();
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#bae6fd', '#e0f2fe');
    g.fillStyle = '#0ea5e9';
    g.fillRect(0, WATER, W, 200);
    g.fillStyle = 'rgba(255,255,255,.25)';
    for (let i = 0; i < 6; i++) g.fillRect(((i * 70 + this.t * 20) % W), WATER + 20 + i * 22, 40, 4);
    g.fillStyle = '#92400e';
    g.fillRect(0, BY + 22, 110, 14);
    g.fillRect(10, BY + 36, 10, 60);
    g.fillRect(90, BY + 36, 10, 60);
    emoji(g, '🦦', 40, BY - 4, 52);
    // flotador
    g.beginPath();
    g.ellipse(this.fx, WATER + 2, this.fr, this.fr * 0.34, 0, 0, Math.PI * 2);
    g.fillStyle = '#ef4444';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#fff';
    g.stroke();
    // trayectoria de ayuda
    const v = this.phase === 'aim' ? this.launchVec() : null;
    if (v) {
      for (let k = 1; k <= 10; k++) {
        const t = k * 0.035;
        circle(g, BX + v.vx * t, BY + v.vy * t + 0.5 * G * t * t, 3, 'rgba(15,23,42,.6)');
      }
    }
    if (this.phase === 'fly') circle(g, this.bx, this.by, 9, '#fbbf24', '#78350f', 3);
    if (this.phase === 'aim') circle(g, BX + 20, BY - 4, 9, '#fbbf24', '#78350f', 3);
    if (this.phase === 'result' && !this.ok) {
      g.strokeStyle = '#fff';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(this.splashX, WATER, 12, Math.PI, 0);
      g.stroke();
    }
    text(g, `${this.hits * 100}`, W / 2, 46, { size: 42, color: '#0c4a6e' });
    text(g, `Lanzamiento ${Math.min(this.n + 1, THROWS)} de ${THROWS}`, W / 2, 84, { size: 15, weight: 700, color: '#0369a1' });
    const wl = Math.abs(this.wind);
    text(g, `${this.wind >= 0 ? '→' : '←'} viento ${Math.round(wl)}`, W / 2, 116, { size: 16, weight: 800, color: wl > 60 ? '#b91c1c' : '#0369a1' });
    if (this.phase === 'aim') text(g, 'Arrastra hacia atrás y suelta', W / 2, 620, { size: 14, weight: 700, color: '#0c4a6e' });
  }
}

export const create = (ctx: GameCtx) => new Nutria(ctx);
