import { describe, expect, it } from 'vitest';
import { runHeadless } from '@playzoo/engine';
import { isBetter } from '@playzoo/shared';
import { CATALOG, loadGame } from './index';
import { ORACLES } from './bots';
import { ORACLES2 } from './bots2';

const ALL = { ...ORACLES, ...ORACLES2 };

/**
 * Prueba de jugabilidad: cada juego tiene un bot experto que lee el estado interno.
 * Comprobamos que el bot consigue una marca digna frente al Top 1 % del PDF (o sea, que el
 * juego se puede jugar bien y no tiene un obstáculo imposible). Los umbrales son holgados a
 * propósito: el bot no juega como un humano.
 */
describe('todos los juegos se pueden jugar bien', () => {
  it('hay un bot experto por cada juego', () => {
    expect(CATALOG.filter((g) => !(g.id in ALL))).toEqual([]);
  });

  it.each(CATALOG.map((m) => [m.id] as const))('%s: el bot experto alcanza una marca razonable', async (id) => {
    const meta = CATALOG.find((g) => g.id === id)!;
    const def = await loadGame(id);
    const scores: number[] = [];
    for (const seed of ['cal-1', 'cal-2', 'cal-3']) {
      const r = runHeadless(def, { seed, bot: ALL[id](), maxTicks: 60 * 160 });
      expect(r.over, `${id} debe terminar (seed ${seed})`).toBe(true);
      scores.push(r.score);
    }
    const best = scores.reduce((a, b) => (isBetter(a, b, meta.marcador) ? a : b));
    if (meta.top1 === null) return;
    if (meta.marcador.mejor === 'mayor') {
      // el mejor de tres intentos debe llegar al menos a una fracción del Top 1 %
      expect(best).toBeGreaterThanOrEqual(meta.top1 * 0.25);
    } else if (meta.top1 > 0) {
      // en tiempos: no más de 4 veces el tiempo del Top 1 %
      expect(best).toBeLessThanOrEqual(meta.top1 * 4);
    } else {
      expect(best).toBeLessThanOrEqual(0.5);
    }
  });
});
