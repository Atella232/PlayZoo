# PlayZoo — Estado real

Actualizado tras implementar el plan completo. Lo que sigue distingue **lo hecho y comprobado** de **lo hecho pero sin poder comprobar** y **lo pendiente**.

## Resumen por fase

| Fase | Estado | Notas |
|---|---|---|
| 0 · Preparación | ✅ | Node 24 y pnpm instalados en `~/.local/node` (no había Homebrew); monorepo, CI, `.env.example` |
| 1 · Motor y contrato | ✅ | Paso fijo a 60 Hz, entrada con marca de tiempo, RNG con semilla, audio sintetizado, controles reutilizables, ejecución sin pantalla (`runHeadless`) |
| 2 · Corte vertical | ✅ | Los 5 pilotos y luego el resto |
| 3 · Sistema del grupo | ✅ (demo) / ⚠️ (servidor) | Grupos, día, intentos, "Probar juego", marcadores en directo, temporadas, puntos, dados, "¡Uno más!". Verificado en modo demo; el SQL del servidor se ha ejecutado y probado en un Postgres real (PGlite), pero **no contra un proyecto Supabase** (Auth, Realtime y el cliente quedan sin probar) |
| 3b · Entrenamiento | ✅ | Pestaña propia, partidas ilimitadas, récords y estadísticas por juego, funciona sin conexión (PWA) |
| 4 · Los 71 juegos | ✅ | Los 71 implementados, con pruebas automáticas |
| 5 · Arte y sonido | ⚠️ parcial | Emojis como arte de animales, efectos de sonido sintetizados y vibración. **No hay arte final ilustrado** |
| 6 · Equilibrio y antitrampas | ⚠️ parcial | Calibrado con bots expertos, **no con jugadores humanos**. Tope de plausibilidad en cliente y servidor. Falta la validación por repetición de entradas en servidor |
| 7 · Publicación | ⚠️ parcial | PWA lista; Capacitor + AdMob (con consentimiento UMP) + recordatorio local escritos, **sin compilar** (no hay Xcode ni Android Studio en este equipo) |

## Qué se ha comprobado

- `pnpm test`: catálogo (71 juegos, ids y números únicos); para cada juego, **no falla con 3 bots aleatorios**, es **determinista**, **se reproduce exactamente** con las entradas grabadas y **dibuja sin errores**; generador de niveles de Burro de Carga siempre resoluble; calendario, formato de marcadores, puntos y clasificación; backend local (2 intentos, extras, rechazos, dados).
- **Bots expertos**: cada uno de los 71 juegos tiene un bot que lee el estado interno y lo juega bien (`packages/games/src/bots*.ts`). La prueba exige que alcance al menos una fracción razonable del Top 1 % del PDF (o, en tiempos, no más de 4 veces). Sirvió para descubrir y corregir defectos de diseño reales: huecos imposibles en Gorrión, pinchos solapados en Gecko, tronco saturado en Castor, haz inútil en Luciérnagas, puntuaciones desproporcionadas en Rana/Mantis/Pingüino, etc.
- **SQL del servidor** (`supabase/tests/sql.test.ts`): las dos migraciones se ejecutan en un Postgres real (PGlite, WASM) con un simulacro de `auth.uid()` y los roles de Supabase. 11 pruebas: carga de 71 juegos y 730 días, creación de grupo y códigos, seguridad por fila (un no miembro no ve grupos, perfiles ni intentos), un intento solo entra por `registrar_intento`, límite de 2 intentos + extras, rechazo de otro día / otro juego / marcas imposibles / NaN, dados (5 + 1 por día + 3 por podio − 3 por extra) y entrenamiento privado.
- `pnpm build`: PWA generada; cada juego es un paquete de ~3 kB que se carga bajo demanda; 866 kB precacheados para uso sin conexión.
- Revisión visual en el navegador de la app (bienvenida, hoy, entrenar, ranking) y de una veintena de juegos en la galería `/dev`.

## Qué **no** se ha podido comprobar

1. **Partida en tiempo real dentro de la interfaz.** El navegador integrado limita `requestAnimationFrame` a ~1,5 fps, así que no se pudo jugar una partida completa de principio a fin en la app. La lógica del flujo (intentos, guardado, dados, clasificación) está cubierta por pruebas de datos, y los juegos por bots y simulación; el flujo visual "ficha → cuenta atrás → partida → resultado" se ha revisado por partes.
2. **Supabase real.** El SQL sí está probado (ver arriba), pero no el cliente `supabaseBackend.ts` (correo mágico, tiempo real, `select` con relaciones) ni la política de correo/redirecciones de tu proyecto. Es lo primero que hay que probar con un proyecto real.
3. **Apps nativas y anuncios reales.** Sin Xcode/Android Studio no se compiló. Los anuncios usan los IDs de prueba de Google hasta que pongas los tuyos.
4. **Dificultad con humanos.** Los Top 1 % del PDF vienen de jugadores reales de otro juego; aquí solo se ha ajustado con bots. Hacen falta partidas de personas para afinar (ver "Cómo afinar").

## Decisiones que se apartan del plan original

- **Todos los juegos se dibujan en canvas** (también los de números y teclados), con un pequeño kit de controles propio, en vez de mezclar DOM y canvas. Más simple, uniforme y comprobable sin navegador.
- Los **kits compartidos** viven en `packages/games/src/kits`, no en un paquete aparte.
- Simulación a **60 Hz** (no 120).
- **Tope de 60 s** en todos los juegos de supervivencia (120 s en Flamenco y Tucán, que aguantan más según el PDF).
- Tope de plausibilidad en tiempos: no menos de **0,25 ×** el Top 1 % (0,5 × rechazaba tiros de suerte legítimos).
- Un intento **abandonado** o interrumpido (cerrar la app) cuenta como perdido, con la peor marca posible, para que no se pueda "espiar" la semilla del día.
- El calendario arranca el **28-09-2026** (día del documento) y es global: todos los grupos juegan lo mismo el mismo día.

## Reglas inventadas o interpretadas (a revisar contigo)

Ver la nota **Notas** de cada ficha en [docs/juegos](juegos/). Los más inciertos: Abejorro, Araña, Jardín de Luciérnagas (rediseñado), Lémur, Lobo Lunar, Mantis, Pulga y **Pitón Pi** (sin reglas en el PDF). En Carrera de Galgos los controles son míos. Gallo y Marmota puntúan con la **media** de desviaciones (no la suma).

## Cómo afinar la dificultad con personas

1. `pnpm dev` y abrir `#/dev`: cualquier juego, semilla fija, marcador en directo.
2. Anotar las marcas de 5–10 jugadores y comparar con el Top 1 % de la ficha.
3. Los parámetros de cada juego están al principio de su archivo (`packages/games/src/games/NN-*.ts`).
4. Repetir `pnpm test`: los bots expertos avisan si un cambio hace un juego injugable.

## Pendiente para una versión 1.0

- Probar el cliente `supabaseBackend.ts` contra un proyecto Supabase real (el SQL ya está validado en local).
- Validación en servidor por repetición de entradas (las entradas ya se graban y guardan; falta reejecutarlas).
- Arte ilustrado por animal, música y pulido de animaciones.
- Compilar iOS/Android, definir los IDs de AdMob, política de privacidad y textos de tienda.
- Notificaciones push desde servidor (ahora solo hay recordatorio local diario).
- Partidas de prueba con personas para calibrar los 71 juegos.
