import { Popups, Sparks, text, TICK_MS, W, H, type G2, type GameCtx, type GameInstance } from '@playzoo/engine';
import type { Input, Rng, Sfx } from '@playzoo/engine';

/**
 * Base común de los minijuegos: reloj, partículas, textos flotantes,
 * sacudida de pantalla y pantalla de "¡Fin!".
 */
export abstract class Game implements GameInstance {
  over = false;
  score = 0;
  /** Segundos de simulación transcurridos. */
  t = 0;
  tick = 0;
  /** Instante (ms de partida) en que empieza el paso actual. Para corregir con `InputEvent.t`. */
  tickMs = 0;
  popups = new Popups();
  sparks = new Sparks();
  protected shakeT = 0;
  protected shakeAmp = 0;

  constructor(protected ctx: GameCtx) {}

  protected get input(): Input {
    return this.ctx.input;
  }
  protected get rng(): Rng {
    return this.ctx.rng;
  }
  protected get sfx(): Sfx {
    return this.ctx.sfx;
  }

  update(dt: number) {
    this.tickMs = this.tick * TICK_MS;
    this.t += dt;
    this.step(dt);
    this.popups.update(dt);
    this.sparks.update(dt);
    if (this.shakeT > 0) this.shakeT -= dt;
    this.tick++;
  }

  /** Lógica del juego en un paso fijo. */
  protected abstract step(dt: number): void;
  /** Dibujo del juego. */
  protected abstract draw(g: G2): void;

  render(g: G2) {
    g.save();
    if (this.shakeT > 0) g.translate((Math.random() - 0.5) * this.shakeAmp, (Math.random() - 0.5) * this.shakeAmp);
    this.draw(g);
    this.sparks.render(g);
    this.popups.render(g);
    g.restore();
    if (this.over) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, 0, W, H);
      text(g, '¡Fin!', W / 2, H / 2, { size: 54, stroke: 'rgba(0,0,0,0.5)' });
    }
  }

  protected shake(amp = 8, dur = 0.25) {
    this.shakeAmp = amp;
    this.shakeT = dur;
  }

  protected finish(score?: number) {
    if (score !== undefined) this.score = score;
    this.over = true;
  }
}
