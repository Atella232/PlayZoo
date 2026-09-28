#!/usr/bin/env python3
"""Genera packages/games/src/catalog.ts y loaders.ts a partir de docs/juegos/*.md.
Uso: python3 tools/gen_catalog.py
"""
import re, glob, os, json, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = {'1': 'habilidad', '2': 'precision', '3': 'velocidad', '4': 'memoria', '5': 'rapidez'}
FIAB = {'Oficial': 'oficial', 'Vídeo': 'video', 'Vídeo + análisis': 'video+analisis', 'Sin confirmar': 'sin confirmar'}

# num -> (emoji, spec, instrucciones)
X = {
 1: ('🐧','metros','Toca en el momento justo para soltarte del piolet y volar hasta la zona verde del siguiente hielo. Un aterrizaje perfecto da +10 m.'),
 2: ('🐡','puntos','Toca para disparar la púa hacia el otro lado y colarla por un hueco libre sin chocar con las púas clavadas.'),
 3: ('🐒','puntos','Engánchate al ancla solo cuando la bola esté en la zona roja. Suelta cuando apunte recta al siguiente tramo.'),
 4: ('🪰','puntos','Arrastra el dedo para guiar la libélula entre los asteroides sin chocar.'),
 5: ('🐢','puntos','Mantén pulsado para bajar y da toques para girar la torre. Anticípate a los huecos y evita los pisos rojos.'),
 6: ('🐸','puntos','Mantén pulsado para cargar el salto y suelta para saltar. Cae en la siguiente plataforma; centrado da puntos extra.'),
 7: ('🐞','puntos','Dibuja una línea bajo la pulga para que rebote y no caiga a los pinchos. Los rebotes seguidos dan combos.'),
 8: ('🐔','metros','Toca a la izquierda o a la derecha para aletear hacia ese lado. Sube por el desfiladero sin tocar las paredes; ojo al viento.'),
 9: ('🦇','puntos','El murciélago rebota de pared a pared. Toca para aletear y cambiar de sentido esquivando los pinchos.'),
 10: ('🐆','puntos','Toca para girar en cada curva del camino sin salirte.'),
 11: ('🐦','puntos','Cada toque impulsa al gorrión hacia arriba. Pasa por los huecos entre columnas sin tocarlas.'),
 12: ('🐝','metros','Arrastra a izquierda y derecha para subir esquivando los rayos láser. Fíjate en los avisos.'),
 13: ('🦔','puntos','Desliza arriba, abajo, izquierda o derecha para cruzar los carriles esquivando coches. No te quedes parado.'),
 14: ('🦭','puntos','Mantén pulsado y arrastra para que la pelota no caiga. Cada toque suma un punto.'),
 15: ('🦫','puntos','Toca para lanzar un diente al tronco que gira. No des a los que ya están clavados.'),
 16: ('🐇','metros0','Toca a izquierda o derecha para cambiar de carril y esquivar el tráfico. La velocidad aumenta.'),
 17: ('🐺','metros2','Toca para fijar el ángulo del lanzamiento y mantén pulsado en las bajadas para ganar velocidad. Un buen ángulo es Perfecto y congela el reloj.'),
 18: ('🐼','puntos','Toca a izquierda o derecha para cortar el bambú cambiando de lado y esquivar las ramas antes de que se vacíe el tiempo.'),
 19: ('🦎','metros','Toca para saltar de pared a pared evitando los pinchos.'),
 20: ('🐟','puntos','Toca para cambiar de dirección. Avanza en zigzag entre las barras de neón y recoge los puntos amarillos.'),
 21: ('🦂','puntos','Mantén pulsado para cortar cubos seguidos y levanta el dedo antes de los prohibidos. Tienes 3 vidas.'),
 22: ('🐍','puntos','Desliza para dirigir la serpiente. Cada fruta alarga la cola y sube la velocidad. Esquiva los obstáculos.'),
 23: ('🦩','segundosMas','Mueve el dedo a los lados para mantener la espada en equilibrio. Aguanta todo lo que puedas.'),
 24: ('🕷️','puntos','Dos botones: uno gira el hilo y otro lo hace crecer. Ve de nodo en nodo sin romper el hilo.'),
 25: ('🐦','segundosMas','Toca a izquierda o derecha para inclinar la balanza y mantener la bola. Centrada da "Perfecto (2x)".'),
 26: ('🦎','puntos','Mantén pulsado para engancharte con la lengua y suelta para volar entre columnas.'),
 27: ('🦘','puntos','El canguro rebota solo. Arrastra a los lados para caer en las plataformas y subir sin caerte.'),
 28: ('🐜','puntos','Toca para cambiar de dirección y que la hormiga no se caiga del camino en zigzag.'),
 29: ('🦅','precision','Una aguja recorre una barra de colores: toca cuando esté en el centro. Son 5 toques.'),
 30: ('🪼','precision','Arrastra el dedo sobre la medusa para cortarla: primero por la mitad (50 %), luego un tercio y luego un cuarto.'),
 31: ('🐓','desviacion','Un contador avanza y el gallo pide "Toca en 7": detenlo justo en ese valor. Son 5 rondas.'),
 32: ('🦗','precision','Primero toca siguiendo el pulso de luz. Después la luz desaparece y debes mantener el mismo tempo.'),
 33: ('🦫','desviacion','"Toca cuando termine": una barra se vacía y hay que tocar justo al final. Son 3 rondas.'),
 34: ('🦒','bloques','Toca para soltar cada bloque sobre la torre. Lo que sobresale se corta y los bloques van cada vez más rápido.'),
 35: ('🕊️','puntos','Toca para sellar las cartas cuando estén bajo el matasellos. Centrado da "Perfecto +2". No selles las marcadas con X.'),
 36: ('🦦','puntos','Arrastra para apuntar y elegir la fuerza y suelta para lanzar a los flotadores. Cuenta con el viento. Cada acierto suma +100.'),
 37: ('🪲','segundosMenos','Lleva la bola con el joystick por el circuito. Hay 2 rondas y cuenta el mejor tiempo.'),
 38: ('🐕','segundosMenos','Carrera de 2 vueltas. Toca la mitad izquierda o derecha para girar; salirte de la pista te frena.'),
 39: ('🐦','segundosMenos','Carrera de 2 vueltas con botones de izquierda, derecha y freno.'),
 40: ('🐹','segundosMenos','Scalextric de 3 vueltas con botones de gas y freno. Si vas demasiado rápido en una curva, la barra se pone roja y te sales.'),
 41: ('🦡','segundosMenos','Arrastra hacia atrás desde la bola para apuntar y elegir la potencia. Puedes golpear aunque siga en movimiento.'),
 42: ('🦡','segundosMenos','Igual que Topo Golfista, en un campo de minigolf en 3D.'),
 43: ('🐾','hoyos','Apunta, elige la potencia y emboca. Completa tantos hoyos como puedas en 30 segundos.'),
 44: ('🐭','segundosMenos','Inclina el laberinto con el joystick, llega a las 3 metas verdes y evita los agujeros.'),
 45: ('🦉','segundosMenos','Resuelve 5 operaciones eligiendo entre 4 respuestas. Cada fallo suma 1 s.'),
 46: ('🦊','segundosMenos','Aparecen 4 dados: escribe su suma en el teclado. Son 3 rondas.'),
 47: ('🐿️','segundosMenos','Toca los números del 1 al 16 en orden en una cuadrícula desordenada.'),
 48: ('🦜','segundosMenos','Memoriza una secuencia de 8 dígitos y márcala en un teclado de colores.'),
 49: ('🐦','segundos3','En una cuadrícula de 3×3, un círculo se ilumina tras un tiempo aleatorio: tócalo lo antes posible. Son 3 rondas y cuenta la media.'),
 50: ('🦝','niveles','"¡Mira la bola!": el mapache mezcla 3 vasos y debes elegir dónde está la bola.'),
 51: ('🪶','niveles','Aparece un montón de cajas un instante. Responde "¿Cuántas cajas viste?" con + y − y pulsa Enviar.'),
 52: ('🐵','puntos','Los números se muestran boca arriba y luego se ocultan. Tócalos del primero al último antes de que se acabe el tiempo.'),
 53: ('🐘','puntos','Observa la secuencia de flechas y, en "Tu turno", repítela con la cruceta. Cada ronda es más larga.'),
 54: ('🐝','puntos','Se ilumina un patrón de celdas: reprodúcelo. La cuadrícula crece con cada nivel.'),
 55: ('🐌','puntos','Se muestra un recorrido entre puntos: repítelo trazándolo con el dedo.'),
 56: ('🐙','parecido','Memoriza un color y recréalo con las barras de tono, saturación y brillo.'),
 57: ('🦜','puntos','Teclea los dígitos antes de que desaparezcan.'),
 58: ('🐴','puntos','Empuja las cajas hasta los objetivos con la cruceta, sin dejarlas atrapadas.'),
 59: ('🐍','puntos','Teclea los decimales de π en orden. No hay botón de confirmar.'),
 60: ('🐑','puntos','Van saliendo bolas con números: toca las que coinciden con tu cartón. Tienes 3 vidas y tocar un número que no ha salido te quita una.'),
 61: ('🦏','puntos','Apunta y dispara bolas para romper los ladrillos numerados antes de que bajen.'),
 62: ('🦑','puntos','Espera a que cambie el color de fondo y toca lo más rápido posible. Tocar antes de tiempo penaliza.'),
 63: ('✨','puntos','Caen luciérnagas: guía cada una hasta la flor de su color girando el haz de luz de luna.'),
 64: ('🦋','colores','Iguala el color de la izquierda con el de la derecha lo más rápido posible usando las barras de tono y brillo.'),
 65: ('🦢','puntos','Llegan paquetes por una cinta: con ←, ↑ y → manda cada uno al contenedor de su color.'),
 66: ('🐱','puntos','Toca las teclas que bajan sin tocar huecos vacíos.'),
 67: ('🐻','canastas','Toca para tirar a canasta. La primera canasta activa el reloj: sigue encestando antes de que llegue a cero.'),
 68: ('🐤','toques','Toca el tronco tantas veces como puedas en el tiempo del juego.'),
 69: ('🐦','puntos','Salen 4 casillas con flechas: desliza en su dirección antes de que se vacíe su barra.'),
 70: ('🐦','puntos','Toca los objetivos antes de que desaparezcan. Tienes 3 vidas.'),
 71: ('🦀','puntos','Aparecen interruptores por la pantalla: actívalos antes de que se vacíe la barra de tiempo.'),
}
DUR = {23: 60, 25: 60, 67: 60}

