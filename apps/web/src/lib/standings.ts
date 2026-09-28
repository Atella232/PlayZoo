import { EPOCH, SEASON_DAYS, addDays, dayIndex, isBetter, rankDay, DICE, type DayEntry } from '@playzoo/shared';
import type { Extra, Grupo, Intento } from './types';
import { gameOfDay } from './games';

export interface DayRow {
  userId: string;
  intentos: number[];
  mejor: number | null;
  cuando: number;
  rank: number | null;
  puntos: number;
}

/** Clasificación de un día para un grupo. */
export function dayBoard(grupo: Grupo, fecha: string, atts: Intento[]): DayRow[] {
  const meta = gameOfDay(fecha);
  const mine = atts.filter((a) => a.fecha === fecha && a.gameId === meta.id);
  const entries: DayEntry[] = grupo.miembros.map((m) => {
    const list = mine.filter((a) => a.userId === m.id).sort((a, b) => a.n - b.n);
    let mejor: number | null = null;
    let cuando = 0;
    for (const a of list) {
      if (mejor === null || isBetter(a.score, mejor, meta.marcador)) {
        mejor = a.score;
        cuando = a.cuando;
      }
    }
    return { userId: m.id, mejor, cuando };
  });
  const ranked = rankDay(entries, meta.marcador.mejor);
  const byUser = new Map(ranked.map((r) => [r.userId, r]));
  return grupo.miembros
    .map((m) => {
      const e = entries.find((x) => x.userId === m.id)!;
      const r = byUser.get(m.id);
      return {
        userId: m.id,
        intentos: mine.filter((a) => a.userId === m.id).sort((a, b) => a.n - b.n).map((a) => a.score),
        mejor: e.mejor,
        cuando: e.cuando,
        rank: r?.rank ?? null,
        puntos: r?.puntos ?? 0,
      };
    })
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
}

export interface SeasonRow {
  userId: string;
  puntos: number;
  victorias: number;
  dias: number;
  porDia: number[];
}

/** Días (fechas) de una temporada 1-based, recortados a `hasta` inclusive. */
export function seasonDates(temporada: number, hasta: string): string[] {
  const start = addDays(EPOCH, (temporada - 1) * SEASON_DAYS);
  const out: string[] = [];
  for (let i = 0; i < SEASON_DAYS; i++) {
    const d = addDays(start, i);
    if (d > hasta) break;
    out.push(d);
  }
  return out;
}

export function seasonBoard(grupo: Grupo, temporada: number, hasta: string, atts: Intento[]): SeasonRow[] {
  const dates = seasonDates(temporada, hasta);
  const rows = new Map<string, SeasonRow>(grupo.miembros.map((m) => [m.id, { userId: m.id, puntos: 0, victorias: 0, dias: 0, porDia: [] }]));
  for (const d of dates) {
    const board = dayBoard(grupo, d, atts);
    for (const b of board) {
      const row = rows.get(b.userId)!;
      row.puntos += b.puntos;
      row.porDia.push(b.puntos);
      if (b.rank !== null) row.dias++;
      if (b.rank === 1) row.victorias++;
    }
  }
  return [...rows.values()].sort((a, b) => b.puntos - a.puntos || b.victorias - a.victorias);
}

/** Dados: derivados de tu actividad (ver plan §3). */
export function computeDice(meId: string, grupos: Grupo[], myAtts: Intento[], groupAtts: Map<string, Intento[]>, extras: Extra[], hoy: string): number {
  const played = new Set(myAtts.map((a) => a.fecha));
  const podium = new Set<string>();
  const seasonWins = new Set<string>();
  for (const g of grupos) {
    const atts = groupAtts.get(g.id) ?? [];
    for (const d of played) {
      const row = dayBoard(g, d, atts).find((r) => r.userId === meId);
      if (row?.rank && row.rank <= 3) podium.add(d);
    }
    // temporadas terminadas
    const last = Math.floor(Math.max(0, dayIndex(hoy)) / SEASON_DAYS);
    for (let t = 1; t <= last; t++) {
      const b = seasonBoard(g, t, addDays(EPOCH, t * SEASON_DAYS - 1), atts);
      if (b[0] && b[0].puntos > 0 && b[0].userId === meId) seasonWins.add(`${g.id}:${t}`);
    }
  }
  const spent = extras.filter((e) => e.tipo === 'dados').length * DICE.costeUnoMas;
  return DICE.inicial + played.size * DICE.porJugar + podium.size * DICE.porPodio + seasonWins.size * DICE.porTemporada - spent;
}
