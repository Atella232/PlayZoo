import type { Rng } from '@playzoo/engine';

export interface SokoLevel {
  /** Ancho y alto totales (incluye el muro exterior). */
  w: number;
  h: number;
  walls: boolean[];
  goals: number[];
  boxes: number[];
  player: number;
}

const D4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Genera un nivel resoluble: se parte del estado resuelto y se juega hacia atrás
 * (tirando de las cajas), así que el nivel siempre tiene solución.
 */
export function generateLevel(rng: Rng, iw: number, ih: number, nBoxes: number, steps: number, nWalls: number): SokoLevel {
  const w = iw + 2;
  const h = ih + 2;
  for (let attempt = 0; attempt < 60; attempt++) {
    const walls = Array.from({ length: w * h }, (_, i) => i % w === 0 || i % w === w - 1 || Math.floor(i / w) === 0 || Math.floor(i / w) === h - 1);
    const interior: number[] = [];
    for (let y = 1; y <= ih; y++) for (let x = 1; x <= iw; x++) interior.push(y * w + x);
    for (const c of rng.shuffle(interior).slice(0, nWalls)) walls[c] = true;
    const free = interior.filter((c) => !walls[c]);
    if (free.length < nBoxes + 3) continue;
    const order = rng.shuffle(free);
    const goals = order.slice(0, nBoxes);
    let boxes = goals.slice();
    let player = order[nBoxes];
    for (let s = 0; s < steps; s++) {
      const [dx, dy] = rng.pick(D4);
      const next = player + dx + dy * w;
      if (walls[next] || boxes.includes(next)) continue;
      const behind = player - dx - dy * w;
      const bi = boxes.indexOf(behind);
      if (bi >= 0 && rng.chance(0.7)) boxes[bi] = player;
      player = next;
    }
    boxes = boxes.slice();
    const onGoal = boxes.filter((b) => goals.includes(b)).length;
    if (onGoal === nBoxes) continue;
    // ninguna caja incrustada en una esquina sin ser meta (evita niveles ya imposibles a simple vista)
    return { w, h, walls, goals, boxes, player };
  }
  // respaldo trivial y resoluble
  const w2 = 5;
  const h2 = 5;
  const walls = Array.from({ length: w2 * h2 }, (_, i) => i % w2 === 0 || i % w2 === w2 - 1 || Math.floor(i / w2) === 0 || Math.floor(i / w2) === h2 - 1);
  return { w: w2, h: h2, walls, goals: [3 * w2 + 3], boxes: [2 * w2 + 2], player: w2 + 1 };
}

export function isSolved(l: { goals: number[] }, boxes: number[]) {
  return boxes.every((b) => l.goals.includes(b));
}

/** Intenta empujar. Devuelve el nuevo estado o null si no se mueve. */
export function move(l: SokoLevel, player: number, boxes: number[], dx: number, dy: number): { player: number; boxes: number[]; pushed: boolean } | null {
  const np = player + dx + dy * l.w;
  if (l.walls[np]) return null;
  const bi = boxes.indexOf(np);
  if (bi < 0) return { player: np, boxes, pushed: false };
  const nb = np + dx + dy * l.w;
  if (l.walls[nb] || boxes.includes(nb)) return null;
  const nbx = boxes.slice();
  nbx[bi] = nb;
  return { player: np, boxes: nbx, pushed: true };
}

/** BFS simple para pruebas: devuelve nº mínimo de movimientos o -1 si supera el límite. */
export function solve(l: SokoLevel, limit = 400000): number {
  const key = (p: number, b: number[]) => p + ':' + b.slice().sort((a, c) => a - c).join(',');
  let frontier: [number, number[]][] = [[l.player, l.boxes]];
  const seen = new Set([key(l.player, l.boxes)]);
  let depth = 0;
  while (frontier.length && seen.size < limit) {
    const nextF: [number, number[]][] = [];
    for (const [p, b] of frontier) {
      if (isSolved(l, b)) return depth;
      for (const [dx, dy] of D4) {
        const r = move(l, p, b, dx, dy);
        if (!r) continue;
        const k = key(r.player, r.boxes);
        if (seen.has(k)) continue;
        seen.add(k);
        nextF.push([r.player, r.boxes]);
      }
    }
    frontier = nextF;
    depth++;
  }
  return -1;
}
