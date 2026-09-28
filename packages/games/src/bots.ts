import { TICK_MS, wrapAngle, clipPolygon, polygonArea, type Bot, type BotEvent } from '@playzoo/engine';
import { move } from './kits/sokoban';

/* Bots "expertos" que leen el estado interno de cada juego. Sirven para comprobar que las
   reglas son jugables y para calibrar la dificultad frente al Top 1 % del PDF. */

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export const tap = (x = 180, y = 400, id = 1): BotEvent[] => [
  { type: 'down', x, y, id },
  { type: 'up', x, y, id },
];
const key = (k: string): BotEvent[] => [
  { type: 'key', key: '+' + k },
  { type: 'key', key: '-' + k },
];
/** Ritmo: devuelve true una vez cada n pasos. */
const every = (n: number, tick: number, off = 0) => (tick + off) % n === 0;
const nowMs = (tick: number) => (tick + 0.5) * TICK_MS;

/** Bot que mantiene un dedo pulsado o lo suelta según `want(tick, g)`. */
function holdBot(want: (tick: number, g: Any) => boolean, x = 180, y = 400): Bot {
  let held = false;
  return (tick, inst) => {
    const w = want(tick, inst as Any);
    if (w && !held) {
      held = true;
      return [{ type: 'down', x, y, id: 1 }];
    }
    if (!w && held) {
      held = false;
      return [{ type: 'up', x, y, id: 1 }];
    }
  };
}

/** Bot que arrastra: `pos` da la posición deseada del puntero cada paso (o null para soltar). */
function dragBot(pos: (tick: number, g: Any) => { x: number; y: number } | null): Bot {
  let down = false;
  return (tick, inst) => {
    const p = pos(tick, inst as Any);
    if (p && !down) {
      down = true;
      return [{ type: 'down', x: p.x, y: p.y, id: 1 }];
    }
    if (p && down) return [{ type: 'move', x: p.x, y: p.y, id: 1 }];
    if (!p && down) {
      down = false;
      return [{ type: 'up', x: 180, y: 300, id: 1 }];
    }
  };
}

