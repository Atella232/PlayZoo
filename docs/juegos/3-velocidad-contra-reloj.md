# Velocidad contra reloj (13 juegos, 37–49)

Gana quien tarda menos. Reglas comunes: las penalizaciones se suman al tiempo (no se reinicia la ronda salvo que se indique); los circuitos y ejercicios salen de la semilla del día.

### 37 · Escarabajo Pelotero
- **Marcador:** Segundos ↓ · Top 1 % 8,80 s · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** joystick-track · **Tamaño:** M · **Ola:** E
- **Mecánica:** joystick virtual que empuja una bola por un circuito visto desde arriba. 2 rondas; cuenta el mejor tiempo.
- **Reglas y dificultad:** salirse a la arena ralentiza; muros rebotan. Circuito elegido de un banco de 6 según la semilla.
- **Notas:** juego piloto de joystick + marcador de mejor de 2 rondas.

### 38 · Carrera de Galgos
- **Marcador:** Segundos ↓ · Top 1 % 19,06 s · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** racing-topdown · **Tamaño:** M · **Ola:** E
- **Mecánica:** carrera de 2 vueltas por un circuito. Aceleración automática; mitad izquierda/derecha de la pantalla para girar.
- **Reglas y dificultad:** salirse del asfalto frena. Se corren 2 vueltas y cuenta el tiempo total.
- **Notas:** los controles exactos no salen del documento (solo "2 vueltas"). Este es mi diseño. Mostrar el "fantasma" del mejor del grupo es una mejora barata.

### 39 · Correcaminos
- **Marcador:** Segundos ↓ · Top 1 % 10,76 s · **Duración:** ~40 s · **Fiabilidad:** Vídeo
- **Kit:** pseudo3d-racing · **Tamaño:** L · **Ola:** E
- **Mecánica:** carrera en pseudo-3D (estilo carretera por segmentos), 2 vueltas, botones izquierda, derecha y freno.
- **Reglas y dificultad:** las curvas empujan hacia fuera; salirse frena. Aceleración automática.
- **Notas:** pseudo-3D con canvas, sin Three.js. Este kit es el más costoso de la ola E.

### 40 · Hámster al Volante
- **Marcador:** Segundos ↓ · Top 1 % 15,25 s · **Duración:** ~60 s · **Fiabilidad:** Vídeo
- **Kit:** slot-car · **Tamaño:** M · **Ola:** E
- **Mecánica:** circuito de coches de slot de 3 vueltas con botones de gas y freno. Si se va demasiado rápido en las curvas, la barra se pone roja y el coche se sale.
- **Reglas y dificultad:** el límite de velocidad de cada curva depende de su radio. Si se sale, tarda 1 s en volver a la pista.
- **Notas:** carril fijo: no hay dirección.

### 41 · Topo Golfista
- **Marcador:** Segundos ↓ · Top 1 % 4,56 s · **Duración:** ~47 s · **Fiabilidad:** Oficial
- **Kit:** golf · **Tamaño:** M · **Ola:** E
- **Mecánica:** se arrastra hacia atrás desde la bola para apuntar y elegir la potencia; se puede golpear aunque la bola siga en movimiento.
- **Reglas y dificultad:** marcador = tiempo hasta embocar. Techo de 47 s. Campo elegido de un banco de 8 según la semilla.
- **Notas:** física 2D con fricción, rebote en muros y obstáculos.

### 42 · Topo Golfista 2
- **Marcador:** Segundos ↓ · Top 1 % 5,78 s · **Duración:** ~47 s · **Fiabilidad:** Vídeo
- **Kit:** golf · **Tamaño:** L · **Ola:** E
- **Mecánica:** igual que Topo Golfista, sobre un campo de minigolf con cámara en 3D.
- **Reglas y dificultad:** misma física 2D que Topo Golfista, con render en perspectiva (Three.js cargado bajo demanda solo en este juego).
- **Notas:** el único juego que justifica cargar Three.js. Si pesa demasiado, el plan B es una vista isométrica 2D.

