# Rapidez y multitarea (12 juegos, 60–71)

Suman puntos resolviendo estímulos tan rápido como aparecen, casi siempre durante un tiempo fijo (60 s salvo indicación).

### 60 · Bingo de la Oveja
- **Marcador:** Puntos ↑ · Top 1 % 221 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** reaction · **Tamaño:** S · **Ola:** A
- **Mecánica:** van saliendo bolas con números; se marcan las que coinciden con el cartón de 2×2.
- **Reglas y dificultad:** 3 vidas. Tocar un número que no ha salido = −1 vida. Cartón completo = bonus y cartón nuevo. Las bolas salen cada vez más rápido.
- **Notas:** secuencia de bolas con semilla.

### 61 · Rinoceronte Rompemuros
- **Marcador:** Puntos ↑ · Top 1 % 59 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** brick-shooter · **Tamaño:** M · **Ola:** D
- **Mecánica:** apuntar y disparar bolas para romper ladrillos numerados antes de que bajen.
- **Reglas y dificultad:** cada turno baja una fila. Cada ladrillo tiene una resistencia. Puntos por turno superado. Si un ladrillo llega abajo = fin.
- **Notas:** física de rebote de bolas con paso fijo; nombre distinto de "Ballz".

### 62 · Sepia Reflejos
- **Marcador:** Puntos ↑ · Top 1 % 16 · **Duración:** ~27 s · **Fiabilidad:** Oficial
- **Kit:** reaction · **Tamaño:** S · **Ola:** A
- **Mecánica:** se espera a que cambie el color de fondo y se toca lo más rápido posible. Tocar antes penaliza.
- **Reglas y dificultad:** ≤ 350 ms = +2, ≤ 600 ms = +1, más lento = 0. Toque anticipado = −2. Esperas aleatorias con semilla.
- **Notas:** la tabla de puntos es mía; se ajusta con el Top 1 % de 16.

### 63 · Jardín de Luciérnagas
- **Marcador:** Puntos ↑ · Top 1 % 129 · **Duración:** ~60 s · **Fiabilidad:** Vídeo + análisis
- **Kit:** deflect-guide · **Tamaño:** M · **Ola:** D
- **Mecánica:** caen luciérnagas de colores y hay que guiar cada una hasta la flor de su color girando un haz de luz de luna.
- **Reglas y dificultad (implementadas):** todas las luciérnagas convergen en una linterna central; al llegar salen disparadas en la dirección del haz, que el jugador orienta tocando una flor o arrastrando. Llegan espaciadas (mín. 0,42 s) para poder reorientar. Acierto = +1, flor equivocada o luciérnaga perdida = −1 vida (3 vidas).
- **Notas:** la primera idea (haz que intercepta luciérnagas que caen en vertical) era injugable con el haz casi vertical; se rediseñó al detectarlo con el bot experto. Cada flor lleva un símbolo además del color.

### 64 · Mariposa Pintora
- **Marcador:** Colores igualados ↑ · Top 1 % 32 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** color-match · **Tamaño:** S · **Ola:** B
- **Mecánica:** igualar el color de la izquierda con el de la derecha lo más rápido posible con barras de tono y brillo.
- **Reglas y dificultad:** se da por igualado cuando ΔE < umbral; entonces pasa al siguiente color. Sin castigo por fallo, solo tiempo.
- **Notas:** el umbral se calibra para llegar a unos 2 s por color en el Top 1 %.

### 65 · Cigüeña Repartidora
- **Marcador:** Puntos ↑ · Top 1 % 86 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** reaction · **Tamaño:** S · **Ola:** A
- **Mecánica:** llegan paquetes por una cinta; con ←, ↑ y → se manda cada uno al contenedor de su color.
- **Reglas y dificultad:** +1 por acierto; error o paquete que se cae = −1 vida (3). La cinta se acelera.
- **Notas:** añadir forma o icono a los contenedores para daltónicos.

### 66 · Gato Pianista
- **Marcador:** Puntos ↑ · Top 1 % 157 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** tiles · **Tamaño:** S · **Ola:** A
- **Mecánica:** estilo Piano Tiles: se tocan las teclas que bajan sin tocar huecos vacíos.
- **Reglas y dificultad:** 4 columnas. Fallo o tecla que llega abajo = fin. La velocidad sube con el progreso.
- **Notas:** arte y nombre propios, sin imitar ningún original.

### 67 · Oso Encestador
- **Marcador:** Canastas ↑ · Top 1 % 33 · **Duración:** hasta que el reloj llegue a 0 · **Fiabilidad:** Oficial
- **Kit:** aim-throw · **Tamaño:** M · **Ola:** D
- **Mecánica:** se toca para tirar a canasta. La primera canasta activa el reloj; hay que seguir encestando antes de que llegue a cero. Cada tiro es más rápido y difícil.
- **Reglas y dificultad:** un indicador de mira oscila sobre el aro; el toque fija el tiro. Reloj de 20 s tras la primera canasta; cada canasta suma 1 s (baja con el progreso).
- **Notas:** los tiempos exactos del reloj son mi propuesta, a ajustar con el Top 1 % de 33.

### 68 · Pájaro Carpintero
- **Marcador:** Toques ↑ · Top 1 % 139 · **Duración:** 15 s · **Fiabilidad:** Oficial
- **Kit:** reaction · **Tamaño:** S · **Ola:** A
- **Mecánica:** se toca el tronco tantas veces como se pueda en el tiempo del juego.
- **Reglas y dificultad:** se admiten varios dedos a la vez. Tope de plausibilidad de 20 toques/s para el servidor.
- **Notas:** el documento no dice el tiempo; 15 s encaja con 139 toques.

### 69 · Vencejo Veloz
- **Marcador:** Puntos ↑ · Top 1 % 71 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** reaction · **Tamaño:** S · **Ola:** A
- **Mecánica:** salen 4 casillas con flechas; se desliza en su dirección antes de que se vacíe su barra.
- **Reglas y dificultad:** +1 por acierto y la casilla se renueva; dirección equivocada o barra vacía = −1 vida (3). Barras cada vez más cortas.
- **Notas:** reconocimiento de deslizamiento con umbral mínimo de 30 px.

### 70 · Golondrina Cazadora
- **Marcador:** Puntos ↑ · Top 1 % 731 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** reaction · **Tamaño:** S · **Ola:** A
- **Mecánica:** se tocan los objetivos antes de que desaparezcan.
- **Reglas y dificultad:** 3 vidas: objetivo que desaparece = −1 vida. Puntos por objetivo según rapidez (10–30) y racha.
- **Notas:** posiciones y tiempos de vida con semilla.

### 71 · Cangrejo Interruptor
- **Marcador:** Puntos ↑ · Top 1 % 73 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** reaction · **Tamaño:** S · **Ola:** A
- **Mecánica:** aparecen interruptores por la pantalla; hay que activarlos antes de que se vacíe la barra de tiempo.
- **Reglas y dificultad:** +1 por interruptor y cada uno devuelve un poco de barra. Aparecen más a la vez con el tiempo. Barra vacía = fin.
- **Notas:** posiciones con semilla y sin solapes.
