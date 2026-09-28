-- PlayZoo · esquema inicial. Ejecutar en el editor SQL de Supabase o con `supabase db push`.

-- ========== Tablas ==========
create table public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 24),
  emoji text not null default '🐧',
  creado timestamptz not null default now()
);

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 40),
  codigo text not null unique,
  creador uuid references public.perfiles(id) on delete set null,
  creado timestamptz not null default now()
);

create table public.miembros (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  user_id uuid not null references public.perfiles(id) on delete cascade,
  unido timestamptz not null default now(),
  primary key (grupo_id, user_id)
);
create index on public.miembros (user_id);

-- Referencia de cada juego (Top 1 % del PDF) para validar marcadores.
create table public.juegos_ref (
  game_id text primary key,
  top1 double precision,
  mejor text not null check (mejor in ('mayor', 'menor')),
  es_porcentaje boolean not null default false
);

-- Juego de cada día (lo genera tools/gen-sql.ts con el mismo calendario que la app).
create table public.calendario (
  fecha date primary key,
  game_id text not null references public.juegos_ref(game_id)
);

create table public.intentos (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.perfiles(id) on delete cascade,
  fecha date not null,
  game_id text not null references public.juegos_ref(game_id),
  n int not null check (n >= 1),
  score double precision not null,
  eventos jsonb,
  cuando timestamptz not null default now(),
  unique (user_id, fecha, n)
);
create index on public.intentos (fecha, game_id);

create table public.intentos_extra (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.perfiles(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('dados', 'anuncio')),
  cuando timestamptz not null default now()
);
create index on public.intentos_extra (user_id, fecha);

