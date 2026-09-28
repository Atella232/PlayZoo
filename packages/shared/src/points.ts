/** Puntos del día por posición en el grupo (1.º = índice 0). */
export const RANK_POINTS = [10, 7, 5, 4, 3, 2] as const;
export const PARTICIPATION_POINTS = 1;

export function dayPoints(rank: number | null): number {
  if (rank === null) return 0;
  return RANK_POINTS[rank - 1] ?? PARTICIPATION_POINTS;
}

export const DICE = {
  inicial: 5,
  porJugar: 1,
  porPodio: 3,
  porTemporada: 10,
  costeUnoMas: 3,
  maxAnunciosDia: 1,
} as const;

export const MAX_INTENTOS = 2;

export interface DayEntry {
  userId: string;
  mejor: number | null;
  /** Instante en ms en que se logró esa mejor marca (para desempatar). */
  cuando: number;
}

/** Clasificación del día: ordena por marca y desempata por quien la hizo antes. */
export function rankDay(entries: DayEntry[], mejor: 'mayor' | 'menor'): { userId: string; rank: number; puntos: number; mejor: number }[] {
  const played = entries.filter((e): e is DayEntry & { mejor: number } => e.mejor !== null);
  played.sort((a, b) => {
    if (a.mejor !== b.mejor) return mejor === 'mayor' ? b.mejor - a.mejor : a.mejor - b.mejor;
    return a.cuando - b.cuando;
  });
  return played.map((e, i) => ({ userId: e.userId, rank: i + 1, puntos: dayPoints(i + 1), mejor: e.mejor }));
}
