# PlayZoo — Plan de la app

Fuente: `reglas-origen.pdf` (no incluido en el repositorio público) (71 minijuegos de ~60 s con temática animal). Detalle de cada juego en [juegos/](juegos/).

> **Estado de la implementación y desviaciones del plan: [ESTADO.md](ESTADO.md).**

## 1. Qué es

Un juego al día, el mismo para todo el grupo. Cada miembro tiene 2 intentos, cuenta el mejor, y ve arriba en directo las puntuaciones de los demás. Los puntos del grupo se acumulan en temporadas de 21 días.

Además hay una sección de **Entrenamiento**: los 71 juegos disponibles siempre, para jugar todas las veces que quieras, sin límite de intentos, sin coste y sin afectar a ningún marcador del grupo.

Reglas del PDF que la app respeta tal cual: 2 intentos, "Probar juego" (práctica que no cuenta), "¡Uno más!" (intento extra por anuncio o dados), ficha de instrucciones con duración aproximada, tarjeta diaria "#15/21", tres tipos de marcador (puntos, tiempo, precisión) y marca "Top 1 %" de referencia.

## 2. Decisiones que he tomado (vetables)

| Tema | Decisión | Por qué |
|---|---|---|
| Plataforma | Web móvil (PWA) empaquetada con Capacitor para iOS y Android | Un solo código para 71 juegos táctiles; iteración rápida y pruebas en el navegador integrado |
| Lenguaje | TypeScript, React + Vite para la interfaz | Estándar, tipado fuerte en el contrato de los juegos |
| Motor de juegos | Propio y pequeño sobre Canvas 2D (bucle de paso fijo, entrada, RNG, audio). Sin Phaser | 71 juegos muy simples; no queremos un motor grande ni su curva de aprendizaje |
| 3D | Pseudo-3D con canvas en Armadillo y Correcaminos. Three.js solo si hace falta en Topo Golfista 2 (carga bajo demanda) | Mantener la app ligera |
| Juegos "de interfaz" | Los de números, teclados y cuadrículas usan DOM/SVG, no canvas | Más fácil de hacer accesible y responsive |
| Backend | Supabase (Postgres, Auth, Realtime, Edge Functions) | Marcadores en directo, grupos y reglas de seguridad por fila sin montar servidor |
| Idioma | Español; textos en un archivo i18n por si luego hay más | El PDF está en español |
| Día de juego | Un calendario global: la misma prueba para todos los grupos, cambio a las 00:00 (Europa/Madrid) | Simple; un intento vale para todos tus grupos |
| Misma prueba | Semilla = hash(fecha + id del juego). Los 2 intentos usan la misma semilla; práctica usa una aleatoria | "Todos compiten con la misma prueba" |
| Temporadas | 21 días por temporada; los juegos del día salen de una barajada con semilla sin repetir dentro de la temporada y alternando categorías | 71 juegos = 3 temporadas completas y 8 días |
| Entrenamiento | Sección propia con los 71 juegos, partidas ilimitadas y gratis, semilla aleatoria en cada partida. No cuenta para el grupo, no gasta dados ni muestra anuncios. Guarda tu récord y estadísticas por juego | Pedido por ti; ya encaja con el "Probar juego" del PDF |
| Monetización | Detrás de una interfaz: anuncio recompensado (AdMob) y dados. Sin compras dentro de la app en la primera versión | El PDF no habla de pagos |
| Nombres y arte | Nombres y arte propios; sin usar marcas (Ballz, Piano Tiles, Sokoban, Scalextric) | Evitar problemas con tiendas y titulares de marcas |

## 3. Reglas del sistema que fijo yo

- **Puntos del día por grupo:** 1.º 10, 2.º 7, 3.º 5, 4.º 4, 5.º 3, 6.º 2, resto 1, no jugar 0. Constantes en un solo archivo.
- **Dados:** 5 al empezar; +1 por jugar cada día; +3 por podio del día; +10 por ganar la temporada. "¡Uno más!" cuesta 3 dados o un anuncio (máximo un intento extra por anuncio al día).
- **Desempate:** mejor puntuación; si igual, quien la hizo antes.
- **Techos de duración:** juegos de supervivencia 90 s; Flamenco y Tucán 120 s.
- **Calibración:** cada juego tiene su marca Top 1 % del PDF. La dificultad se ajusta para que un buen jugador llegue a ~esa marca. El servidor rechaza puntuaciones por encima de 1,5 × Top 1 %.

