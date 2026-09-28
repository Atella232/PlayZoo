# PlayZoo 🦊

Un minijuego animal al día para competir con tu grupo. 71 minijuegos de ~60 s, 2 intentos por juego, marcadores en directo, temporadas de 21 días, dados, modo práctica y una sección de **Entrenamiento** con partidas ilimitadas.

- Reglas de origen: `docs/reglas-origen.pdf` (no incluido en el repositorio público; las reglas están resumidas en las fichas de los juegos)
- Plan y decisiones: [docs/PLAN.md](docs/PLAN.md) · Estado real y pendientes: [docs/ESTADO.md](docs/ESTADO.md)
- Ficha de cada juego: [docs/juegos/](docs/juegos/)

## Arrancar

Requiere Node 22+ y pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:5173  (modo demo, sin servidor)
```

Otros comandos:

```bash
pnpm test         # pruebas: 71 juegos, bots expertos, calendario, puntos, datos
pnpm typecheck
pnpm build        # PWA en apps/web/dist
pnpm gen:catalog  # regenera catálogo desde docs/juegos/*.md (python3)
pnpm gen:sql      # regenera los datos iniciales del servidor
```

En desarrollo hay una galería interna en `#/dev` (Perfil → Galería): cualquier juego, semilla editable y simulación con bots.

## Estructura

```
apps/web/            interfaz (React + Vite, PWA, Capacitor)
packages/engine/     bucle de paso fijo, entrada, RNG con semilla, audio, controles, dibujo
packages/shared/     marcadores, formato, calendario, puntos, tope de plausibilidad
packages/games/      catálogo de los 71 juegos + un archivo por juego + kits + bots de prueba
supabase/migrations/ esquema, políticas de seguridad y funciones; datos iniciales generados
tools/               generadores (catálogo, SQL)
docs/                plan, estado, fichas de los juegos
```

Cada juego es un módulo con `create(ctx)` que devuelve `{ update, render, over, score }`. Todo lo aleatorio sale de `ctx.rng` (semilla = fecha + juego), la simulación va a 60 Hz fijos y las entradas llevan marca de tiempo, así que una partida se puede reproducir exactamente.

## Servidor real (Supabase)

Sin configurar nada la app corre en **modo demo**: datos en el dispositivo y un grupo con jugadores simulados (claramente rotulado). Para jugar con amigos:

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En el editor SQL ejecuta, en orden, `supabase/migrations/0001_init.sql` y `0002_seed_juegos_calendario.sql`.
3. En *Authentication → Providers* deja activado el acceso por correo (enlace mágico) y añade tu URL en *Redirect URLs*.
4. Copia `apps/web/.env.example` a `apps/web/.env.local` y pon la URL y la clave anon.
5. `pnpm dev`. Al entrar te pedirá un correo.

El servidor valida en cada intento: que sea el juego de hoy (calendario de Madrid), el máximo de intentos (2 + extras) y que la marca no supere el tope frente al Top 1 %. Las marcas se calculan en el cliente; la validación por repetición de entradas está pendiente (ver ESTADO).

## App nativa (iOS / Android)

La app está preparada con Capacitor (`apps/web/capacitor.config.ts`), anuncios recompensados con AdMob (con consentimiento UMP) y recordatorio diario local. Hace falta Xcode / Android Studio:

```bash
cd apps/web
pnpm exec cap add ios      # o android
pnpm cap:sync
pnpm cap:ios
```

Añade tu *App ID* de AdMob en `Info.plist` / `AndroidManifest.xml` (por defecto se usan anuncios de prueba de Google) y define `VITE_ADMOB_REWARDED_ID` para producción.
