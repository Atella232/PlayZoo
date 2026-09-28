import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Ejecuta las migraciones en un Postgres real (PGlite, WASM) con un simulacro mínimo de Supabase
 * (esquema auth, auth.uid(), roles anon/authenticated y publicación de tiempo real).
 */
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';

let db: PGlite;

async function as(uid: string | null) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`);
  if (uid) await db.exec('set role authenticated;');
}
const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];
const all = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public, auth to anon, authenticated;
    create publication supabase_realtime;
  `);
  await db.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../migrations/0002_seed_juegos_calendario.sql', import.meta.url), 'utf8'));
  await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated; grant usage on all sequences in schema public to authenticated;`);
  for (const [id, n] of [[A, 'Ana'], [B, 'Bea'], [C, 'Cris']] as const) {
    await db.exec(`insert into auth.users values ('${id}'); insert into public.perfiles (id, nombre, emoji) values ('${id}', '${n}', '🦊');`);
  }
  // el juego de hoy (calendario de Madrid) es el primer juego del catálogo, con límites conocidos
  await db.exec(`insert into public.calendario (fecha, game_id) values (public.hoy_madrid(), 'gorrion-aleteador') on conflict (fecha) do update set game_id = 'gorrion-aleteador';`);
});

describe('migraciones', () => {
  it('cargan los 71 juegos de referencia y 730 días de calendario', async () => {
    expect((await one<{ n: number }>('select count(*)::int n from public.juegos_ref')).n).toBe(71);
    expect((await one<{ n: number }>('select count(*)::int n from public.calendario')).n).toBeGreaterThanOrEqual(730);
  });
});

describe('grupos y seguridad por fila', () => {
  let code = '';
  let gid = '';
  it('crear grupo genera un código de 6 caracteres y te hace miembro', async () => {
    await as(A);
    const g = await one<{ id: string; codigo: string }>("select * from public.crear_grupo('Cuadrilla')");
    code = g.codigo;
    gid = g.id;
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect((await one<{ n: number }>('select count(*)::int n from public.miembros where grupo_id = $1', [gid])).n).toBe(1);
  });
  it('quien no es miembro no ve el grupo ni sus miembros; al unirse, sí', async () => {
    await as(C);
    expect(await all('select * from public.grupos')).toHaveLength(0);
    expect(await all('select * from public.miembros')).toHaveLength(0);
    await as(B);
    await one('select * from public.unirse_grupo($1)', [code.toLowerCase()]);
    expect(await all('select * from public.grupos')).toHaveLength(1);
    expect(await all('select * from public.miembros')).toHaveLength(2);
    await expect(one("select * from public.unirse_grupo('NOEXISTE')")).rejects.toThrow(/No existe/);
  });
  it('los perfiles solo son visibles entre compañeros', async () => {
    await as(B);
    expect((await all<{ nombre: string }>('select nombre from public.perfiles order by nombre')).map((r) => r.nombre)).toEqual(['Ana', 'Bea']);
    await as(C);
    expect((await all<{ nombre: string }>('select nombre from public.perfiles')).map((r) => r.nombre)).toEqual(['Cris']);
  });
});

describe('intentos', () => {
  const hoy = () => one<{ d: string }>("select public.hoy_madrid()::text d").then((r) => r.d);

  it('no se puede insertar un intento directamente (solo con registrar_intento)', async () => {
    await as(A);
    await expect(db.query(`insert into public.intentos (user_id, fecha, game_id, n, score) values ('${A}', public.hoy_madrid(), 'gorrion-aleteador', 1, 10)`)).rejects.toThrow();
  });

  it('permite 2 intentos, rechaza el 3.º y luego admite uno extra', async () => {
    await as(A);
    const f = await hoy();
    const r1 = await one<{ n: number }>("select * from public.registrar_intento($1::date, 'gorrion-aleteador', 12)", [f]);
    const r2 = await one<{ n: number }>("select * from public.registrar_intento($1::date, 'gorrion-aleteador', 20)", [f]);
    expect([r1.n, r2.n]).toEqual([1, 2]);
    await expect(one("select * from public.registrar_intento($1::date, 'gorrion-aleteador', 5)", [f])).rejects.toThrow(/intentos/);
    await one("select public.comprar_extra($1::date, 'anuncio')", [f]);
    await expect(one("select public.comprar_extra($1::date, 'anuncio')", [f])).rejects.toThrow(/anuncio/);
    expect((await one<{ n: number }>("select (public.registrar_intento($1::date, 'gorrion-aleteador', 25)).n", [f])).n).toBe(3);
  });

  it('rechaza otro día, otro juego y marcas imposibles', async () => {
    await as(B);
    const f = await hoy();
    await expect(one("select * from public.registrar_intento(($1::date - 1), 'gorrion-aleteador', 10)", [f])).rejects.toThrow(/hoy/);
    await expect(one("select * from public.registrar_intento($1::date, 'ojo-de-halcon', 90)", [f])).rejects.toThrow(/hoy/);
    await expect(one("select * from public.registrar_intento($1::date, 'gorrion-aleteador', 9999)", [f])).rejects.toThrow(/válido/);
    await expect(one("select * from public.registrar_intento($1::date, 'gorrion-aleteador', 'NaN')", [f])).rejects.toThrow(/válido/);
  });

  it('los compañeros ven los intentos de los demás, los ajenos al grupo no', async () => {
    await as(B);
    await one("select * from public.registrar_intento(public.hoy_madrid(), 'gorrion-aleteador', 14)");
    expect((await all('select * from public.intentos')).length).toBe(4); // 3 de Ana + 1 de Bea
    await as(C);
    expect(await all('select * from public.intentos')).toHaveLength(0);
  });
});

describe('dados', () => {
  it('5 al empezar, +1 por día jugado, +3 por podio y −3 por intento extra con dados', async () => {
    await as(C);
    expect((await one<{ mis_dados: number }>('select public.mis_dados()')).mis_dados).toBe(5);
    await as(A);
    // A jugó hoy (+1), quedó 1.ª del grupo (podio +3) y no gastó dados
    expect((await one<{ mis_dados: number }>('select public.mis_dados()')).mis_dados).toBe(9);
    await expect(one("select public.comprar_extra(public.hoy_madrid(), 'dados')")).resolves.toBeDefined();
    expect((await one<{ mis_dados: number }>('select public.mis_dados()')).mis_dados).toBe(6);
  });
  it('no permite gastar dados que no se tienen', async () => {
    await as(C);
    await one("select public.comprar_extra(public.hoy_madrid(), 'dados')"); // 5 → 2
    await expect(one("select public.comprar_extra(public.hoy_madrid(), 'dados')")).rejects.toThrow(/dados/);
  });
});

describe('entrenamiento y perfiles', () => {
  it('cada usuario solo ve y modifica su entrenamiento', async () => {
    await as(A);
    await db.exec(`insert into public.entrenamiento_stats (user_id, game_id, best, plays, ultimas) values ('${A}', 'gorrion-aleteador', 22, 4, '[3,9,22]')`);
    expect(await all('select * from public.entrenamiento_stats')).toHaveLength(1);
    await as(B);
    expect(await all('select * from public.entrenamiento_stats')).toHaveLength(0);
    await expect(db.query(`insert into public.entrenamiento_stats (user_id, game_id, best, plays) values ('${A}', 'x', 1, 1)`)).rejects.toThrow();
  });
});