def slug(name):
    s = unicodedata.normalize('NFD', name).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def parse_top(t):
    if 'sin dato' in t or not t.strip(): return None
    t = re.sub(r'\s*[s%]\s*$', '', t.strip())
    if ',' in t: t = t.replace('.', '').replace(',', '.')
    elif re.fullmatch(r'\d{1,3}(\.\d{3})+', t): t = t.replace('.', '')
    return float(t)

rows = []
for f in sorted(glob.glob(os.path.join(ROOT, 'docs/juegos/[1-5]-*.md'))):
    cat = CAT[os.path.basename(f)[0]]
    txt = open(f, encoding='utf-8').read()
    for m in re.finditer(r'### (\d+) · (.+?)\n- \*\*Marcador:\*\* (.+?) · Top 1 % (.+?) · \*\*Duración:\*\* (.+?) · \*\*Fiabilidad:\*\* (.+?)\n- \*\*Kit:\*\* (.+?) · \*\*Tamaño:\*\* (.) · \*\*Ola:\*\* (.)', txt):
        num, name, marc, top, dur, fia, kit, tam, ola = m.groups()
        num = int(num)
        d = re.search(r'(\d+)', dur)
        rows.append(dict(num=num, name=name, cat=cat, top=parse_top(top), dur=DUR.get(num, int(d.group(1)) if d else 60), fia=FIAB[fia], kit=kit, tam=tam, ola=ola))
