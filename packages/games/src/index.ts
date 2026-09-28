import type { GameDef } from '@playzoo/engine';
import { CATALOG, type GameMeta } from './catalog';
import { LOADERS } from './loaders';

export { CATALOG, type GameMeta } from './catalog';
export { LOADERS } from './loaders';

export const getMeta = (id: string): GameMeta | undefined => CATALOG.find((g) => g.id === id);
export const isImplemented = (id: string) => id in LOADERS;
export const IMPLEMENTED = CATALOG.filter((g) => g.id in LOADERS);

/** Carga bajo demanda el código de un juego y lo une a su ficha. */
export async function loadGame(id: string): Promise<GameDef> {
  const meta = getMeta(id);
  const loader = LOADERS[id];
  if (!meta || !loader) throw new Error(`Juego no disponible: ${id}`);
  const mod = await loader();
  return { ...meta, create: mod.create };
}
