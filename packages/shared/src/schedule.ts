import { hashString, mulberry32 } from './hash';

/** Día 1 de la primera temporada (hora de Madrid). */
export const EPOCH = '2026-09-28';
export const SEASON_DAYS = 21;
export const TIMEZONE = 'Europe/Madrid';

/** Fecha "YYYY-MM-DD" en Europa/Madrid. */
export function dateKey(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return parts; // en-CA => YYYY-MM-DD
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Índice de día desde el inicio (puede ser negativo antes de EPOCH). */
export function dayIndex(key: string): number {
  return dayNumber(key) - dayNumber(EPOCH);
}

export function addDays(key: string, n: number): string {
  const t = (dayNumber(key) + n) * 86400000;
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export interface SeasonInfo {
  /** Temporada, empezando en 1. */
  temporada: number;
  /** Día dentro de la temporada, 1..21. */
  dia: number;
  total: number;
}

export function seasonInfo(key: string): SeasonInfo {
  const idx = Math.max(0, dayIndex(key));
  return { temporada: Math.floor(idx / SEASON_DAYS) + 1, dia: (idx % SEASON_DAYS) + 1, total: SEASON_DAYS };
}

export interface GameRef {
  id: string;
  categoria: string;
}

function shuffled<T>(arr: T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed));
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Baraja del ciclo evitando dos juegos seguidos de la misma categoría. */
function cycleOrder(games: GameRef[], cycle: number): GameRef[] {
  const a = shuffled(games, `ciclo-${cycle}`);
  for (let i = 1; i < a.length; i++) {
    if (a[i].categoria !== a[i - 1].categoria) continue;
    for (let j = i + 1; j < a.length; j++) {
      if (a[j].categoria !== a[i - 1].categoria) {
        [a[i], a[j]] = [a[j], a[i]];
        break;
      }
    }
  }
  return a;
}

/** Juego del día. Sin repetir hasta agotar el catálogo. */
export function gameForDate(key: string, games: GameRef[]): GameRef {
  const idx = Math.max(0, dayIndex(key));
  const n = games.length;
  const order = cycleOrder(games, Math.floor(idx / n));
  return order[idx % n];
}

/** Semilla compartida por todos para la partida del día. */
export function dailySeed(key: string, gameId: string): string {
  return `${key}:${gameId}`;
}
