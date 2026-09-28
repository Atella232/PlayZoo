# Habilidad y arcade (28 juegos, 01–28)

Juegos de supervivencia: se suma hasta chocar o caer. Regla común: techo de seguridad de 90 s (120 s en los de "aguantar"), y la dificultad se calibra para que un Top 1 % llegue a su marca dentro de ese techo.

### 01 · Pingüino Escalador
- **Marcador:** Metros ↑ · Top 1 % 163,9 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** orbit-anchor · **Tamaño:** M · **Ola:** D
- **Mecánica:** el pingüino orbita alrededor del piolet clavado en el hielo. Al tocar, sale en tangente y vuela hasta la siguiente placa de hielo seguro; debe aterrizar en la zona verde para engancharse al siguiente piolet.
- **Reglas y dificultad:** falla si aterriza fuera del hielo seguro o tarda más del límite por tramo (3 s, baja poco a poco). Aterrizaje "Perfecto" (centro de la zona verde) = +10 m. Las zonas verdes se estrechan y se alejan.
- **Notas:** comparte lógica de órbita con Lémur Giratorio. Radio y velocidad angular fijos para que sea justo con la semilla.

### 02 · Púas de Puercoespín
- **Marcador:** Puntos ↑ · Top 1 % 26 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** C
- **Mecánica:** una pared tiene púas clavadas con huecos; en la pared opuesta una púa se desplaza arriba y abajo. Al tocar, se dispara horizontalmente hacia la pared contraria.
- **Reglas y dificultad:** si entra en un hueco libre: +1 y se regeneran las púas. Si choca con una púa clavada: fin. Cada punto reduce el hueco y acelera el vaivén.
- **Notas:** patrón de huecos generado con RNG de semilla.

### 03 · Lémur Giratorio
- **Marcador:** Puntos ↑ · Top 1 % 114 · **Duración:** ~60 s · **Fiabilidad:** Vídeo + análisis
- **Kit:** orbit-anchor · **Tamaño:** M · **Ola:** D
- **Mecánica:** la bola avanza por un camino con curvas. En cada curva hay un ancla con una zona roja. Se engancha solo si se pulsa mientras la bola está en la zona roja; al soltar cuando apunta al tramo siguiente, sigue recta.
- **Reglas y dificultad:** engancharse fuera de la zona roja o soltar mal = se sale del camino = fin. +1 por curva, bonus por soltar casi perfecto. Curvas más cerradas y rápidas.
- **Notas:** las reglas vienen de un análisis externo sin confirmar; dejar tolerancias como constantes ajustables.

### 04 · Libélula Espacial
- **Marcador:** Puntos ↑ · Top 1 % 61 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** scroller · **Tamaño:** S · **Ola:** C
- **Mecánica:** campo de asteroides con scroll vertical automático. La libélula sigue el dedo (arrastre relativo).
- **Reglas y dificultad:** +1 por asteroide o fila superada; choque = fin. Asteroides más rápidos, más densos y con algunos que derivan.
- **Notas:** hitbox de la libélula algo menor que el sprite para que se sienta justo.

### 05 · Armadillo en Picado
- **Marcador:** Puntos ↑ · Top 1 % 462 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** pseudo3d-helix · **Tamaño:** L · **Ola:** D
- **Mecánica:** la bola desciende por una torre en espiral que gira. Mantener pulsado = bajar más rápido (rodar); toques suaves = giran la torre.
- **Reglas y dificultad:** los huecos de los pisos hay que aprovecharlos; caer en plataforma roja o chocar de frente = fin. Puntos por profundidad y por pisos seguidos sin frenar.
- **Notas:** se renderiza en pseudo-3D con canvas (sin Three.js). Es el kit más raro de la ola D.

### 06 · Rana Saltarina
- **Marcador:** Puntos ↑ · Top 1 % 554 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** C
- **Mecánica:** la rana salta de plataforma en plataforma; se muestra una trayectoria marcada. Mantener pulsado carga la fuerza, soltar salta.
- **Reglas y dificultad:** hay que caer sobre la plataforma siguiente; caer al agua = fin. Puntos por salto + bonus de racha si cae centrada. Plataformas más lejanas y pequeñas, algunas móviles.
- **Notas:** 554 puntos implican rachas de "perfecto" con multiplicador; valorar en calibración.

