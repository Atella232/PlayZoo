import { CATALOG, getMeta, type GameMeta } from '@playzoo/games';
import { dailySeed, dateKey, gameForDate, seasonInfo, type GameRef } from '@playzoo/shared';

export const GAME_REFS: GameRef[] = CATALOG.map((g) => ({ id: g.id, categoria: g.categoria }));

export function gameOfDay(fecha: string): GameMeta {
  const ref = gameForDate(fecha, GAME_REFS);
  return getMeta(ref.id)!;
}

export { dailySeed, dateKey, seasonInfo };