export const ORACLES: Record<string, () => Bot> = {
  // ---- Precisión y timing ----
  'ojo-de-halcon': () => (_t, inst) => {
    const g = inst as Any;
    if (g.startDelay > 0 || g.pause > 0) return;
    const next = g.needleX + g.dir * g.speed * (1 / 60);
    if ((g.needleX - 180) * (next - 180) <= 0) return tap();
  },
  'gallo-puntual': () => (tick, inst) => {
    const g = inst as Any;
    if (g.phase !== 'run' || g.round >= 5) return;
    if (nowMs(tick) - g.roundStartMs >= g.target * 1000 - 8) return tap();
  },
  'grillo-ritmico': () => {
    let last = -999;
    return (tick, inst) => {
      const g = inst as Any;
      if (g.phase === 1 && g.glow > 0.19) return tap();
      if (g.phase === 2) {
        if (last < 0 || (tick - last) * TICK_MS >= g.interval * 1000 - 8) {
          last = tick;
          return tap();
        }
      }
    };
  },
  'marmota-cronometro': () => (tick, inst) => {
    const g = inst as Any;
    if (g.phase !== 'run') return;
    if (nowMs(tick) - g.startMs >= g.durs[g.round] * 1000 - 8) return tap();
  },
  'jirafa-apiladora': () => (_t, inst) => {
    const g = inst as Any;
    const top = g.stack[g.stack.length - 1];
    const next = g.cur.x + g.dir * g.speed * (1 / 60);
    if ((g.cur.x - top.x) * (next - top.x) <= 0) return tap();
  },
  'paloma-mensajera': () => (_t, inst) => {
    const g = inst as Any;
    const c = g.letters.find((l: Any) => !l.bad && !l.sealed && Math.abs(l.x - 180) < g.speed / 120 + 1);
    if (c) return tap();
  },
  'oso-encestador': () => (tick, inst) => {
    const g = inst as Any;
    if (g.shot) return;
    const p = g.needleAt(nowMs(tick));
    if (Math.abs(p - g.center) < g.zone * 0.3) return tap();
  },
  'colibri-reflejos': () => (tick, inst) => {
    const g = inst as Any;
    if (g.phase === 'lit' && tick * TICK_MS - g.onsetMs >= 210) {
      const r = g.rects[g.litCell];
      return tap(r.x + r.w / 2, r.y + r.h / 2);
    }
  },
  'sepia-reflejos': () => (tick, inst) => {
    const g = inst as Any;
    if (g.phase === 'go' && tick * TICK_MS - g.onset >= 230) return tap();
  },
  'pajaro-carpintero': () => (tick) => (every(6, tick) ? tap(180, 380) : undefined),
  'golondrina-cazadora': () => (tick, inst) => {
    const g = inst as Any;
    const t = g.targets.filter((x: Any) => x.total - x.left > 0.28).sort((a: Any, b: Any) => a.left - b.left)[0];
    if (t && every(9, tick)) return tap(t.x, t.y);
  },
  'cangrejo-interruptor': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(14, tick)) return;
    for (const [s, v] of g.active as Map<number, number>) {
      if (v === 0) {
        const XS = [20, 130, 240];
        const YS = [170, 285, 400, 515];
        return tap(XS[s % 3] + 50, YS[Math.floor(s / 3)] + 50);
      }
    }
  },
  'vencejo-veloz': () => {
    let phase = 0;
    let cell = -1;
    let dir = 'left';
    return (tick, inst) => {
      const g = inst as Any;
      const R = [
        { x: 20, y: 190 },
        { x: 185, y: 190 },
        { x: 20, y: 380 },
        { x: 185, y: 380 },
      ];
      if (phase === 0) {
        if (!every(18, tick)) return;
        let best = 0;
        g.cells.forEach((c: Any, i: number) => {
          if (c.left < g.cells[best].left) best = i;
        });
        cell = best;
        dir = g.cells[best].dir;
        phase = 1;
        return [{ type: 'down', x: R[cell].x + 70, y: R[cell].y + 70, id: 3 }];
      }
      const d = { left: [-40, 0], right: [40, 0], up: [0, -40], down: [0, 40] }[dir] as number[];
      phase = 0;
      return [
        { type: 'move', x: R[cell].x + 70 + d[0], y: R[cell].y + 70 + d[1], id: 3 },
        { type: 'up', x: R[cell].x + 70 + d[0], y: R[cell].y + 70 + d[1], id: 3 },
      ];
    };
  },
  'bingo-de-la-oveja': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(8, tick)) return;
    const c = g.card.find((x: Any) => !x.marked && g.drawn.has(x.n));
    if (c) return tap(c.rect.x + 50, c.rect.y + 50);
  },
  'ciguena-repartidora': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(24, tick)) return;
    const k = g.queue[0];
    const t = [
      [60, 380],
      [180, 180],
      [300, 380],
    ][k];
    return tap(t[0], t[1]);
  },
  'gato-pianista': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(6, tick)) return;
    const t = g.rows.filter((r: Any) => !r.hit).sort((a: Any, b: Any) => b.y - a.y)[0];
    if (t && t.y > 100) return tap(t.col * 90 + 45, 400);
  },

  // ---- Memoria y lógica / cuestionarios ----
  'buho-calculador': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(30, tick) || g.i >= 5) return;
    const q = g.qs[g.i];
    const k = q.options.indexOf(q.answer);
    const C = [
      [99, 428],
      [261, 428],
      [99, 538],
      [261, 538],
    ][k];
    return tap(C[0], C[1]);
  },
  'zorro-de-los-dados': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(10, tick)) return;
    const s = String(g.sum);
    return key(s[g.entry.length]);
  },
  'ardilla-contadora': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(8, tick)) return;
    const c = g.cells.find((x: Any) => x.n === g.next);
    if (c) return tap(c.rect.x + 39, c.rect.y + 39);
  },
  'cotorra-telefonista': () => (tick, inst) => {
    const g = inst as Any;
    if (g.phase === 'memo') return tick > 60 ? tap(180, 360) : undefined;
    if (!every(9, tick)) return;
    return key(String(g.seq[g.idx]));
  },
  'loro-dictado': () => (tick, inst) => {
    const g = inst as Any;
    if (!g.digits.length || !every(7, tick)) return;
    return key(String(g.digits[g.typed.length]));
  },
  'piton-pi': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(6, tick)) return;
    return key(PI[g.idx]);
  },
  'chimpance-memorion': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(12, tick)) return;
    const t = g.tiles.find((x: Any) => !x.done && x.n === g.next);
    if (t) return tap(t.rect.x + 20, t.rect.y + 20);
  },
  'elefante-memorioso': () => (tick, inst) => {
    const g = inst as Any;
    if (g.phase !== 'turno' || !every(12, tick)) return;
    const d = g.seq[g.input_i] as string;
    return key({ left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[d] as string);
  },
  'panal-de-la-abeja': () => (tick, inst) => {
    const g = inst as Any;
    if (g.phase !== 'input' || !every(12, tick)) return;
    const i = g.pattern.find((k: number) => !g.found.has(k));
    if (i !== undefined) return tap(g.hexes[i].x, g.hexes[i].y);
  },
  'rastro-del-caracol': () => {
    let target = 0;
    let x = 0;
    let y = 0;
    let started = false;
    let lastLevel = -1;
    return (_t, inst) => {
      const g = inst as Any;
      if (g.phase !== 'trace') {
        started = false;
        return;
      }
      if (g.level !== lastLevel) {
        lastLevel = g.level;
        started = false;
      }
      if (!started) {
        started = true;
        target = 1;
        x = g.pts[0].x;
        y = g.pts[0].y;
        return [{ type: 'down', x, y, id: 1 }];
      }
      if (target >= g.pts.length) {
        started = false;
        return [{ type: 'up', x, y, id: 1 }];
      }
      const p = g.pts[target];
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < 10) {
        target++;
        return [{ type: 'move', x: p.x, y: p.y, id: 1 }];
      }
      x += ((p.x - x) / d) * 12;
      y += ((p.y - y) / d) * 12;
      return [{ type: 'move', x, y, id: 1 }];
    };
  },
  'pulpo-camuflaje': () => {
    let step = 0;
    let round = -1;
    return (_t, inst) => {
      const g = inst as Any;
      if (g.phase !== 'edit') {
        step = 0;
        return;
      }
      if (round !== g.round) {
        round = g.round;
        step = 0;
      }
      const t = g.targets[g.round];
      const vals = [t[0] / 360, t[1], t[2]];
      if (step < 3) {
        const sl = g.sl[step];
        const ev = tap(sl.rect.x + vals[step] * sl.rect.w, sl.rect.y + 15, 5 + step);
        step++;
        return ev;
      }
      if (step === 3) {
        step++;
        return tap(180, 612);
      }
    };
  },
  'mariposa-pintora': () => {
    let step = 0;
    let key0 = '';
    return (tick, inst) => {
      const g = inst as Any;
      if (!every(4, tick)) return;
      const t = g.target as number[];
      const id = t.join(',');
      if (id !== key0) {
        key0 = id;
        step = 0;
      }
      if (step === 0) {
        step = 1;
        return tap(g.hue.rect.x + (t[0] / 360) * g.hue.rect.w, g.hue.rect.y + 15, 6);
      }
      if (step === 1) {
        step = 2;
        return tap(g.val.rect.x + ((t[2] - 0.3) / 0.7) * g.val.rect.w, g.val.rect.y + 15, 7);
      }
    };
  },
  'cuervo-contacajas': () => (tick, inst) => {
    const g = inst as Any;
    if (g.phase !== 'ask' || !every(6, tick)) return;
    if (g.guess < g.count) return tap(280, 535);
    if (g.guess > g.count) return tap(80, 535);
    return tap(180, 612);
  },
  'trile-del-mapache': () => (_t, inst) => {
    const g = inst as Any;
    if (g.phase !== 'pick') return;
    const slot = Math.round(g.cups[g.ball].pos);
    return tap([70, 180, 290][slot], 380);
  },
  'burro-de-carga': () => {
    let plan: string[] = [];
    let planFor = '';
    return (tick, inst) => {
      const g = inst as Any;
      if (!every(5, tick) || g.solvedT > 0) return;
      const sig = g.lvl + ':' + g.player + ':' + g.boxes.join(',');
      if (!plan.length || planFor !== sig) {
        plan = solvePath(g.level, g.player, g.boxes);
      }
      const d = plan.shift();
      if (!d) return;
      // predecimos la firma tras el movimiento
      planFor = '';
      const k = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[d] as string;
      const dx = d === 'left' ? -1 : d === 'right' ? 1 : 0;
      const dy = d === 'up' ? -1 : d === 'down' ? 1 : 0;
      const r = move(g.level, g.player, g.boxes, dx, dy);
      if (r) planFor = g.lvl + ':' + r.player + ':' + r.boxes.join(',');
      return key(k);
    };
  },
  'medusa-a-partes-iguales': () => {
    let phase = 0;
    let x = 0;
    return (_t, inst) => {
      const g = inst as Any;
      if (g.phase !== 'cut') {
        phase = 0;
        return;
      }
      if (phase === 0) {
        const T = [0.5, 1 / 3, 0.25][g.round];
        const total = polygonArea(g.poly);
        let lo = 0;
        let hi = 360;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2;
          const a = polygonArea(clipPolygon(g.poly, { x: mid, y: 0 }, { x: mid, y: 600 })) / total;
          // clipPolygon(a→b) deja a la izquierda de la recta descendente = lado x mayor
          if (a < T) lo = mid;
          else hi = mid;
        }
        x = (lo + hi) / 2;
        phase = 1;
        return [{ type: 'down', x, y: 100, id: 1 }];
      }
      if (phase === 1) {
        phase = 2;
        return [{ type: 'move', x, y: 560, id: 1 }];
      }
      if (phase === 2) {
        phase = 3;
        return [{ type: 'up', x, y: 560, id: 1 }];
      }
    };
  },
  'nutria-lanzadora': () => {
    let step = 0;
    let cur = { x: 300, y: 300 };
    return (_t, inst) => {
      const g = inst as Any;
      if (g.phase !== 'aim') {
        step = 0;
        return;
      }
      if (step === 0) {
        let best = { d: 1e9, vx: 0, vy: 0 };
        for (let a = 8; a <= 80; a += 1) {
          for (let sp = 200; sp <= 640; sp += 8) {
            const v0x = Math.cos((a * Math.PI) / 180) * sp;
            const v0y = -Math.sin((a * Math.PI) / 180) * sp;
            let vx = v0x;
            let vy = v0y;
            let bx = 56;
            let by = 430;
            for (let k = 0; k < 400; k++) {
              vx += g.wind / 60;
              vy += 900 / 60;
              bx += vx / 60;
              by += vy / 60;
              if (by >= 480) break;
            }
            const d = Math.abs(bx - g.fx);
            if (d < best.d && by >= 480) best = { d, vx: v0x, vy: v0y };
          }
        }
        cur = { x: 300 - best.vx / 3.4, y: 300 - best.vy / 3.4 };
        step = 1;
        return [{ type: 'down', x: 300, y: 300, id: 1 }];
      }
      if (step === 1) {
        step = 2;
        return [{ type: 'move', x: cur.x, y: cur.y, id: 1 }];
      }
      if (step === 2) {
        step = 3;
        return [{ type: 'up', x: cur.x, y: cur.y, id: 1 }];
      }
    };
  },
};

