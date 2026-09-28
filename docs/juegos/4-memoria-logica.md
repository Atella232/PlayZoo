# Memoria y lógica (10 juegos, 50–59)

Primero enseñan algo y luego piden recordarlo o resolverlo; la dificultad sube por niveles. Regla común: presupuesto de tiempo de unos 60–90 s y 3 vidas salvo que se indique otra cosa.

### 50 · Trile del Mapache
- **Marcador:** Niveles ↑ · Top 1 % 13 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** shuffle-anim · **Tamaño:** M · **Ola:** B
- **Mecánica:** "¡Mira la bola!": el mapache mezcla 3 vasos y hay que elegir dónde está la bola.
- **Reglas y dificultad:** cada nivel añade intercambios y velocidad. Fallo = fin. La secuencia de intercambios sale de la semilla.
- **Notas:** las animaciones deben ser deterministas en el tiempo de simulación, no dependientes del framerate.

### 51 · Cuervo Contacajas
- **Marcador:** Niveles ↑ · Top 1 % 19 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** quiz-dom · **Tamaño:** M · **Ola:** B
- **Mecánica:** aparece un montón de cajas un instante y se pregunta "¿Cuántas cajas viste?". Se responde con + y − y se pulsa Enviar.
- **Reglas y dificultad:** cada nivel añade cajas y reduce el tiempo de exposición. Fallo = fin de nivel (3 vidas en total).
- **Notas:** el montón se genera en isométrica con cajas apiladas y algunas ocultas por delante; respuesta correcta exacta.

### 52 · Chimpancé Memorión
- **Marcador:** Puntos ↑ · Top 1 % 100 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** memory-grid · **Tamaño:** S · **Ola:** B
- **Mecánica:** los números se muestran boca arriba y luego se ocultan tras el primer toque. Hay que tocarlos del primero al último antes de que se acabe el tiempo.
- **Reglas y dificultad:** empieza con 4 números y sube de uno en uno. +1 punto por número acertado. Error = pierde una vida (3). Barra de tiempo global de 60 s.
- **Notas:** posiciones con semilla.

### 53 · Elefante Memorioso
- **Marcador:** Puntos ↑ · Top 1 % 100 · **Duración:** ~90 s · **Fiabilidad:** Oficial
- **Kit:** memory-seq · **Tamaño:** S · **Ola:** B
- **Mecánica:** "Observa" muestra una secuencia de flechas; en "Tu turno" se repite con la cruceta. Cada ronda es más larga.
- **Reglas y dificultad:** +1 por flecha correcta. Error = fin. Presupuesto de 90 s porque las rondas largas tardan en mostrarse.
- **Notas:** 100 puntos = suma de longitudes de ~13 rondas.

### 54 · Panal de la Abeja
- **Marcador:** Puntos ↑ · Top 1 % 148 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** memory-grid · **Tamaño:** S · **Ola:** B
- **Mecánica:** se ilumina un patrón de celdas hexagonales y hay que reproducirlo. La cuadrícula crece con cada nivel.
- **Reglas y dificultad:** +1 por celda acertada. 3 fallos = fin. Patrón visible 1,2 s.
- **Notas:** juego piloto del kit `memory-grid`.

### 55 · Rastro del Caracol
- **Marcador:** Puntos ↑ · Top 1 % 98 · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** trace · **Tamaño:** M · **Ola:** B
- **Mecánica:** se muestra un recorrido entre puntos con una estela animada y hay que repetirlo trazándolo con el dedo.
- **Reglas y dificultad:** cada nivel añade puntos. Se valida con distancia de Fréchet discreta entre trazo y camino; +1 por punto alcanzado en orden. Pasar de nivel exige superar un umbral.
- **Notas:** tolerancia ajustada al tamaño de pantalla (se normaliza al ancho).

### 56 · Pulpo Camuflaje
- **Marcador:** Parecido (%) ↑ · Top 1 % 99,18 % · **Duración:** ~40 s · **Fiabilidad:** Oficial
- **Kit:** color-match · **Tamaño:** S · **Ola:** B
- **Mecánica:** se memoriza un color durante unos segundos y se recrea con barras de tono, saturación y brillo.
- **Reglas y dificultad:** 5 colores. Parecido = 100 − ΔE (CIEDE2000) escalado. Marcador = media.
- **Notas:** el ΔE se calcula en Lab, no en HSB. Juego sin alternativa visual para daltónicos: aceptable, es una prueba de color.

### 57 · Loro Dictado
- **Marcador:** Puntos ↑ · Top 1 % 55 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** quiz-dom · **Tamaño:** S · **Ola:** B
- **Mecánica:** se teclean los dígitos antes de que desaparezcan.
- **Reglas y dificultad:** aparecen dígitos con un tiempo de vida cada vez menor y en mayor cantidad. +1 por dígito correcto. 3 fallos = fin.
- **Notas:** teclado numérico propio.

### 58 · Burro de Carga
- **Marcador:** Puntos ↑ · Top 1 % 41 · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** sokoban · **Tamaño:** M · **Ola:** B
- **Mecánica:** estilo Sokoban: se empujan cajas a los objetivos con la cruceta sin dejarlas atrapadas.
- **Reglas y dificultad:** 60 s para resolver los niveles que se pueda. +1 por caja colocada y +3 por nivel completado. Si una caja queda atrapada, botón "Reintentar" (sin coste).
- **Notas:** niveles pequeños generados con jugada inversa y comprobados con un solver BFS al compilar. Evitar el nombre "Sokoban" en la app.

### 59 · Pitón Pi
- **Marcador:** Puntos · Top 1 % sin dato · **Duración:** ~60 s · **Fiabilidad:** Sin confirmar
- **Kit:** quiz-dom · **Tamaño:** S · **Ola:** B
- **Mecánica:** propuesta mía basada solo en el nombre: teclear los decimales de π en orden, sin botón de confirmar (cada dígito se valida al pulsarlo).
- **Reglas y dificultad:** se ven los últimos 3 dígitos como pista. +1 por dígito correcto. 3 fallos = fin.
- **Notas:** dejar para el final y pedir confirmación. No hay Top 1 % para calibrar: se calibra con partidas del grupo.