### 43 · Suricatas del Minigolf
- **Marcador:** Hoyos ↑ · Top 1 % 12,8 · **Duración:** 30 s · **Fiabilidad:** Oficial
- **Kit:** golf · **Tamaño:** M · **Ola:** E
- **Mecánica:** apuntar, elegir potencia y embocar; completar tantos hoyos como se pueda en 30 s.
- **Reglas y dificultad:** hoyos cortos y sencillos encadenados. El decimal (12,8) se calcula como hoyos completos + progreso del hoyo en curso (1 − distancia restante / inicial).
- **Notas:** el progreso fraccionario es mi interpretación de un marcador con decimales.

### 44 · Ratón de Laberinto
- **Marcador:** Segundos ↓ · Top 1 % 12,69 s · **Duración:** ~60 s · **Fiabilidad:** Oficial
- **Kit:** joystick-track · **Tamaño:** M · **Ola:** E
- **Mecánica:** se inclina el laberinto con el joystick; la bola rueda por inercia hasta 3 metas verdes evitando agujeros.
- **Reglas y dificultad:** caer en un agujero vuelve al último punto seguro y suma 2 s. Laberinto generado con semilla y comprobado solucionable.
- **Notas:** el orden de las metas es libre.

### 45 · Búho Calculador
- **Marcador:** Segundos ↓ · Top 1 % 4,72 s · **Duración:** ~15 s · **Fiabilidad:** Vídeo
- **Kit:** quiz-dom · **Tamaño:** S · **Ola:** B
- **Mecánica:** resolver 5 operaciones eligiendo entre 4 respuestas.
- **Reglas y dificultad:** sumas, restas y multiplicaciones sencillas. Fallo = +1 s de penalización y se repite. Distractores cercanos al resultado.
- **Notas:** botones grandes; respuestas en posiciones aleatorias por semilla.

### 46 · Zorro de los Dados
- **Marcador:** Segundos ↓ · Top 1 % 3,46 s · **Duración:** ~15 s · **Fiabilidad:** Vídeo
- **Kit:** quiz-dom · **Tamaño:** S · **Ola:** B
- **Mecánica:** aparecen 4 dados; se escribe su suma en el teclado. 3 rondas.
- **Reglas y dificultad:** fallo = +1 s y se borra la entrada. Teclado numérico propio en pantalla.
- **Notas:** dados dibujados en SVG.

### 47 · Ardilla Contadora
- **Marcador:** Segundos ↓ · Top 1 % 2,29 s · **Duración:** ~15 s · **Fiabilidad:** Vídeo
- **Kit:** quiz-dom · **Tamaño:** S · **Ola:** B
- **Mecánica:** tocar los números del 1 al 16 en orden en una cuadrícula desordenada.
- **Reglas y dificultad:** tocar uno incorrecto suma 0,5 s. Disposición según la semilla (todos ven la misma cuadrícula).
- **Notas:** juego piloto del kit `quiz-dom`.

### 48 · Cotorra Telefonista
- **Marcador:** Segundos ↓ · Top 1 % 4,5 s · **Duración:** ~20 s · **Fiabilidad:** Oficial
- **Kit:** quiz-dom · **Tamaño:** S · **Ola:** B
- **Mecánica:** memorizar una secuencia de 8 dígitos y marcarla en un teclado de colores.
- **Reglas y dificultad:** la secuencia es visible hasta pulsar "Listo"; el tiempo corre desde que aparece. Dígito incorrecto = +1 s. Cada dígito tiene siempre el mismo color.
- **Notas:** el cronómetro incluye el tiempo de memorización (mi decisión, encaja con un Top 1 % de 4,5 s).

### 49 · Colibrí Reflejos
- **Marcador:** Segundos ↓ · Top 1 % 0,288 s · **Duración:** ~15 s · **Fiabilidad:** Oficial
- **Kit:** reaction · **Tamaño:** S · **Ola:** A
- **Mecánica:** en una cuadrícula 3×3 un círculo se ilumina tras un tiempo aleatorio; se toca lo antes posible. 3 rondas; cuenta la media.
- **Reglas y dificultad:** esperas de 0,8 a 3 s (semilla). Tocar antes = +0,5 s a esa ronda y se repite la espera.
- **Notas:** juego piloto del kit `reaction`. Se muestra el tiempo con tres decimales.