### 07 · Pulga Botadora
- **Marcador:** Puntos ↑ · Top 1 % 69 · **Duración:** ~60 s · **Fiabilidad:** Vídeo + análisis
- **Kit:** physics-lite · **Tamaño:** M · **Ola:** C
- **Mecánica:** la pulga cae; el jugador dibuja una línea debajo para que rebote y no llegue a los pinchos del suelo.
- **Reglas y dificultad:** cada línea dura un solo rebote o pocos segundos; tinta limitada. Rebotes seguidos dan combo 1, 2, 3… puntos. La gravedad aumenta con el tiempo.
- **Notas:** reflexión respecto al segmento dibujado; cuidar el caso de líneas casi horizontales.

### 08 · Gallina Aleteadora
- **Marcador:** Metros ↑ · Top 1 % 190 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** scroller · **Tamaño:** M · **Ola:** C
- **Mecánica:** toque a la izquierda o derecha de la pantalla = aleteo hacia ese lado (impulso hacia arriba + lateral). Sube por un desfiladero cada vez más estrecho con viento variable.
- **Reglas y dificultad:** tocar una pared = fin. El desfiladero se estrecha y el viento cambia de dirección con aviso visual (plumas/hojas).
- **Notas:** parámetros de gravedad e impulso en un solo objeto para calibrar con el Top 1 %.

### 09 · Murciélago entre Pinchos
- **Marcador:** Puntos ↑ · Top 1 % 42 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** scroller · **Tamaño:** S · **Ola:** C
- **Mecánica:** el murciélago rebota de pared a pared solo; aparecen pinchos en los laterales. Al tocar, aletea y cambia de sentido para esquivarlos.
- **Reglas y dificultad:** +1 por rebote en pared; tocar pinchos = fin. Más pinchos y menos huecos.
- **Notas:** diferenciar visualmente de Gorrión Aleteador (caída lateral, no vertical).

### 10 · Guepardo Derrapante
- **Marcador:** Puntos ↑ · Top 1 % 143 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** path-follow · **Tamaño:** S · **Ola:** C
- **Mecánica:** camino ancho en zigzag isométrico; el guepardo avanza solo. Tocar cambia entre dos direcciones y derrapa un poco.
- **Reglas y dificultad:** salirse del camino = fin. +1 por tramo; la velocidad crece. Camino más estrecho con el tiempo.
- **Notas:** el derrape es solo suavizado del giro, sin física real.

### 11 · Gorrión Aleteador
- **Marcador:** Puntos ↑ · Top 1 % 30 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** scroller · **Tamaño:** S · **Ola:** C
- **Mecánica:** cada toque da un impulso hacia arriba; hay que pasar por los huecos entre columnas.
- **Reglas y dificultad:** +1 por columna pasada. Tocar columna, techo o suelo = fin. Velocidad constante; altura de huecos aleatoria y tamaño decreciente.
- **Notas:** juego piloto del kit `scroller`.

### 12 · Abejorro Propulsado
- **Marcador:** Metros ↑ · Top 1 % 264 · **Duración:** ~60 s · **Fiabilidad:** Vídeo + análisis
- **Kit:** scroller · **Tamaño:** M · **Ola:** C
- **Mecánica:** el abejorro sube esquivando rayos láser. La cámara lo mantiene en el centro. Se mueve arrastrando en horizontal.
- **Reglas y dificultad:** láser horizontal con hueco y láseres diagonales con aviso de 0,6 s. La velocidad de ascenso crece.
- **Notas:** las reglas vienen de análisis externo: mantener el tipo de láser y avisos parametrizables.

### 13 · Erizo Cruzacalles
- **Marcador:** Puntos ↑ · Top 1 % 124 · **Duración:** ~40 s · **Fiabilidad:** Oficial
- **Kit:** lane-cross · **Tamaño:** S · **Ola:** C
- **Mecánica:** desliza arriba/abajo/izquierda/derecha para moverse por cuadrícula entre carriles con coches.
- **Reglas y dificultad:** +1 por fila nueva alcanzada. Choque = fin. Si te quedas parado más de ~3 s, cae un águila (fin). Fin fijo a los 40 s.
- **Notas:** generación de carriles con semilla y tabla de patrones de velocidad para que todos tengan la misma calle.