export { holdBot, dragBot, key, every, nowMs, wrapAngle, clipPolygon, polygonArea };


const PI = '14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196';

/** BFS para resolver un nivel tipo Sokoban desde un estado dado. Devuelve la lista de movimientos. */
export function solvePath(level: Any, player: number, boxes: number[], limit = 300000): string[] {
  const D: [string, number, number][] = [
    ['right', 1, 0],
    ['left', -1, 0],
    ['down', 0, 1],
    ['up', 0, -1],
  ];
  const key = (p: number, b: number[]) => p + ':' + b.slice().sort((a, c) => a - c).join(',');
  const goals: number[] = level.goals;
  const solved = (b: number[]) => b.every((x) => goals.includes(x));
  const prev = new Map<string, { from: string; d: string }>();
  const start = key(player, boxes);
  prev.set(start, { from: '', d: '' });
  let frontier: [number, number[], string][] = [[player, boxes, start]];
  while (frontier.length && prev.size < limit) {
    const next: [number, number[], string][] = [];
    for (const [p, b, k] of frontier) {
      if (solved(b)) {
        const out: string[] = [];
        let cur = k;
        while (cur !== start) {
          const e = prev.get(cur)!;
          out.push(e.d);
          cur = e.from;
        }
        return out.reverse();
      }
      for (const [name, dx, dy] of D) {
        const r = move(level, p, b, dx, dy);
        if (!r) continue;
        const nk = key(r.player, r.boxes);
        if (prev.has(nk)) continue;
        prev.set(nk, { from: k, d: name });
        next.push([r.player, r.boxes, nk]);
      }
    }
    frontier = next;
  }
  return [];
}