rows.sort(key=lambda r: r['num'])
assert [r['num'] for r in rows] == list(range(1, 72)), len(rows)

out = ["// Generado por tools/gen_catalog.py a partir de docs/juegos/*.md. No editar a mano.",
       "import { SPEC, type Categoria, type ScoreSpec } from '@playzoo/shared';",
       "",
       "export type Fiabilidad = 'oficial' | 'video' | 'video+analisis' | 'sin confirmar';",
       "",
       "export interface GameMeta {",
       "  id: string;", "  num: number;", "  nombre: string;", "  emoji: string;", "  categoria: Categoria;",
       "  marcador: ScoreSpec;", "  top1: number | null;", "  duracionSeg: number;", "  instrucciones: string;",
       "  fiabilidad: Fiabilidad;", "  kit: string;", "  tamano: 'S' | 'M' | 'L';", "  ola: 'A' | 'B' | 'C' | 'D' | 'E';",
       "}", "", "export const CATALOG: GameMeta[] = ["]
for r in rows:
    e, spec, ins = X[r['num']]
    top = 'null' if r['top'] is None else repr(r['top']) if r['top'] % 1 else str(int(r['top']))
    out.append("  { id: %s, num: %d, nombre: %s, emoji: %s, categoria: '%s', marcador: SPEC.%s, top1: %s, duracionSeg: %d, instrucciones: %s, fiabilidad: '%s', kit: '%s', tamano: '%s', ola: '%s' }," % (
        json.dumps(slug(r['name'])), r['num'], json.dumps(r['name'], ensure_ascii=False), json.dumps(e, ensure_ascii=False), r['cat'], spec, top, r['dur'], json.dumps(ins, ensure_ascii=False), r['fia'], r['kit'], r['tam'], r['ola']))
out.append("];")
open(os.path.join(ROOT, 'packages/games/src/catalog.ts'), 'w', encoding='utf-8').write("\n".join(out) + "\n")

# loaders: solo juegos con archivo existente
gdir = os.path.join(ROOT, 'packages/games/src/games')
os.makedirs(gdir, exist_ok=True)
files = {f[:2]: f[:-3] for f in os.listdir(gdir) if re.match(r'\d\d-.*\.ts$', f)}
lo = ["// Generado por tools/gen_catalog.py. No editar a mano.",
      "import type { GameCtx, GameInstance } from '@playzoo/engine';", "",
      "export type Loader = () => Promise<{ create: (ctx: GameCtx) => GameInstance }>;", "",
      "export const LOADERS: Record<string, Loader> = {"]
for r in rows:
    k = '%02d' % r['num']
    if k in files:
        lo.append("  %s: () => import('./games/%s')," % (json.dumps(slug(r['name'])), files[k]))
lo.append("};")
open(os.path.join(ROOT, 'packages/games/src/loaders.ts'), 'w', encoding='utf-8').write("\n".join(lo) + "\n")
print('catalog ok', len(rows), 'implementados', len(files))
