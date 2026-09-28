import { makeRng, type Rng } from './rng';
import { Input, type InputEvent } from './input';
import { DT, TICK_MS, type GameDef, type GameInstance, type Mode } from './types';
import { nullSfx } from './audio';

export type BotEvent = { type: InputEvent['type']; x?: number; y?: number; id?: number; key?: string };
export type Bot = (tick: number, inst: GameInstance, rng: Rng) => BotEvent[] | void;

export interface HeadlessOptions {
  seed: string;
  mode?: Mode;
  /** Entradas grabadas a reproducir (tienen preferencia sobre `bot`). */
  events?: InputEvent[];
  bot?: Bot;
  botSeed?: string;
  /** Límite de seguridad de pasos (por defecto 3 min). */
  maxTicks?: number;
}

export interface HeadlessResult {
  score: number;
  over: boolean;
  ticks: number;
  events: InputEvent[];
  inst: GameInstance;
}

/** Ejecuta un juego sin pantalla. Sirve para pruebas, calibrado y validar repeticiones. */
export function runHeadless(def: GameDef, o: HeadlessOptions): HeadlessResult {
  const input = new Input();
  const inst = def.create({ seed: o.seed, rng: makeRng(o.seed), mode: o.mode ?? 'ranked', input, sfx: nullSfx });
  const botRng = makeRng(o.botSeed ?? 'bot:' + o.seed);
  const max = o.maxTicks ?? 60 * 180;
  const recorded: InputEvent[] = [];
  const replay = o.events ? o.events.slice().sort((a, b) => a.t - b.t) : null;
  let ri = 0;
  let tick = 0;
  while (!inst.over && tick < max) {
    const limit = (tick + 1) * TICK_MS;
    const evs: InputEvent[] = [];
    if (replay) {
      while (ri < replay.length && replay[ri].t < limit) evs.push(replay[ri++]);
    } else if (o.bot) {
      const be = o.bot(tick, inst, botRng) ?? [];
      be.forEach((b, i) => {
        const e: InputEvent = { t: tick * TICK_MS + 0.5 + i * 0.01, type: b.type, x: b.x ?? 0, y: b.y ?? 0, id: b.id ?? 1, key: b.key };
        evs.push(e);
        recorded.push(e);
      });
    }
    input.begin(evs);
    inst.update(DT);
    tick++;
  }
  return { score: inst.score, over: inst.over, ticks: tick, events: replay ? o.events! : recorded, inst };
}

// ---- Bots genéricos para pruebas ----

/** No hace nada. */
export const idleBot: Bot = () => [];

/** Toca en sitios aleatorios cada cierto tiempo. */
export function randomTapBot(everyTicks = 20): Bot {
  return (tick, _i, rng) => {
    if (tick % everyTicks !== 0) return [];
    const x = rng.range(10, 350);
    const y = rng.range(60, 620);
    return [
      { type: 'down', x, y },
      { type: 'up', x, y },
    ];
  };
}

/** Mantiene el dedo pulsado y lo arrastra por la pantalla. */
export function randomDragBot(): Bot {
  let x = 180;
  let y = 400;
  return (tick, _i, rng) => {
    if (tick === 1) return [{ type: 'down', x, y }];
    x = Math.min(350, Math.max(10, x + rng.range(-12, 12)));
    y = Math.min(620, Math.max(60, y + rng.range(-12, 12)));
    return [{ type: 'move', x, y }];
  };
}

/** Pulsa teclas de dirección al azar. */
export function randomKeyBot(everyTicks = 15): Bot {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
  return (tick, _i, rng) => {
    if (tick % everyTicks !== 0) return [];
    const k = rng.pick(keys);
    return [
      { type: 'key', key: '+' + k },
      { type: 'key', key: '-' + k },
    ];
  };
}

/** Mezcla toques, arrastres y teclas. */
export function chaosBot(): Bot {
  const tap = randomTapBot(9);
  const key = randomKeyBot(11);
  const drag = randomDragBot();
  return (tick, inst, rng) => {
    const a = tap(tick, inst, rng) ?? [];
    const b = key(tick, inst, rng) ?? [];
    const c = tick % 200 < 100 ? (drag(tick, inst, rng) ?? []) : [];
    return [...a, ...b, ...c];
  };
}

/** Contexto 2D falso que ignora todas las llamadas de dibujo (para pruebas de render). */
export function makeNullCtx(): CanvasRenderingContext2D {
  const store: Record<string, unknown> = {};
  const fn = () => undefined;
  const target = {
    measureText: (s: string) => ({ width: String(s).length * 7 }),
    createLinearGradient: () => ({ addColorStop: fn }),
    createRadialGradient: () => ({ addColorStop: fn }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
  } as Record<string, unknown>;
  return new Proxy(target, {
    get(t, k: string) {
      if (k in t) return t[k];
      if (k in store) return store[k];
      return fn;
    },
    set(_t, k: string, v) {
      store[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}
