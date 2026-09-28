import type { Categoria, ScoreSpec } from '@playzoo/shared';
import type { Input } from './input';
import type { Rng } from './rng';
import type { Sfx } from './audio';

/** Resolución lógica de todos los juegos (vertical, 9:16). */
export const W = 360;
export const H = 640;
export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;
export const TICK_MS = 1000 / TICK_HZ;

export type G2 = CanvasRenderingContext2D;

export type Mode = 'ranked' | 'entrenamiento';

export interface GameCtx {
  seed: string;
  rng: Rng;
  mode: Mode;
  input: Input;
  sfx: Sfx;
}

export interface GameInstance {
  /** Avanza un paso fijo de 1/60 s. */
  update(dt: number): void;
  render(g: G2): void;
  /** true cuando la partida ha terminado. */
  readonly over: boolean;
  /** Marcador actual (definitivo cuando `over`). */
  readonly score: number;
}

export type Fiabilidad = 'oficial' | 'video' | 'video+analisis' | 'sin confirmar';

export interface GameDef {
  id: string;
  /** Número 1..71 del catálogo. */
  num: number;
  nombre: string;
  emoji: string;
  categoria: Categoria;
  marcador: ScoreSpec;
  /** Marca de referencia del 1 % mejor del mundo (null si no hay dato). */
  top1: number | null;
  duracionSeg: number;
  instrucciones: string;
  fiabilidad: Fiabilidad;
  kit: string;
  create(ctx: GameCtx): GameInstance;
}
