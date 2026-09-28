import { makeRng } from './rng';
import { Input, type InputEvent } from './input';
import { DT, H, TICK_MS, W, type GameDef, type GameInstance, type Mode } from './types';
import type { Sfx } from './audio';

export interface RunResult {
  score: number;
  ticks: number;
  events: InputEvent[];
}

export interface RunnerOptions {
  seed: string;
  mode: Mode;
  sfx: Sfx;
  onEnd: (r: RunResult) => void;
  /** Se llama cada frame con el marcador actual. */
  onScore?: (score: number) => void;
  /** Solo pruebas: pasos de simulación por fotograma (para navegadores con el reloj limitado). */
  turbo?: number;
}

const END_HOLD_MS = 1000;

/** Ejecuta un juego en un <canvas> con paso fijo y graba las entradas. */
export class Runner {
  private inst: GameInstance;
  private input = new Input();
  private g: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private tick = 0;
  private startReal = 0;
  private pending: InputEvent[] = [];
  private recorded: InputEvent[] = [];
  private endedAt = 0;
  private stopped = false;
  private cleanup: (() => void)[] = [];
  private ro?: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    def: GameDef,
    private opts: RunnerOptions,
  ) {
    const g = canvas.getContext('2d');
    if (!g) throw new Error('Canvas 2D no disponible');
    this.g = g;
    this.inst = def.create({ seed: opts.seed, rng: makeRng(opts.seed), mode: opts.mode, input: this.input, sfx: opts.sfx });
    this.resize();
  }

  /** Dibuja el primer fotograma sin arrancar la partida (cuenta atrás). */
  preview() {
    this.resize();
    this.g.save();
    this.inst.render(this.g);
    this.g.restore();
  }

  private resize = () => {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = rect.width || W;
    const pw = Math.max(1, Math.round(cssW * dpr));
    const ph = Math.round((pw * H) / W);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    this.g.setTransform(pw / W, 0, 0, pw / W, 0, 0);
  };

  private toLogical(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  private now() {
    return performance.now() - this.startReal;
  }

  private push(e: Omit<InputEvent, 't'>) {
    const ev: InputEvent = { ...e, t: this.now() };
    this.pending.push(ev);
    this.recorded.push(ev);
  }

  private bind() {
    const c = this.canvas;
    const down = (e: PointerEvent) => {
      c.setPointerCapture?.(e.pointerId);
      const p = this.toLogical(e);
      this.push({ type: 'down', ...p, id: e.pointerId });
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      const p = this.toLogical(e);
      this.push({ type: 'move', ...p, id: e.pointerId });
    };
    const up = (e: PointerEvent) => {
      const p = this.toLogical(e);
      this.push({ type: 'up', ...p, id: e.pointerId });
    };
    const kd = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
      this.push({ type: 'key', x: 0, y: 0, id: -1, key: '+' + e.key });
    };
    const ku = (e: KeyboardEvent) => this.push({ type: 'key', x: 0, y: 0, id: -1, key: '-' + e.key });
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(this.resize);
      this.ro.observe(c);
    }
    this.cleanup.push(() => {
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      this.ro?.disconnect();
    });
  }

  start() {
    this.bind();
    this.startReal = performance.now();
    this.last = this.startReal;
    const loop = (nowMs: number) => {
      if (this.stopped) return;
      this.raf = requestAnimationFrame(loop);
      let dt = nowMs - this.last;
      this.last = nowMs;
      if (dt > 100) {
        // pestaña en segundo plano: no acumular; desplazamos el reloj de entradas
        this.startReal += dt - TICK_MS;
        dt = TICK_MS;
      }
      this.acc += this.opts.turbo && this.opts.turbo > 1 ? TICK_MS * this.opts.turbo : dt;
      while (this.acc >= TICK_MS && !this.inst.over) {
        this.acc -= TICK_MS;
        const limit = (this.tick + 1) * TICK_MS;
        const evs: InputEvent[] = [];
        while (this.pending.length && this.pending[0].t < limit) evs.push(this.pending.shift()!);
        this.input.begin(evs);
        this.inst.update(DT);
        this.tick++;
      }
      if (this.inst.over) {
        this.acc = 0;
        if (!this.endedAt) this.endedAt = nowMs;
      }
      this.g.save();
      this.inst.render(this.g);
      this.g.restore();
      this.opts.onScore?.(this.inst.score);
      if (this.inst.over && nowMs - this.endedAt > END_HOLD_MS) {
        this.stop();
        this.opts.onEnd({ score: this.inst.score, ticks: this.tick, events: this.recorded });
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.cleanup.forEach((f) => f());
    this.cleanup = [];
  }
}