### 14 · Foca Malabarista
- **Marcador:** Puntos ↑ · Top 1 % 41 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** physics-lite · **Tamaño:** S · **Ola:** C
- **Mecánica:** mantener pulsado y arrastrar mueve la foca para que la pelota no caiga. Cada toque de la pelota = +1.
- **Reglas y dificultad:** pelota con gravedad y rebote elástico; el ángulo depende de dónde toca en la nariz. Si cae, fin. Cada rebote la acelera un poco.
- **Notas:** sin aleatoriedad salvo la posición y velocidad iniciales (semilla).

### 15 · Castor Lanzador
- **Marcador:** Puntos ↑ · Top 1 % 54 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** C
- **Mecánica:** un tronco gira; al tocar, se lanza un diente de castor que se clava.
- **Reglas y dificultad:** chocar con un diente ya clavado = fin. +1 por diente. Al clavar N, el tronco se rompe y cambia de tipo (más rápido, invierte giro, velocidad variable).
- **Notas:** dientes precolocados por nivel según semilla.

### 16 · Liebre en la Autopista
- **Marcador:** Metros ↑ · Top 1 % 1.026 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** lane-cross · **Tamaño:** S · **Ola:** C
- **Mecánica:** cambio de carril tocando izquierda/derecha; tráfico en sentido contrario y en el mismo sentido.
- **Reglas y dificultad:** choque = fin. La velocidad aumenta; los metros suben con la velocidad, no por tiempo.
- **Notas:** formato de miles con punto ("1.026") ya en el formateador de marcadores.

### 17 · Lobo Lunar
- **Marcador:** Metros ↑ · Top 1 % 91,76 · **Duración:** ~60 s · **Fiabilidad:** Vídeo + análisis
- **Kit:** physics-lite · **Tamaño:** M · **Ola:** D
- **Mecánica:** se lanza el lobo (medidor de ángulo que oscila, un toque lo fija) sobre montañas curvas. Al caer en pendiente descendente, mantener pulsado acelera.
- **Reglas y dificultad:** un lanzamiento "Perfecto" congela el reloj (el tiempo restante no baja durante ese vuelo). Gana la distancia total.
- **Notas:** reglas sin confirmar: dejar como interpretación. Terreno de curvas suaves con semilla.

### 18 · Panda Leñador
- **Marcador:** Puntos ↑ · Top 1 % 130 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** C
- **Mecánica:** dos botones (izquierda/derecha): el panda corta el bambú cambiando de lado para esquivar las ramas.
- **Reglas y dificultad:** cada corte +1 y rellena la barra de tiempo; la barra se vacía más rápido con el progreso. Rama que golpea = fin.
- **Notas:** patrón de ramas generado con semilla; sin dos ramas imposibles seguidas.

### 19 · Gecko Trepador
- **Marcador:** Metros ↑ · Top 1 % 76,8 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** scroller · **Tamaño:** S · **Ola:** C
- **Mecánica:** ascenso vertical; el gecko salta de una pared a la otra con un toque.
- **Reglas y dificultad:** pinchos en ambas paredes con aviso; tocar pinchos = fin. La velocidad de ascenso crece.
- **Notas:** no confundir con Murciélago (aquí el eje es vertical y el salto es con arco).

### 20 · Anguila Eléctrica
- **Marcador:** Puntos ↑ · Top 1 % 113 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** path-follow · **Tamaño:** S · **Ola:** C
- **Mecánica:** el toque cambia la dirección; la anguila avanza en zigzag entre barras de neón y recoge los puntos amarillos.
- **Reglas y dificultad:** cada punto amarillo +1. Tocar una barra = fin. Las barras se acercan y la velocidad sube.
- **Notas:** estética neón; estela luminosa.

### 21 · Mantis Cortadora
- **Marcador:** Puntos ↑ · Top 1 % 306 · **Duración:** ~60 s · **Fiabilidad:** Vídeo + análisis
- **Kit:** slice-hold · **Tamaño:** M · **Ola:** D
- **Mecánica:** llegan cubos en cascada; mantener el dedo pulsado hace que la mantis corte los cubos que pasan por su zona. Hay que levantar el dedo antes de los cubos prohibidos (rojos).
- **Reglas y dificultad:** 3 vidas; cortar un cubo prohibido pierde una vida. Los cubos válidos seguidos dan racha con multiplicador.
- **Notas:** sin confirmar del todo. El multiplicador exacto se calibra con el Top 1 %.