## 4. Arquitectura

```
PlayZoo/
  apps/web/            interfaz (React), PWA, Capacitor
  packages/engine/     bucle, entrada, RNG, audio, física ligera, grabación de entradas
  packages/kits/       módulos compartidos (ver §6)
  packages/games/      71 carpetas: definición + lógica + arte de cada juego
  packages/shared/     tipos, cálculo de puntos, calendario, formateo de marcadores
  supabase/            migraciones, políticas de seguridad, funciones
  tools/               generador de niveles, solver, bots de prueba
  docs/
```

**Contrato de minijuego** (lo que cada uno debe cumplir):

```ts
interface Minijuego {
  id: string; nombre: string; animal: string; categoria: Categoria;
  marcador: { tipo: 'puntos'|'metros'|'tiempo'|'precision'|'niveles'|...; mejor: 'mayor'|'menor'; formato(n): string };
  top1: number | null; duracionSeg: number; instrucciones: string;
  crear(ctx: { semilla: string; modo: 'entrenamiento'|'ranked'; rng; entrada; lienzo }): Partida;
}
interface Partida { iniciar(): void; actualizar(dt: number): void; dibujar(): void; resultado(): number | null }
```

Todo lo aleatorio sale de `ctx.rng`. La simulación va en paso fijo (120 Hz) con interpolación de dibujo. Así, el juego es idéntico en cualquier móvil y se puede reproducir con las entradas grabadas.

**Datos (Postgres):** `perfiles`, `grupos`, `miembros`, `calendario` (fecha → juego), `intentos` (usuario, fecha, nº, puntuación, entradas grabadas), `dados_movimientos`, `intentos_extra`, `entrenamiento_stats` (por usuario y juego: mejor marca, partidas jugadas, últimas 20 puntuaciones; no se guardan las entradas grabadas). Reglas de seguridad por fila y función `registrar_intento` que valida: máximo 2 intentos (más los extra comprados), fecha actual, tope de plausibilidad.

**Directo:** canal Realtime por grupo y día; la barra superior muestra `usuario · mejor puntuación`.

## 5. Pantallas

1. Inicio: tarjeta del día ("#15/21", juego, tus intentos, marcadores en directo).
2. Ficha del juego: reglas, "Duración ~40s", Jugar (partida del día, si es el juego de hoy) / Entrenar.
3. Partida: barra superior con marcadores del grupo y el juego a pantalla completa.
4. Resultado: tu puntuación, posición, "¡Uno más!" si no quedan intentos.
5. Clasificación: del día, de la temporada y histórico.
6. Grupo: crear, unirse por código, miembros.
7. **Entrenamiento** (pestaña propia): catálogo de los 71 juegos con filtros por categoría y por tipo de marcador, tu récord y tu marca frente al Top 1 %. Al tocar un juego se abre su ficha y "Entrenar". Tras cada partida: puntuación, comparación con tu récord y con el Top 1 %, botón "Otra vez" inmediato. Estadísticas por juego: mejor, media de las últimas 20, evolución y nº de partidas. Funciona sin conexión.
8. Perfil y dados.
9. Herramienta interna `/dev`: galería con los 71 juegos, semilla editable, superposición de depuración y bots.

## 6. Kits compartidos

Cada kit resuelve una familia de juegos. Se construye una vez y se reutiliza.

| Kit | Qué aporta | Juegos |
|---|---|---|
| `tap-timing` | Medidores, agujas y ventanas de acierto | 10 |
| `reaction` | Estímulos con vidas y tiempo de vida | 8 |
| `scroller` | Scroll automático, gravedad, colisiones | 7 |
| `quiz-dom` | Teclados, cuadrículas y rondas con penalización | 6 |
| `orbit-anchor` | Órbita alrededor de anclas y suelta balística | 4 |
| `physics-lite`, `path-follow`, `golf` | Rebotes y gravedad; caminos en zigzag; golf 2D | 3 cada uno |
| Resto (20 kits menores) | Un juego o dos cada uno | — |

## 7. Fases

**Fase 0 · Preparación.** Instalar Node y pnpm (ahora no hay Node en este Mac; necesito tu permiso para `brew install`). Crear el monorepo, lint, tests, CI.

**Fase 1 · Motor y contrato.** Bucle de paso fijo, entrada táctil/ratón/teclado, RNG con semilla, audio, grabación de entradas, formateo de marcadores, galería `/dev`.

