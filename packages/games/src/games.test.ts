import { describe, expect, it } from 'vitest';
import { chaosBot, idleBot, makeNullCtx, randomTapBot, runHeadless, type Bot } from '@playzoo/engine';
import { isPlausible } from '@playzoo/shared';
import { CATALOG, IMPLEMENTED, loadGame } from './index';

const bots: Record<string, () => Bot> = {
  idle: () => idleBot,
  tap: () => randomTapBot(17),
  chaos: () => chaosBot(),
};

describe('catálogo', () => {
  it('tiene los 71 juegos con ids y números únicos', () => {
    expect(CATALOG).toHaveLength(71);
    expect(new Set(CATALOG.map((g) => g.id)).size).toBe(71);
    expect(CATALOG.map((g) => g.num)).toEqual(Array.from({ length: 71 }, (_, i) => i + 1));
  });
});

describe.each(IMPLEMENTED.map((m) => [m.id, m] as const))('juego %s', (id, meta) => {
  it.each(Object.keys(bots))('no falla con el bot %s y devuelve un marcador finito', async (b) => {
    const def = await loadGame(id);
    const r = runHeadless(def, { seed: '2026-10-01:' + id, bot: bots[b](), maxTicks: 60 * 200 });
    expect(Number.isFinite(r.score)).toBe(true);
    if (r.over && meta.marcador.mejor === 'mayor') expect(r.score).toBeGreaterThanOrEqual(0);
    // los bots aleatorios pueden tener suerte: solo comprobamos el tope superior de las marcas donde más es mejor
    if (r.over && meta.marcador.mejor === 'mayor') expect(isPlausible(r.score, meta.top1, meta.marcador)).toBe(true);
  });

  it('es determinista y se puede reproducir con las entradas grabadas', async () => {
    const def = await loadGame(id);
    const a = runHeadless(def, { seed: 'sem-1', bot: chaosBot(), maxTicks: 60 * 100 });
    const b = runHeadless(def, { seed: 'sem-1', bot: chaosBot(), maxTicks: 60 * 100 });
    expect(b.score).toBe(a.score);
    expect(b.ticks).toBe(a.ticks);
    const c = runHeadless(def, { seed: 'sem-1', events: a.events, maxTicks: 60 * 100 });
    expect(c.score).toBe(a.score);
    expect(c.ticks).toBe(a.ticks);
  });

  it('dibuja sin errores en varios instantes', async () => {
    const def = await loadGame(id);
    const g = makeNullCtx();
    const r = runHeadless(def, { seed: 'render', bot: chaosBot(), maxTicks: 600 });
    for (let i = 0; i < 3; i++) r.inst.render(g);
    const r0 = runHeadless(def, { seed: 'render', bot: idleBot, maxTicks: 2 });
    r0.inst.render(g);
  });
});
