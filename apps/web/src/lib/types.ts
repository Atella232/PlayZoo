import type { InputEvent } from '@playzoo/engine';

export interface Perfil {
  id: string;
  nombre: string;
  emoji: string;
}

export interface Grupo {
  id: string;
  nombre: string;
  codigo: string;
  miembros: Perfil[];
  /** Grupo de demostración con jugadores simulados. */
  demo?: boolean;
}

export interface Intento {
  userId: string;
  fecha: string;
  gameId: string;
  n: number;
  score: number;
  /** ms desde epoch */
  cuando: number;
}

export interface Extra {
  fecha: string;
  tipo: 'dados' | 'anuncio';
}

export interface TrainStats {
  best: number | null;
  plays: number;
  last: number[];
}

export interface SubmitInput {
  fecha: string;
  gameId: string;
  score: number;
  events: InputEvent[];
}

export interface Backend {
  readonly kind: 'local' | 'supabase';
  getMe(): Promise<Perfil | null>;
  signIn(nombre: string, emoji: string, email?: string): Promise<{ revisaCorreo?: boolean } | void>;
  signOut(): Promise<void>;
  updateMe(p: Partial<Pick<Perfil, 'nombre' | 'emoji'>>): Promise<Perfil>;

  listGroups(): Promise<Grupo[]>;
  createGroup(nombre: string): Promise<Grupo>;
  joinGroup(codigo: string): Promise<Grupo>;
  leaveGroup(id: string): Promise<void>;

  /** Intentos de todos los miembros del grupo en un rango de fechas (inclusive). */
  groupAttempts(groupId: string, from: string, to: string): Promise<Intento[]>;
  myAttempts(from: string, to: string): Promise<Intento[]>;
  submitAttempt(a: SubmitInput): Promise<Intento>;

  allMyExtras(): Promise<Extra[]>;
  buyExtra(fecha: string, tipo: Extra['tipo']): Promise<void>;

  /** Avisa cuando cambian los datos del grupo (marcadores en directo). */
  subscribe(groupId: string, cb: () => void): () => void;

  /** Saldo de dados calculado por el servidor (si el backend lo ofrece). */
  serverDice?(): Promise<number>;

  loadTraining(): Promise<Record<string, TrainStats>>;
  saveTraining(gameId: string, s: TrainStats): Promise<void>;
}

export class BackendError extends Error {}
