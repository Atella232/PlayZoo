import { getMeta } from '@playzoo/games';
import { dateKey } from '@playzoo/shared';
import { backend } from './store';

const KEY = 'pz:pendingRanked';

interface Pending {
  fecha: string;
  gameId: string;
}

export function markRankedStarted(fecha: string, gameId: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ fecha, gameId } satisfies Pending));
  } catch {
    /* sin almacenamiento */
  }
}

export function clearRankedStarted() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
}

export const FORFEIT_LOW = 999;

/** Puntuación de un intento abandonado: la peor posible. */
export function forfeitScore(gameId: string): number {
  const m = getMeta(gameId);
  return m && m.marcador.mejor === 'menor' ? FORFEIT_LOW : 0;
}

export async function submitForfeit(fecha: string, gameId: string) {
  await backend.submitAttempt({ fecha, gameId, score: forfeitScore(gameId), events: [] });
}

/** Si la app se cerró en mitad de un intento oficial, ese intento cuenta como perdido. */
export async function settlePendingForfeit() {
  let p: Pending | null = null;
  try {
    p = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    p = null;
  }
  if (!p) return;
  clearRankedStarted();
  if (p.fecha !== dateKey()) return;
  try {
    await submitForfeit(p.fecha, p.gameId);
  } catch {
    /* ya sin intentos o sin conexión */
  }
}