create table public.entrenamiento_stats (
  user_id uuid not null references public.perfiles(id) on delete cascade,
  game_id text not null,
  best double precision,
  plays int not null default 0,
  ultimas jsonb not null default '[]'::jsonb,
  actualizado timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- ========== Ayudas de seguridad ==========
create or replace function public.soy_miembro(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros where grupo_id = gid and user_id = auth.uid());
$$;

create or replace function public.es_companero(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select uid = auth.uid() or exists (
    select 1 from miembros a join miembros b on a.grupo_id = b.grupo_id
    where a.user_id = auth.uid() and b.user_id = uid);
$$;

-- ========== RLS ==========
alter table public.perfiles enable row level security;
alter table public.grupos enable row level security;
alter table public.miembros enable row level security;
alter table public.juegos_ref enable row level security;
alter table public.calendario enable row level security;
alter table public.intentos enable row level security;
alter table public.intentos_extra enable row level security;
alter table public.entrenamiento_stats enable row level security;

create policy perfiles_select on public.perfiles for select to authenticated using (public.es_companero(id));
create policy perfiles_insert on public.perfiles for insert to authenticated with check (id = auth.uid());
create policy perfiles_update on public.perfiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy grupos_select on public.grupos for select to authenticated using (public.soy_miembro(id));
create policy miembros_select on public.miembros for select to authenticated using (public.soy_miembro(grupo_id));

create policy juegos_ref_select on public.juegos_ref for select to authenticated using (true);
create policy calendario_select on public.calendario for select to authenticated using (true);

-- Los intentos solo se insertan con registrar_intento (sin política de insert).
create policy intentos_select on public.intentos for select to authenticated using (public.es_companero(user_id));
create policy extra_select on public.intentos_extra for select to authenticated using (user_id = auth.uid());

create policy train_select on public.entrenamiento_stats for select to authenticated using (user_id = auth.uid());
create policy train_insert on public.entrenamiento_stats for insert to authenticated with check (user_id = auth.uid());
create policy train_update on public.entrenamiento_stats for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========== Funciones ==========
create or replace function public.hoy_madrid() returns date
language sql stable as $$ select (now() at time zone 'Europe/Madrid')::date $$;

create or replace function public.crear_grupo(p_nombre text) returns public.grupos
language plpgsql security definer set search_path = public as $$
declare g public.grupos; cod text; i int := 0;
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  loop
    cod := '';
    for k in 1..6 loop
      cod := cod || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from grupos where codigo = cod);
    i := i + 1;
    if i > 20 then raise exception 'No se pudo generar un código'; end if;
  end loop;
  insert into grupos (nombre, codigo, creador) values (left(trim(p_nombre), 40), cod, auth.uid()) returning * into g;
  insert into miembros (grupo_id, user_id) values (g.id, auth.uid());
  return g;
end $$;

create or replace function public.unirse_grupo(p_codigo text) returns public.grupos
language plpgsql security definer set search_path = public as $$
declare g public.grupos;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  select * into g from grupos where codigo = upper(trim(p_codigo));
  if not found then raise exception 'No existe ese código'; end if;
  insert into miembros (grupo_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return g;
end $$;

create or replace function public.salir_grupo(p_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from miembros where grupo_id = p_id and user_id = auth.uid();
$$;

-- Marcadores razonables frente al Top 1 % (mismo criterio que packages/shared `isPlausible`).
create or replace function public.es_plausible(p_game text, p_score double precision) returns boolean
language plpgsql stable set search_path = public as $$
declare r juegos_ref;
begin
  select * into r from juegos_ref where juegos_ref.game_id = p_game;
  if not found then return false; end if;
  if p_score is null or p_score <> p_score or p_score = 'Infinity'::double precision then return false; end if;
  if r.top1 is null then return true; end if;
  if r.mejor = 'mayor' then
    return p_score >= 0 and p_score <= case when r.es_porcentaje then 100 else r.top1 * 1.5 end + 1e-9;
  end if;
  return p_score >= 0 and p_score >= r.top1 * 0.25 - 1e-9;
end $$;

create or replace function public.registrar_intento(p_fecha date, p_game text, p_score double precision, p_eventos jsonb default null)
returns public.intentos
language plpgsql security definer set search_path = public as $$
declare hoy date := public.hoy_madrid(); c calendario; usados int; extra int; rec public.intentos;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if p_fecha <> hoy then raise exception 'Solo se puede jugar el juego de hoy'; end if;
  select * into c from calendario where fecha = hoy;
  if not found or c.game_id <> p_game then raise exception 'Ese no es el juego de hoy'; end if;
  if not public.es_plausible(p_game, p_score) then raise exception 'Marcador no válido'; end if;
  select count(*) into usados from intentos where user_id = auth.uid() and fecha = hoy;
  select count(*) into extra from intentos_extra where user_id = auth.uid() and fecha = hoy;
  if usados >= 2 + extra then raise exception 'No te quedan intentos'; end if;
  insert into intentos (user_id, fecha, game_id, n, score, eventos)
  values (auth.uid(), hoy, p_game, usados + 1, p_score, p_eventos) returning * into rec;
  return rec;
end $$;

create or replace function public.puntos_rank(r int) returns int
language sql immutable as $$
  select case r when 1 then 10 when 2 then 7 when 3 then 5 when 4 then 4 when 5 then 3 when 6 then 2 else 1 end
$$;

-- Dados = 5 + 1 por día jugado + 3 por podio + 10 por temporada ganada − 3 por intento extra con dados.
create or replace function public.mis_dados() returns int
language sql stable security definer set search_path = public as $$
  with mis_grupos as (select grupo_id from miembros where user_id = auth.uid()),
  mejores as (
    select m.grupo_id, i.fecha, i.user_id,
      case when jr.mejor = 'mayor' then max(i.score) else -min(i.score) end as val,
      (array_agg(i.cuando order by case when jr.mejor = 'mayor' then i.score else -i.score end desc, i.cuando asc))[1] as cuando
    from miembros m
    join intentos i on i.user_id = m.user_id
    join calendario c on c.fecha = i.fecha and c.game_id = i.game_id
    join juegos_ref jr on jr.game_id = i.game_id
    where m.grupo_id in (select grupo_id from mis_grupos)
    group by m.grupo_id, i.fecha, i.user_id, jr.mejor
  ),
  ranked as (
    select *, row_number() over (partition by grupo_id, fecha order by val desc, cuando asc) as rk from mejores
  ),
  podios as (select count(distinct fecha) as n from ranked where user_id = auth.uid() and rk <= 3),
  jugados as (select count(distinct fecha) as n from intentos where user_id = auth.uid()),
  temporadas as (
    select grupo_id, user_id,
      floor((fecha - date '2026-09-28') / 21.0)::int as temp,
      sum(public.puntos_rank(rk::int)) as puntos,
      count(*) filter (where rk = 1) as victorias
    from ranked group by grupo_id, user_id, floor((fecha - date '2026-09-28') / 21.0)::int
  ),
  ganadas as (
    select count(*) as n from (
      select t.*, row_number() over (partition by grupo_id, temp order by puntos desc, victorias desc) as pos
      from temporadas t
      where temp < floor((public.hoy_madrid() - date '2026-09-28') / 21.0)::int
    ) x where user_id = auth.uid() and pos = 1 and puntos > 0
  ),
  gastados as (select count(*) as n from intentos_extra where user_id = auth.uid() and tipo = 'dados')
  select (5 + (select n from jugados) + 3 * (select n from podios) + 10 * (select n from ganadas) - 3 * (select n from gastados))::int;
$$;

create or replace function public.comprar_extra(p_fecha date, p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
declare hoy date := public.hoy_madrid();
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if p_fecha <> hoy then raise exception 'Solo para el juego de hoy'; end if;
  if p_tipo = 'anuncio' then
    if exists (select 1 from intentos_extra where user_id = auth.uid() and fecha = hoy and tipo = 'anuncio') then
      raise exception 'Solo un intento extra por anuncio al día';
    end if;
  elsif p_tipo = 'dados' then
    if public.mis_dados() < 3 then raise exception 'No tienes dados suficientes'; end if;
  else
    raise exception 'Tipo no válido';
  end if;
  insert into intentos_extra (user_id, fecha, tipo) values (auth.uid(), hoy, p_tipo);
end $$;

revoke all on function public.crear_grupo(text), public.unirse_grupo(text), public.salir_grupo(uuid),
  public.registrar_intento(date, text, double precision, jsonb), public.comprar_extra(date, text), public.mis_dados() from public, anon;
grant execute on function public.crear_grupo(text), public.unirse_grupo(text), public.salir_grupo(uuid),
  public.registrar_intento(date, text, double precision, jsonb), public.comprar_extra(date, text), public.mis_dados() to authenticated;

-- Tiempo real: la app se suscribe a cambios en intentos.
alter publication supabase_realtime add table public.intentos;