### 22 · Serpiente Glotona
- **Marcador:** Puntos ↑ · Top 1 % 25 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** grid-snake · **Tamaño:** S · **Ola:** C
- **Mecánica:** deslizar para dirigir la serpiente. Cada punto alarga la cola y sube la velocidad. Aparecen obstáculos.
- **Reglas y dificultad:** tocar obstáculo, pared o cola = fin. Fruta en posiciones con semilla.
- **Notas:** control por deslizamiento con "buffer" de un giro para no perder gestos rápidos.

### 23 · Flamenco Equilibrista
- **Marcador:** Segundos ↑ · Top 1 % 33,59 · **Duración:** hasta caer (techo 120 s) · **Fiabilidad:** Oficial
- **Kit:** balance · **Tamaño:** M · **Ola:** C
- **Mecánica:** péndulo invertido: una espada en equilibrio sobre el dedo; se mueve el dedo a los lados para sostenerla.
- **Reglas y dificultad:** si el ángulo supera un umbral, fin. Ráfagas de viento cada vez más fuertes.
- **Notas:** comparte kit con Tucán Balancín. Integración en paso fijo para que sea idéntico en todos los móviles.

### 24 · Araña Tejedora
- **Marcador:** Puntos ↑ · Top 1 % 163 · **Duración:** ~60 s · **Fiabilidad:** Vídeo + análisis
- **Kit:** orbit-anchor · **Tamaño:** M · **Ola:** D
- **Mecánica:** dos botones. "Girar" hace rotar el hilo alrededor del nodo actual; "Crecer" alarga el hilo. Al alcanzar el siguiente nodo, la araña se ancla.
- **Reglas y dificultad:** el hilo no puede cruzar el existente ni pasarse del límite de longitud; si se rompe, fin. Puntos por nodo y bonus por rapidez.
- **Notas:** sin confirmar del todo. Nodos generados con semilla y distancias válidas siempre.

### 25 · Tucán Balancín
- **Marcador:** Segundos ↑ · Top 1 % 63,87 · **Duración:** hasta caer (techo 120 s) · **Fiabilidad:** Vídeo
- **Kit:** balance · **Tamaño:** S · **Ola:** C
- **Mecánica:** una bola sobre una balanza; se inclina con arrastre/toque en cada lado. Con la bola centrada aparece el multiplicador "Perfecto (2x)".
- **Reglas y dificultad:** la bola cae = fin. El tiempo cuenta doble en la zona central. Perturbaciones que aumentan.
- **Notas:** el marcador es el tiempo equivalente (con el doble incluido).

### 26 · Camaleón Columpio
- **Marcador:** Puntos ↑ · Top 1 % 310 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** orbit-anchor · **Tamaño:** M · **Ola:** D
- **Mecánica:** mantener pulsado lanza la lengua al ancla más cercana y se balancea como un péndulo; soltar = vuelo balístico hasta la siguiente columna.
- **Reglas y dificultad:** caer al vacío = fin. Puntos por distancia recorrida.
- **Notas:** cuerda con longitud fija en el enganche. Cámara suave.

### 27 · Canguro Trampolín
- **Marcador:** Puntos ↑ · Top 1 % 176 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** scroller · **Tamaño:** S · **Ola:** C
- **Mecánica:** el canguro rebota automáticamente; se controla en horizontal (arrastre). Plataformas flotantes a distinta altura.
- **Reglas y dificultad:** los puntos son la altura máxima. Caer = fin. Plataformas menos frecuentes y algunas móviles.
- **Notas:** wrap horizontal (salir por un lado y entrar por el otro).

### 28 · Hormiga Zigzag
- **Marcador:** Puntos ↑ · Top 1 % 201 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** path-follow · **Tamaño:** S · **Ola:** C
- **Mecánica:** un toque cambia la dirección de la hormiga por un camino estrecho de zigzag. Baldosas que desaparecen tras pasar.
- **Reglas y dificultad:** salirse = fin. +1 por giro correcto. Velocidad creciente.
- **Notas:** diferenciar de Guepardo: camino estrecho de baldosas y giros de 45°, sin derrape.
