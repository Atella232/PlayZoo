// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { EPOCH, addDays, dateKey } from '@playzoo/shared';
import { LocalBackend } from './localBackend';
import { gameOfDay } from './games';
import { computeDice, dayBoard, seasonBoard } from './standings';

const hoy = dateKey();
const meta = gameOfDay(hoy);
const okScore = meta.marcador.mejor === 'mayor' ? (meta.top1 ?? 10) * 0.5 : (meta.top1 ?? 10) * 2;

async function setup() {
  const b = new LocalBackend();
  await b.signIn('Ana', '🦊');
  return b;
}

describe('backend local (modo demo)', () => {
  beforeEach(() => localStorage.clear());

  it('al entrar te une al grupo de demostración con jugadores simulados', async () => {
    const b = await setup();
    const gs = await b.listGroups();
    expect(gs).toHaveLength(1);
    expect(gs[0].demo).toBe(true);
    expect(gs[0].miembros.length).toBeGreaterThan(3);
  });

  it('permite 2 intentos y rechaza el tercero', async () => {
    const b = await setup();
    const a1 = await b.submitAttempt({ fecha: hoy, gameId: meta.id, score: okScore, events: [] });
    const a2 = await b.submitAttempt({ fecha: hoy, gameId: meta.id, score: okScore, events: [] });
    expect([a1.n, a2.n]).toEqual([1, 2]);
    await expect(b.submitAttempt({ fecha: hoy, gameId: meta.id, score: okScore, events: [] })).rejects.toThrow(/intentos/);
  });

  it('el intento extra da un tercer intento y solo hay uno por anuncio al día', async () => {
    const b = await setup();
    await b.submitAttempt({ fecha: hoy, gameId: meta.id, score: okScore, events: [] });
    await b.submitAttempt({ fecha: hoy, gameId: meta.id, score: okScore, events: [] });
    await b.buyExtra(hoy, 'anuncio');
    await expect(b.buyExtra(hoy, 'anuncio')).rejects.toThrow(/anuncio/);
    const a3 = await b.submitAttempt({ fecha: hoy, gameId: meta.id, score: okScore, events: [] });
    expect(a3.n).toBe(3);
  });

  it('rechaza el juego equivocado, otro día y marcas imposibles', async () => {
    const b = await setup();
    const other = meta.id === 'gorrion-aleteador' ? 'ojo-de-halcon' : 'gorrion-aleteador';
    await expect(b.submitAttempt({ fecha: hoy, gameId: other, score: 1, events: [] })).rejects.toThrow(/hoy/);
    await expect(b.submitAttempt({ fecha: addDays(hoy, -1), gameId: meta.id, score: 1, events: [] })).rejects.toThrow();
    const imposible = meta.marcador.mejor === 'mayor' ? (meta.top1 ?? 10) * 10 : 0;
    if (meta.marcador.mejor === 'mayor' || (meta.top1 ?? 0) > 0) await expect(b.submitAttempt({ fecha: hoy, gameId: meta.id, score: imposible, events: [] })).rejects.toThrow(/válido/);
  });

  it('el entrenamiento se guarda por juego', async () => {
    const b = await setup();
    await b.saveTraining('gorrion-aleteador', { best: 12, plays: 3, last: [4, 9, 12] });
    expect((await b.loadTraining())['gorrion-aleteador']).toEqual({ best: 12, plays: 3, last: [4, 9, 12] });
  });

  it('crear grupo propio y salir del grupo', async () => {
    const b = await setup();
    const g = await b.createGroup('Mi cuadrilla');
    expect(g.codigo).toHaveLength(6);
    expect((await b.listGroups()).map((x) => x.nombre)).toContain('Mi cuadrilla');
    await b.leaveGroup(g.id);
    expect((await b.listGroups()).map((x) => x.nombre)).not.toContain('Mi cuadrilla');
    await expect(b.joinGroup('NOEXISTE')).rejects.toThrow();
  });
});

describe('clasificaciones y dados', () => {
  beforeEach(() => localStorage.clear());

  it('los jugadores simulados dan clasificación en días pasados y suman puntos de temporada', async () => {
    const b = await setup();
    const [g] = await b.listGroups();
    const ayer = addDays(hoy, -1);
    if (ayer < EPOCH) return;
    const atts = await b.groupAttempts(g.id, EPOCH, hoy);
    const board = dayBoard(g, ayer, atts);
    expect(board.filter((r) => r.mejor !== null).length).toBeGreaterThanOrEqual(5);
    expect(board[0].rank).toBe(1);
    const season = seasonBoard(g, 1, hoy, atts);
    expect(season.reduce((a, r) => a + r.puntos, 0)).toBeGreaterThan(0);
  });

  it('los dados: 5 al empezar, +1 por día jugado, −3 por intento extra con dados', async () => {
    const b = await setup();
    const me = (await b.getMe())!;
    const gs = await b.listGroups();
    const load = async () => {
      const mine = await b.myAttempts(EPOCH, hoy);
      const map = new Map(await Promise.all(gs.map(async (g) => [g.id, await b.groupAttempts(g.id, EPOCH, hoy)] as const)));
      return computeDice(me.id, gs, mine, map, await b.allMyExtras(), hoy);
    };
    expect(await load()).toBe(5);
    await b.submitAttempt({ fecha: hoy, gameId: meta.id, score: okScore, events: [] });
    const conJuego = await load();
    expect(conJuego).toBeGreaterThanOrEqual(6);
    await b.buyExtra(hoy, 'dados');
    expect(await load()).toBe(conJuego - 3);
  });
});
