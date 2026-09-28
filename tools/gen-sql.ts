/**
 * Genera supabase/migrations/0002_seed_juegos_calendario.sql con:
 *  - juegos_ref: los 71 juegos con su Top 1 % y sentido del marcador (validación en servidor)
 *  - calendario: el juego de cada día durante 2 años, con el mismo algoritmo que la app.
 * Uso: pnpm gen:sql   (repetir si cambia el catálogo)
 */
import { writeFileSync } from 'node:fs';
import { CATALOG } from '../packages/games/src/catalog';
import { EPOCH, addDays, gameForDate } from '../packages/shared/src/schedule';

const refs = CATALOG.map((g) => ({ id: g.id, categoria: g.categoria }));
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const lines: string[] = [];
lines.push('-- Generado por tools/gen-sql.ts. No editar a mano.');
lines.push('insert into public.juegos_ref (game_id, top1, mejor, es_porcentaje) values');
lines.push(
  CATALOG.map((g) => `  (${q(g.id)}, ${g.top1 === null ? 'null' : g.top1}, ${q(g.marcador.mejor)}, ${g.marcador.unidad === '%' ? 'true' : 'false'})`).join(',\n') +
    '\non conflict (game_id) do update set top1 = excluded.top1, mejor = excluded.mejor, es_porcentaje = excluded.es_porcentaje;',
);
lines.push('');
lines.push('insert into public.calendario (fecha, game_id) values');
const DAYS = 730;
const rows: string[] = [];
for (let i = 0; i < DAYS; i++) {
  const d = addDays(EPOCH, i);
  rows.push(`  (${q(d)}, ${q(gameForDate(d, refs).id)})`);
}
lines.push(rows.join(',\n') + '\non conflict (fecha) do update set game_id = excluded.game_id;');
writeFileSync(new URL('../supabase/migrations/0002_seed_juegos_calendario.sql', import.meta.url), lines.join('\n') + '\n');
console.log(`OK: ${CATALOG.length} juegos y ${DAYS} días desde ${EPOCH}`);