**Fase 2 · Corte vertical (5 juegos piloto).** Gorrión Aleteador (`scroller`), Ojo de Halcón (`tap-timing`), Ardilla Contadora (`quiz-dom`), Colibrí Reflejos (`reaction`), Escarabajo Pelotero (joystick y mejor de 2 rondas). Cubren canvas, DOM, tiempo, puntos y precisión. Con esto se valida el contrato antes de escalar.

**Fase 3 · Sistema del grupo.** Autenticación, grupos, calendario y semillas, intentos y "Probar juego" en la ficha del día, marcadores en directo, temporadas y puntos, dados, "¡Uno más!" con anuncio simulado.

**Fase 3b · Entrenamiento.** Pestaña con el catálogo, modo de partida sin límites (`modo: 'entrenamiento'`), récords y estadísticas locales sincronizadas con `entrenamiento_stats`, funcionamiento sin conexión. Se construye con los 5 pilotos y cada juego nuevo aparece solo al registrarse en el catálogo, sin trabajo extra.

**Fase 4 · Juegos por oleadas.** Cada oleada termina con sus juegos calibrados y probados.

| Ola | Contenido | Juegos | Esfuerzo* |
|---|---|---|---|
| A | Reacción y timing simple | 15 | 15 |
| B | Memoria, lógica y cuestionarios | 15 | 23 |
| C | Supervivencia con un solo control | 21 | 29 |
| D | Física, órbitas y puntería | 12 | 39 |
| E | Carreras, golf y laberinto | 8 | 30 |

\*Unidades relativas: S = 1, M = 3, L = 6. Total: 136. Los 5 pilotos ya están dentro.

**Fase 5 · Arte, sonido y pulido.** Un icono de animal por juego, paleta y estilo únicos, efectos de sonido, vibración, animaciones de resultado. Accesibilidad: símbolos además de colores donde el color no es la prueba; ajuste de sonido y vibración.

**Fase 6 · Equilibrio y antitrampas.** Calibrar los 71 con el Top 1 % (objetivo ±20 %). Validar en servidor con repetición de entradas en los juegos deterministas (por muestreo en un grupo pequeño de amigos es suficiente al principio).

**Fase 7 · Publicación.** Capacitor, notificaciones push diarias, consentimiento de anuncios (obligatorio en la UE), pruebas cerradas y tiendas.

## 8. Definición de "hecho" por juego

- Cumple el contrato y aparece en la galería `/dev`.
- Ficha de instrucciones con la duración indicada.
- Aparece en Entrenamiento con récord y estadísticas, y se puede rejugar sin límite.
- Marcador con el formato correcto (ej. `163,9 m`, `1.026`, `0,288 s`, `97,89 %`).
- Determinista con la semilla; dos partidas con las mismas entradas dan la misma puntuación.
- Un bot de prueba lo completa y otro lo pierde rápido; ambos con resultado esperado.
- Calibrado con el Top 1 % del PDF.
- 60 fps en un móvil de gama media; funciona con toque, ratón y teclado.
- Sonido, vibración y pantalla de resultado.

## 9. Riesgos y puntos abiertos

1. **Reglas no oficiales.** 38 de los 71 juegos tienen reglas deducidas de vídeo (30), de vídeo más análisis externo (7) o solo del nombre (1). En sus fichas figura la fiabilidad y qué he inventado. Pide tu visto bueno antes de construir los 8 marcados como "análisis" o "sin confirmar".
2. **Pitón Pi** no tiene reglas ni Top 1 %. Lo dejo para el final.
3. **Controles de carreras:** el PDF no los describe para Carrera de Galgos. Mi propuesta está en su ficha.
4. **Latencia:** en juegos de reflejos la latencia de cada móvil decide. Se mide con la marca de tiempo del toque y se acepta la diferencia.
5. **Anuncios y privacidad:** consentimiento de la UE y política de privacidad antes de publicar.
6. **Peso:** 71 juegos deben cargarse bajo demanda (un paquete por juego).
7. **Marcadores con decimales** (Suricatas 12,8): interpretación mía (hoyos + progreso).

## 10. Los 71 juegos de un vistazo

Ficheros: [1-habilidad-arcade](juegos/1-habilidad-arcade.md) (01–28), [2-precision-timing](juegos/2-precision-timing.md) (29–36), [3-velocidad-contra-reloj](juegos/3-velocidad-contra-reloj.md) (37–49), [4-memoria-logica](juegos/4-memoria-logica.md) (50–59), [5-rapidez-multitarea](juegos/5-rapidez-multitarea.md) (60–71).

