import { describe, expect, it } from 'vitest';
import { EPOCH, SEASON_DAYS, SPEC, addDays, dailySeed, dateKey, dayIndex, dayPoints, formatNumber, formatScore, gameForDate, isBetter, isPlausible, rankDay, seasonInfo, type GameRef } from './index';

const GAMES: GameRef[] = Array.from({ length: 71 }, (_, i) => ({ id: `g${i}`, categoria: ['a', 'b', 'c', 'd', 'e'][i % 5] }));

describe('formato de marcadores (como el PDF)', () => {
  it('usa coma decimal y punto de miles', () => {
    expect(formatScore(163.9, SPEC.metros)).toBe('163,9 m');
    expect(formatScore(1026, SPEC.metros0)).toBe('1.026 m');
    expect(formatScore(0.288, SPEC.segundos3)).toBe('0,288 s');
    expect(formatScore(97.89, SPEC.precision)).toBe('97,89 %');
    expect(formatScore(12.8, SPEC.hoyos)).toBe('12,8');
    expect(formatNumber(1234567.5, 1)).toBe('1.234.567,5');
    expect(formatScore(null, SPEC.puntos)).toBe('—');
  });
  it('ordena según el tipo de marcador', () => {
    expect(isBetter(10, 5, SPEC.puntos)).toBe(true);
    expect(isBetter(4.5, 5, SPEC.segundosMenos)).toBe(true);
    expect(isBetter(33, 30, SPEC.segundosMas)).toBe(true);
  });
});

describe('calendario', () => {
  it('cambia de día a medianoche de Madrid', () => {
    expect(dateKey(new Date('2026-09-28T22:30:00Z'))).toBe('2026-09-29');
    expect(dateKey(new Date('2026-09-28T21:30:00Z'))).toBe('2026-09-28');
  });
  it('suma días y numera temporadas de 21 días', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(dayIndex(EPOCH)).toBe(0);
    expect(seasonInfo(EPOCH)).toEqual({ temporada: 1, dia: 1, total: 21 });
    expect(seasonInfo(addDays(EPOCH, 14))).toEqual({ temporada: 1, dia: 15, total: 21 });
    expect(seasonInfo(addDays(EPOCH, SEASON_DAYS))).toEqual({ temporada: 2, dia: 1, total: 21 });
  });
  it('el juego del día no se repite hasta agotar el catálogo y no repite categoría seguida', () => {
    const seen = new Set<string>();
    let prev = '';
    let sameCat = 0;
    for (let i = 0; i < GAMES.length; i++) {
      const g = gameForDate(addDays(EPOCH, i), GAMES);
      expect(seen.has(g.id)).toBe(false);
      seen.add(g.id);
      if (g.categoria === prev) sameCat++;
      prev = g.categoria;
    }
    expect(seen.size).toBe(71);
    expect(sameCat).toBeLessThanOrEqual(3);
  });
  it('es determinista', () => {
    expect(gameForDate('2026-10-15', GAMES)).toEqual(gameForDate('2026-10-15', GAMES));
    expect(dailySeed('2026-10-15', 'gorrion')).toBe('2026-10-15:gorrion');
  });
});

describe('puntos y clasificación', () => {
  it('reparte 10, 7, 5, 4, 3, 2 y 1', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 20].map(dayPoints)).toEqual([10, 7, 5, 4, 3, 2, 1, 1]);
    expect(dayPoints(null)).toBe(0);
  });
  it('desempata por quien lo hizo antes', () => {
    const r = rankDay(
      [
        { userId: 'a', mejor: 50, cuando: 200 },
        { userId: 'b', mejor: 50, cuando: 100 },
        { userId: 'c', mejor: null, cuando: 0 },
        { userId: 'd', mejor: 70, cuando: 300 },
      ],
      'mayor',
    );
    expect(r.map((x) => x.userId)).toEqual(['d', 'b', 'a']);
    expect(r.map((x) => x.puntos)).toEqual([10, 7, 5]);
  });
  it('en tiempos gana el menor', () => {
    const r = rankDay([{ userId: 'a', mejor: 9.5, cuando: 1 }, { userId: 'b', mejor: 8.2, cuando: 2 }], 'menor');
    expect(r[0].userId).toBe('b');
  });
});

describe('tope de plausibilidad', () => {
  it('rechaza marcas imposibles', () => {
    expect(isPlausible(40, 30, SPEC.puntos)).toBe(true);
    expect(isPlausible(46, 30, SPEC.puntos)).toBe(false);
    expect(isPlausible(101, 97.89, SPEC.precision)).toBe(false);
    expect(isPlausible(100, 97.89, SPEC.precision)).toBe(true);
    expect(isPlausible(0.5, 4.56, SPEC.segundosMenos)).toBe(false);
    expect(isPlausible(3, 4.56, SPEC.segundosMenos)).toBe(true);
    expect(isPlausible(Number.NaN, 10, SPEC.puntos)).toBe(false);
    expect(isPlausible(5, null, SPEC.puntos)).toBe(true);
  });
});
