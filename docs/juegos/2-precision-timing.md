# Precisión y timing (8 juegos, 29–36)

Cuenta tocar en el instante o el punto exacto. Los tiempos se miden con `event.timeStamp` del toque (no con el frame de render) para que la latencia de pantalla pese lo mínimo posible.

### 29 · Ojo de Halcón
- **Marcador:** Precisión media (%) ↑ · Top 1 % 97,89 · **Duración:** ~30 s · **Fiabilidad:** Oficial
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** A
- **Mecánica:** una aguja recorre una barra de colores; se toca cuando esté en el centro. Son 5 toques.
- **Reglas y dificultad:** precisión de cada toque = 100 − distancia al centro normalizada. La velocidad de la aguja sube en cada toque. Marcador = media de los 5.
- **Notas:** juego piloto del kit `tap-timing`. Velocidad inicial y fase con semilla.

### 30 · Medusa a Partes Iguales
- **Marcador:** Precisión (%) ↑ · Top 1 % 99 % · **Duración:** ~30 s · **Fiabilidad:** Oficial
- **Kit:** geometry-cut · **Tamaño:** M · **Ola:** D
- **Mecánica:** se arrastra el dedo sobre la medusa para cortarla: primero por la mitad (50 %), luego un tercio y luego un cuarto.
- **Reglas y dificultad:** se calcula el área real de cada trozo respecto a la medusa (rasterizando en un canvas fuera de pantalla). Error = |área obtenida − objetivo|. Marcador = media de los tres cortes.
- **Notas:** medusa con forma irregular distinta cada día (semilla). Corte recto: se toma la línea entre punto inicial y final del gesto.

### 31 · Gallo Puntual
- **Marcador:** Desviación en segundos ↓ · Top 1 % 0 s · **Duración:** ~40 s · **Fiabilidad:** Oficial
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** A
- **Mecánica:** un contador avanza y el gallo pide "Toca en 7"; hay que detenerlo justo en ese valor. Se repite en 5 rondas.
- **Reglas y dificultad:** objetivo distinto por ronda (semilla). Desde la ronda 4 el contador se oculta tras 1 s. Marcador = suma de desviaciones absolutas.
- **Notas:** ocultar el contador es decisión mía para que un 0 s siga siendo un logro real, no solo de lectura de pantalla.

### 32 · Grillo Rítmico
- **Marcador:** Precisión (%) ↑ · Top 1 % 98,4 % · **Duración:** ~40 s · **Fiabilidad:** Oficial
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** A
- **Mecánica:** fase 1: se sigue con toques el pulso de una luz. Fase 2: la luz desaparece y hay que mantener el mismo tempo.
- **Reglas y dificultad:** el intervalo depende de una semilla (entre 500 y 800 ms). Precisión = 100 − error medio relativo al intervalo, calculado solo en la fase 2.
- **Notas:** sonido de grillo sincronizado con la luz (AudioContext programado, no `setTimeout`).

### 33 · Marmota Cronómetro
- **Marcador:** Desviación en segundos ↓ · Top 1 % 0,06 s · **Duración:** ~40 s · **Fiabilidad:** Oficial
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** A
- **Mecánica:** una barra se vacía y hay que tocar justo cuando llega al final ("Toca cuando termine"). 3 rondas.
- **Reglas y dificultad:** duraciones distintas por ronda (semilla, de 3 a 8 s). En las rondas 2 y 3 se tapa el último tramo de la barra.
- **Notas:** distinto de Gallo Puntual: barra de progreso en vez de número.

### 34 · Jirafa Apiladora
- **Marcador:** Bloques ↑ · Top 1 % 173 · **Duración:** ~40 s · **Fiabilidad:** Oficial
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** A
- **Mecánica:** un bloque se desliza sobre la torre; al tocar se suelta. Lo que sobresale se corta. Cuanto más alta la torre, más rápido va el bloque.
- **Reglas y dificultad:** si el ancho llega a 0, fin. Fin fijo a los 40 s. Colocación exacta = no se corta y recupera un poco de ancho.
- **Notas:** 173 bloques en 40 s exige aceleración fuerte; comprobar en calibración.

### 35 · Paloma Mensajera
- **Marcador:** Puntos ↑ · Top 1 % 78 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** tap-timing · **Tamaño:** S · **Ola:** A
- **Mecánica:** pasan cartas por una cinta; se toca para sellarlas cuando están bajo el matasellos. Centrado = "Perfecto +2".
- **Reglas y dificultad:** algunas cartas (marcadas con una X) no deben sellarse: −2 puntos si se sellan. Sellar fuera de zona resta 1. La cinta se acelera.
- **Notas:** sin un número de vidas; lo que decide es la puntuación acumulada.

### 36 · Nutria Lanzadora
- **Marcador:** Puntos ↑ · Top 1 % 950 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** aim-throw · **Tamaño:** M · **Ola:** D
- **Mecánica:** se lanza la bola desde el muelle a los flotadores, arrastrando para fijar ángulo y potencia, teniendo en cuenta el viento (indicador visible).
- **Reglas y dificultad:** 10 lanzamientos. Acierto en flotador = +100 (borde = +50). Máximo 1000. Viento y posición de flotadores distintos por lanzamiento (semilla).
- **Notas:** el máximo de 1000 y un Top 1 % de 950 encaja con esta regla.