Tamaño: S pequeño, M medio, L grande. Ola: A–E, según §7.

| # | Juego | Marcador | Top 1 % | Kit | Tam. | Ola | Fiabilidad |
|---|---|---|---|---|---|---|---|
| 01 | Pingüino Escalador | Metros ↑ | 163,9 | `orbit-anchor` | M | D | Oficial |
| 02 | Púas de Puercoespín | Puntos ↑ | 26 | `tap-timing` | S | C | Vídeo |
| 03 | Lémur Giratorio | Puntos ↑ | 114 | `orbit-anchor` | M | D | Vídeo + análisis |
| 04 | Libélula Espacial | Puntos ↑ | 61 | `scroller` | S | C | Vídeo |
| 05 | Armadillo en Picado | Puntos ↑ | 462 | `pseudo3d-helix` | L | D | Vídeo |
| 06 | Rana Saltarina | Puntos ↑ | 554 | `tap-timing` | S | C | Vídeo |
| 07 | Pulga Botadora | Puntos ↑ | 69 | `physics-lite` | M | C | Vídeo + análisis |
| 08 | Gallina Aleteadora | Metros ↑ | 190 | `scroller` | M | C | Oficial |
| 09 | Murciélago entre Pinchos | Puntos ↑ | 42 | `scroller` | S | C | Vídeo |
| 10 | Guepardo Derrapante | Puntos ↑ | 143 | `path-follow` | S | C | Vídeo |
| 11 | Gorrión Aleteador | Puntos ↑ | 30 | `scroller` | S | C | Vídeo |
| 12 | Abejorro Propulsado | Metros ↑ | 264 | `scroller` | M | C | Vídeo + análisis |
| 13 | Erizo Cruzacalles | Puntos ↑ | 124 | `lane-cross` | S | C | Oficial |
| 14 | Foca Malabarista | Puntos ↑ | 41 | `physics-lite` | S | C | Oficial |
| 15 | Castor Lanzador | Puntos ↑ | 54 | `tap-timing` | S | C | Vídeo |
| 16 | Liebre en la Autopista | Metros ↑ | 1.026 | `lane-cross` | S | C | Vídeo |
| 17 | Lobo Lunar | Metros ↑ | 91,76 | `physics-lite` | M | D | Vídeo + análisis |
| 18 | Panda Leñador | Puntos ↑ | 130 | `tap-timing` | S | C | Vídeo |
| 19 | Gecko Trepador | Metros ↑ | 76,8 | `scroller` | S | C | Vídeo |
| 20 | Anguila Eléctrica | Puntos ↑ | 113 | `path-follow` | S | C | Oficial |
| 21 | Mantis Cortadora | Puntos ↑ | 306 | `slice-hold` | M | D | Vídeo + análisis |
| 22 | Serpiente Glotona | Puntos ↑ | 25 | `grid-snake` | S | C | Oficial |
| 23 | Flamenco Equilibrista | Segundos ↑ | 33,59 | `balance` | M | C | Oficial |
| 24 | Araña Tejedora | Puntos ↑ | 163 | `orbit-anchor` | M | D | Vídeo + análisis |
| 25 | Tucán Balancín | Segundos ↑ | 63,87 | `balance` | S | C | Vídeo |
| 26 | Camaleón Columpio | Puntos ↑ | 310 | `orbit-anchor` | M | D | Oficial |
| 27 | Canguro Trampolín | Puntos ↑ | 176 | `scroller` | S | C | Vídeo |
| 28 | Hormiga Zigzag | Puntos ↑ | 201 | `path-follow` | S | C | Oficial |
| 29 | Ojo de Halcón | Precisión media (%) ↑ | 97,89 | `tap-timing` | S | A | Oficial |
| 30 | Medusa a Partes Iguales | Precisión (%) ↑ | 99 % | `geometry-cut` | M | D | Oficial |
| 31 | Gallo Puntual | Desviación en segundos ↓ | 0 s | `tap-timing` | S | A | Oficial |
| 32 | Grillo Rítmico | Precisión (%) ↑ | 98,4 % | `tap-timing` | S | A | Oficial |
| 33 | Marmota Cronómetro | Desviación en segundos ↓ | 0,06 s | `tap-timing` | S | A | Oficial |
| 34 | Jirafa Apiladora | Bloques ↑ | 173 | `tap-timing` | S | A | Oficial |
| 35 | Paloma Mensajera | Puntos ↑ | 78 | `tap-timing` | S | A | Vídeo |
| 36 | Nutria Lanzadora | Puntos ↑ | 950 | `aim-throw` | M | D | Vídeo |
| 37 | Escarabajo Pelotero | Segundos ↓ | 8,80 s | `joystick-track` | M | E | Oficial |
| 38 | Carrera de Galgos | Segundos ↓ | 19,06 s | `racing-topdown` | M | E | Vídeo |
| 39 | Correcaminos | Segundos ↓ | 10,76 s | `pseudo3d-racing` | L | E | Vídeo |
| 40 | Hámster al Volante | Segundos ↓ | 15,25 s | `slot-car` | M | E | Vídeo |
| 41 | Topo Golfista | Segundos ↓ | 4,56 s | `golf` | M | E | Oficial |
| 42 | Topo Golfista 2 | Segundos ↓ | 5,78 s | `golf` | L | E | Vídeo |
| 43 | Suricatas del Minigolf | Hoyos ↑ | 12,8 | `golf` | M | E | Oficial |
| 44 | Ratón de Laberinto | Segundos ↓ | 12,69 s | `joystick-track` | M | E | Oficial |
| 45 | Búho Calculador | Segundos ↓ | 4,72 s | `quiz-dom` | S | B | Vídeo |
| 46 | Zorro de los Dados | Segundos ↓ | 3,46 s | `quiz-dom` | S | B | Vídeo |
| 47 | Ardilla Contadora | Segundos ↓ | 2,29 s | `quiz-dom` | S | B | Vídeo |
| 48 | Cotorra Telefonista | Segundos ↓ | 4,5 s | `quiz-dom` | S | B | Oficial |
| 49 | Colibrí Reflejos | Segundos ↓ | 0,288 s | `reaction` | S | A | Oficial |
| 50 | Trile del Mapache | Niveles ↑ | 13 | `shuffle-anim` | M | B | Oficial |
| 51 | Cuervo Contacajas | Niveles ↑ | 19 | `quiz-dom` | M | B | Oficial |
| 52 | Chimpancé Memorión | Puntos ↑ | 100 | `memory-grid` | S | B | Oficial |
| 53 | Elefante Memorioso | Puntos ↑ | 100 | `memory-seq` | S | B | Oficial |
| 54 | Panal de la Abeja | Puntos ↑ | 148 | `memory-grid` | S | B | Vídeo |
| 55 | Rastro del Caracol | Puntos ↑ | 98 | `trace` | M | B | Vídeo |
| 56 | Pulpo Camuflaje | Parecido (%) ↑ | 99,18 % | `color-match` | S | B | Oficial |
| 57 | Loro Dictado | Puntos ↑ | 55 | `quiz-dom` | S | B | Oficial |
| 58 | Burro de Carga | Puntos ↑ | 41 | `sokoban` | M | B | Oficial |
| 59 | Pitón Pi | Puntos | sin dato | `quiz-dom` | S | B | Sin confirmar |
| 60 | Bingo de la Oveja | Puntos ↑ | 221 | `reaction` | S | A | Vídeo |
| 61 | Rinoceronte Rompemuros | Puntos ↑ | 59 | `brick-shooter` | M | D | Vídeo |
| 62 | Sepia Reflejos | Puntos ↑ | 16 | `reaction` | S | A | Oficial |
| 63 | Jardín de Luciérnagas | Puntos ↑ | 129 | `deflect-guide` | M | D | Vídeo + análisis |
| 64 | Mariposa Pintora | Colores igualados ↑ | 32 | `color-match` | S | B | Oficial |
| 65 | Cigüeña Repartidora | Puntos ↑ | 86 | `reaction` | S | A | Vídeo |
| 66 | Gato Pianista | Puntos ↑ | 157 | `tiles` | S | A | Vídeo |
| 67 | Oso Encestador | Canastas ↑ | 33 | `aim-throw` | M | D | Oficial |
| 68 | Pájaro Carpintero | Toques ↑ | 139 | `reaction` | S | A | Oficial |
| 69 | Vencejo Veloz | Puntos ↑ | 71 | `reaction` | S | A | Vídeo |
| 70 | Golondrina Cazadora | Puntos ↑ | 731 | `reaction` | S | A | Oficial |
| 71 | Cangrejo Interruptor | Puntos ↑ | 73 | `reaction` | S | A | Vídeo |
