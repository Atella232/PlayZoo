import { TICK_MS, wrapAngle, type Bot, type BotEvent } from '@playzoo/engine';
import { GolfBall, shotVelocity, type Course } from './kits/golf';
import { tap, every, holdBot } from './bots';

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Dos "botones" izquierda/derecha (o gas/freno): mantiene pulsado el que toque cada paso. */
function sideBot(want: (tick: number, g: Any) => -1 | 0 | 1, xs: [number, number], y = 600): Bot {
  let cur = 0;
  return (tick, inst) => {
    const w = want(tick, inst as Any);
    if (w === cur) return;
    const ev: BotEvent[] = [];
    if (cur !== 0) ev.push({ type: 'up', x: cur < 0 ? xs[0] : xs[1], y, id: 1 });
    if (w !== 0) ev.push({ type: 'down', x: w < 0 ? xs[0] : xs[1], y, id: 1 });
    cur = w;
    return ev;
  };
}

/** Arrastre relativo: mueve el puntero para que un objeto controlado llegue a `target`. */
function relDrag(get: (g: Any) => number, target: (tick: number, g: Any) => number | null, maxStep = 12, y = 500): Bot {
  let fx = 0;
  let base = 0;
  let px = 0;
  let down = false;
  return (tick, inst) => {
    const g = inst as Any;
    const t = target(tick, g);
    if (t === null) return;
    if (!down) {
      down = true;
      fx = 180;
      px = 180;
      base = get(g);
      return [{ type: 'down', x: 180, y, id: 1 }];
    }
    const cur = get(g);
    const need = t - cur;
    const step = Math.max(-maxStep, Math.min(maxStep, need));
    px += step;
    void base;
    void fx;
    return [{ type: 'move', x: px, y, id: 1 }];
  };
}

const swipeDir = (d: string): BotEvent[] => {
  const v = { left: [-40, 0], right: [40, 0], up: [0, -40], down: [0, 40] }[d] as number[];
  return [
    { type: 'down', x: 180, y: 300, id: 2 },
    { type: 'move', x: 180 + v[0], y: 300 + v[1], id: 2 },
    { type: 'up', x: 180 + v[0], y: 300 + v[1], id: 2 },
  ];
};

function zigzag(th: number, lead = 0.06): () => Bot {
  return () => (tick, inst) => {
    const z = (inst as Any).z;
    const e = z.x - z.centerAt(z.y - z.speed * lead);
    if (tick % 2 === 0) return;
    if ((z.dir > 0 && e > th * z.o.halfWidth) || (z.dir < 0 && e < -th * z.o.halfWidth)) return tap();
  };
}

// Simulación de golpes con la misma física del juego
function bestShot(course: Course, from: { x: number; y: number }, maxPower: number): { vx: number; vy: number; power: number; t: number } | null {
  let best: { vx: number; vy: number; power: number; t: number } | null = null;
  for (let a = 0; a < 360; a += 2) {
    for (const p of [0.35, 0.5, 0.65, 0.8, 1]) {
      const ball = new GolfBall({ ...course, start: from });
      const vx = Math.cos((a * Math.PI) / 180) * p * maxPower;
      const vy = Math.sin((a * Math.PI) / 180) * p * maxPower;
      ball.hit(vx, vy);
      let t = 0;
      let sunk = false;
      while (t < 6) {
        if (ball.step(1 / 60)) {
          sunk = true;
          break;
        }
        t += 1 / 60;
        if (ball.speed === 0) break;
      }
      if (sunk && (!best || t < best.t)) best = { vx, vy, power: p, t };
    }
  }
  return best;
}

function golfBot(mapDrag: (g: Any, dx: number, dy: number) => { x: number; y: number }, maxPower: number, start: (g: Any) => { x: number; y: number }): () => Bot {
  return () => {
    let step = 0;
    let plan: { x: number; y: number } | null = null;
    let from = { x: 0, y: 0 };
    let wait = 0;
    return (_t, inst) => {
      const g = inst as Any;
      if (g.pause > 0 || g.endT > 0 || g.ball.sunk) {
        step = 0;
        return;
      }
      if (step === 0) {
        if (g.ball.speed > 0) return;
        const shot = bestShot(g.course, { x: g.ball.x, y: g.ball.y }, maxPower);
        let vx: number;
        let vy: number;
        if (shot) {
          vx = shot.vx;
          vy = shot.vy;
        } else {
          // sin tiro directo: acercarse al hoyo
          const dx = g.course.hole.x - g.ball.x;
          const dy = g.course.hole.y - g.ball.y;
          const l = Math.hypot(dx, dy) || 1;
          vx = (dx / l) * maxPower * 0.5;
          vy = (dy / l) * maxPower * 0.5;
        }
        const power = Math.hypot(vx, vy) / maxPower;
        const len = power * 150;
        const ux = vx / (Math.hypot(vx, vy) || 1);
        const uy = vy / (Math.hypot(vx, vy) || 1);
        from = start(g);
        plan = mapDrag(g, -ux * len, -uy * len);
        step = 1;
        wait = 0;
        return [{ type: 'down', x: from.x, y: from.y, id: 1 }];
      }
      if (step === 1) {
        step = 2;
        return [{ type: 'move', x: from.x + plan!.x, y: from.y + plan!.y, id: 1 }];
      }
      if (step === 2) {
        step = 3;
        return [{ type: 'up', x: from.x + plan!.x, y: from.y + plan!.y, id: 1 }];
      }
      if (++wait > 3) step = 0;
    };
  };
}

export const ORACLES2: Record<string, () => Bot> = {
  'pinguino-escalador': () => (_t, inst) => {
    const g = inst as Any;
    if (g.mode !== 'orbit' || g.falling > 0) return;
    const n = g.anchors[g.cur + 1];
    const tx = -Math.sin(g.ang) * g.dir;
    const ty = Math.cos(g.ang) * g.dir;
    const dLine = Math.abs((n.x - g.px) * ty - (n.y - g.py) * tx);
    const ahead = (n.x - g.px) * tx + (n.y - g.py) * ty > 0;
    if (ahead && dLine < 4) return tap();
  },
  'lemur-giratorio': () => {
    let pressed = false;
    return (_t, inst) => {
      const g = inst as Any;
      const c = g.corners[g.ci];
      if (!c) return;
      if (g.mode === 'line') {
        if (pressed) {
          pressed = false;
          return [{ type: 'up', x: 180, y: 300, id: 1 }];
        }
        if (Math.hypot(g.x - c.t0x, g.y - c.t0y) < g.speed / 60 + 2) {
          pressed = true;
          return [{ type: 'down', x: 180, y: 300, id: 1 }];
        }
      } else if (pressed && Math.abs(wrapAngle(g.h - c.h1)) < 0.2) {
        pressed = false;
        return [{ type: 'up', x: 180, y: 300, id: 1 }];
      }
    };
  },
  'gorrion-aleteador': () => (_t, inst) => {
    const g = inst as Any;
    if (!g.started) return tap();
    const col = g.cols.find((c: Any) => c.x + 56 > 100 - 13);
    if (!col) return;
    const ty = col.gapY + col.gap * 0.18;
    if (g.y > ty && g.vy > -60) return tap();
  },
  'puas-de-puercoespin': () => (_t, inst) => {
    const g = inst as Any;
    if (g.shot) return;
    const slot = Math.max(0, Math.min(10, Math.floor((g.y - 100) / ((590 - 100) / 11))));
    if (!g.fixed[slot]) return tap();
  },
  'libelula-espacial': () => {
    let px = 180;
    let down = false;
    return (_t, inst) => {
      const g = inst as Any;
      // elegir el x más seguro
      let bestX = g.x;
      let bestC = 1e9;
      for (let x = 20; x <= 340; x += 6) {
        let c = Math.abs(x - g.x) * 0.02;
        for (const a of g.asts) {
          if (a.y < g.y - 240 || a.y > g.y + 40) continue;
          const near = 1 - Math.abs(a.y - (g.y - 60)) / 200;
          const d = Math.abs(x - (a.x + a.vx * 0.3)) - a.r - 16;
          if (d < 34) c += (34 - d) ** 2 * Math.max(0.2, near);
        }
        if (c < bestC) {
          bestC = c;
          bestX = x;
        }
      }
      if (!down) {
        down = true;
        px = 180;
        return [{ type: 'down', x: 180, y: 500, id: 1 }];
      }
      const step = Math.max(-16, Math.min(16, bestX - g.x));
      px += step;
      return [{ type: 'move', x: px, y: 500, id: 1 }];
    };
  },
  'rana-saltarina': () => {
    let hold = 0;
    let holding = false;
    return (_t, inst) => {
      const g = inst as Any;
      if (g.jump || g.falling > 0) return;
      if (holding) {
        hold--;
        if (hold <= 0) {
          holding = false;
          return [{ type: 'up', x: 180, y: 400, id: 1 }];
        }
        return;
      }
      if (!g.charging) {
        const d = g.pads[g.cur + 1].x - g.pads[g.cur].x;
        hold = Math.max(1, Math.round(((d / 300) * 60) / 1.15));
        holding = true;
        return [{ type: 'down', x: 180, y: 400, id: 1 }];
      }
    };
  },
  'pulga-botadora': () => {
    let seq: BotEvent[][] = [];
    return (_t, inst) => {
      const g = inst as Any;
      if (seq.length) return seq.shift();
      const active = g.lines.length > 0;
      if (g.vy > 0 && g.y > 250 && g.y < 480 && !active) {
        const x = Math.max(60, Math.min(300, g.x + g.vx * 0.1));
        const y = g.y + 52;
        seq = [[{ type: 'move', x: x + 40, y, id: 1 }], [{ type: 'up', x: x + 40, y, id: 1 }]];
        return [{ type: 'down', x: x - 40, y, id: 1 }];
      }
    };
  },
  'gallina-aleteadora': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(5, tick)) return;
    const c = g.at(g.climb);
    if (g.x - c.cx > 10 && g.vx > -40) return tap(60, 400);
    if (c.cx - g.x > 10 && g.vx < 40) return tap(300, 400);
  },
  'murcielago-entre-pinchos': () => (_t, inst) => {
    const g = inst as Any;
    // altura segura: lo más cerca posible del centro con margen respecto a los pinchos del muro de destino
    let ty = 300;
    let found = false;
    for (let y = 160; y <= 470; y += 5) {
      const d = Math.min(1e9, ...g.spikes.list.map((s: Any) => Math.abs(y - s.y) - s.h / 2));
      if (d >= 58 && (!found || Math.abs(y - 300) < Math.abs(ty - 300))) {
        ty = y;
        found = true;
      }
    }
    if (g.y > ty + 15 && g.vy > -60) return tap();
  },
  'guepardo-derrapante': zigzag(0.2, 0.1),
  'anguila-electrica': zigzag(0.5, 0.03),
  'hormiga-zigzag': zigzag(0.4, 0.03),
  'abejorro-propulsado': () => relDrag((g) => g.x, (_t, g) => {
    const b = g.beams.filter((x: Any) => x.wy - g.climb > -12).sort((a: Any, c: Any) => a.wy - c.wy)[0];
    return b ? g.gapCenter(b) : 180;
  }, 14),
  'erizo-cruzacalles': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(4, tick)) return;
    const px = g.col * 40 + 20;
    const danger = (lane: Any, cx: number, t: number) => !!lane?.road && g.carsOf(lane, t).some((c: number) => Math.abs(c - cx) < 50);
    const here = g.lanes[g.row];
    const next = g.lanes[g.row + 1];
    const nextBlocked = !!next && !next.road && next.deco.includes(g.col);
    const upSafe = !nextBlocked && !danger(next, px, g.t + 0.02) && !danger(next, px, g.t + 0.12) && !danger(next, px, g.t + 0.25);
    const hereBad = danger(here, px, g.t + 0.15) || danger(here, px, g.t + 0.3);
    if (upSafe) return swipeDir('up');
    if (hereBad) {
      // salir del peligro: a un lado si no hay coche, o hacia delante como último recurso
      for (const d of [g.col > 0 ? 'left' : 'right', g.col < 8 ? 'right' : 'left']) {
        const nx = px + (d === 'left' ? -40 : 40);
        if (!danger(here, nx, g.t + 0.15)) return swipeDir(d);
      }
      return swipeDir('up');
    }
    if (nextBlocked) return swipeDir(g.col > 4 ? 'left' : 'right');
    if (g.idle > 2.3) return swipeDir('up');
  },
  'foca-malabarista': () => relDrag((g) => g.padX, (_t, g) => {
    // punto de caída de la pelota
    const a = 450;
    const b = g.vy;
    const c = g.by - 507;
    const disc = b * b - 4 * a * c;
    const t = disc > 0 ? (-b + Math.sqrt(disc)) / (2 * a) : 0.2;
    let x = g.bx + g.vx * t;
    while (x < 13 || x > 347) x = x < 13 ? 26 - x : 694 - x;
    return x;
  }, 40, 520),
  'castor-lanzador': () => (tick, inst) => {
    const g = inst as Any;
    if (g.flight || g.breakT > 0 || !every(5, tick)) return;
    const local = wrapAngle(Math.PI / 2 - (g.rot + g.omega * 0.16));
    if (!g.teeth.some((t: number) => Math.abs(wrapAngle(t - local)) < 0.46)) return tap();
  },
  'liebre-en-la-autopista': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(7, tick)) return;
    const unsafe = (lane: number) => g.cars.some((c: Any) => c.lane === lane && c.y > 520 - 300 && c.y < 520 + 60);
    if (!unsafe(g.lane)) return;
    const opts = [g.lane - 1, g.lane + 1].filter((l) => l >= 0 && l <= 3 && !unsafe(l));
    if (!opts.length) return;
    return tap(opts[0] < g.lane ? 60 : 300, 400);
  },
  'panda-lenador': () => (tick, inst) => {
    const g = inst as Any;
    if (!every(6, tick)) return;
    const b = g.segs[1];
    const side = b === 1 ? 2 : b === 2 ? 1 : g.side;
    return tap(side === 1 ? 60 : 300, 400);
  },
  'gecko-trepador': () => (_t, inst) => {
    const g = inst as Any;
    if (g.jump) return;
    const v = g.v;
    const unsafe = (side: number, ahead: number) => g.spikes.some((s: Any) => s.side === side && Math.abs(s.y + v * ahead - 470) < s.h / 2 + 26);
    if (unsafe(g.side, 0.28) && !unsafe(1 - g.side, 0.3)) return tap();
  },
  'mantis-cortadora': () => holdBot((_t, g) => {
    const nxt = g.cubes.filter((c: Any) => !c.cut && c.y < 490).sort((a: Any, b: Any) => b.y - a.y)[0];
    return !!nxt && !nxt.red && 470 - nxt.y < 150;
  }),
  'serpiente-glotona': () => {
    let last = '';
    return (_t, inst) => {
      const g = inst as Any;
      const COLS = 18;
      const ROWS = 26;
      const blocked = new Set<number>();
      g.body.slice(0, -1).forEach(([x, y]: number[]) => blocked.add(y * COLS + x));
      g.rocks.forEach(([x, y]: number[]) => blocked.add(y * COLS + x));
      const [hx, hy] = g.body[0];
      const goal = g.fruit[1] * COLS + g.fruit[0];
      const prev = new Map<number, number>([[hy * COLS + hx, -1]]);
      const q = [hy * COLS + hx];
      const ds: [string, number, number][] = [
        ['right', 1, 0],
        ['left', -1, 0],
        ['down', 0, 1],
        ['up', 0, -1],
      ];
      const first = new Map<number, string>();
      while (q.length && !prev.has(goal)) {
        const c = q.shift()!;
        for (const [name, dx, dy] of ds) {
          const x = (c % COLS) + dx;
          const y = Math.floor(c / COLS) + dy;
          if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
          const n = y * COLS + x;
          if (blocked.has(n) || prev.has(n)) continue;
          prev.set(n, c);
          first.set(n, c === hy * COLS + hx ? name : first.get(c)!);
          q.push(n);
        }
      }
      let d = first.get(goal);
      if (!d) {
        // sin camino: cualquier movimiento seguro
        for (const [name, dx, dy] of ds) {
          const x = hx + dx;
          const y = hy + dy;
          if (x >= 0 && y >= 0 && x < COLS && y < ROWS && !blocked.has(y * COLS + x)) {
            d = name;
            break;
          }
        }
      }
      if (!d || d === last || d === { left: 'right', right: 'left', up: 'down', down: 'up' }[g.dir as string]) return;
      last = d;
      return swipeDir(d);
    };
  },
  'flamenco-equilibrista': () => {
    let down = false;
    let T = 180;
    let V = 0;
    return (_t, inst) => {
      const g = inst as Any;
      // control por aceleración del dedo (un péndulo invertido no se estabiliza siguiendo solo la posición)
      const a = 9000 * g.theta + 800 * g.omega + 2 * V;
      V += a / 60;
      T += V / 60;
      T = Math.max(24, Math.min(336, T));
      if (!down) {
        down = true;
        return [{ type: 'down', x: T, y: 500, id: 1 }];
      }
      return [{ type: 'move', x: T, y: 500, id: 1 }];
    };
  },
  'arana-tejedora': () => {
    let rot = false;
    let grow = false;
    return (_t, inst) => {
      const g = inst as Any;
      const idx = g.nodes.indexOf(g.cur);
      const n = g.nodes[idx + 1];
      const want = Math.atan2(n.y - g.cur.y, n.x - g.cur.x);
      const d = (((want - g.ang) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const needRot = d > 0.05 && d < Math.PI * 2 - 0.05;
      const ev: BotEvent[] = [];
      if (needRot && !rot) ev.push({ type: 'down', x: 90, y: 592, id: 1 });
      if (!needRot && rot) ev.push({ type: 'up', x: 90, y: 592, id: 1 });
      const needGrow = !needRot;
      if (needGrow && !grow) ev.push({ type: 'down', x: 269, y: 592, id: 2 });
      if (!needGrow && grow) ev.push({ type: 'up', x: 269, y: 592, id: 2 });
      rot = needRot;
      grow = needGrow;
      return ev.length ? ev : undefined;
    };
  },
  'tucan-balancin': () => {
    let side = 0;
    return (_t, inst) => {
      const g = inst as Any;
      const w = g.p + 0.32 * g.v > 0 ? -1 : 1;
      if (w === side) return;
      const ev: BotEvent[] = [];
      if (side !== 0) ev.push({ type: 'up', x: side < 0 ? 60 : 300, y: 400, id: 1 });
      ev.push({ type: 'down', x: w < 0 ? 60 : 300, y: 400, id: 1 });
      side = w;
      return ev;
    };
  },
  'camaleon-columpio': () => holdBot((_t, g) => (g.attached ? g.x < g.attached.a.x + 30 : g.y > 60)),
  'canguro-trampolin': () => relDrag((g) => g.x, (_t, g) => {
    const up = g.plats.filter((p: Any) => p.y < g.y - 10 && p.y > g.y - 170).sort((a: Any, b: Any) => Math.abs(a.x + a.w / 2 - g.x) - Math.abs(b.x + b.w / 2 - g.x))[0];
    const dn = g.plats.filter((p: Any) => p.y > g.y + 10 && p.y < g.y + 160).sort((a: Any, b: Any) => Math.abs(a.x + a.w / 2 - g.x) - Math.abs(b.x + b.w / 2 - g.x))[0];
    const p = g.vy > 0 ? dn ?? up : up ?? dn;
    return p ? p.x + p.w / 2 : g.x;
  }, 14),
  'armadillo-en-picado': () => {
    let held = false;
    return (tick, inst) => {
      const g = inst as Any;
      const ev: BotEvent[] = [];
      if (!held) {
        held = true;
        ev.push({ type: 'down', x: 180, y: 600, id: 9 });
      }
      const r = g.rings.find((x: Any) => !x.passed && x.y > g.y);
      if (r && r.y - g.y - 13 < 150 && every(5, tick)) {
        const idx = g.segAt();
        if (r.segs[idx] === 2) {
          let best = 0;
          let bd = 99;
          for (let j = 0; j < 12; j++) {
            if (r.segs[j] === 2) continue;
            const d = ((j - idx + 18) % 12) - 6;
            if (Math.abs(d) < Math.abs(bd)) {
              bd = d;
              best = j;
            }
          }
          void best;
          ev.push(...tap(bd > 0 ? 300 : 60, 300, 3));
        }
      }
      return ev.length ? ev : undefined;
    };
  },
  'lobo-lunar': () => {
    let held = false;
    return (_t, inst) => {
      const g = inst as Any;
      if (g.phase === 'aim') {
        const deg = (g.angle * 180) / Math.PI;
        if (Math.abs(deg - 45) < 1.4) return tap();
        return;
      }
      const want = g.grounded || g.vy > 0;
      if (want && !held) {
        held = true;
        return [{ type: 'down', x: 180, y: 400, id: 1 }];
      }
      if (!want && held) {
        held = false;
        return [{ type: 'up', x: 180, y: 400, id: 1 }];
      }
    };
  },
  'jardin-de-luciernagas': () => {
    let down = false;
    return (_t, inst) => {
      const g = inst as Any;
      const f = g.flies.filter((x: Any) => !x.guided).sort((a: Any, b: Any) => Math.hypot(a.x - 180, a.y - 300) - Math.hypot(b.x - 180, b.y - 300))[0];
      if (!f) return;
      const FL = [55, 180, 305];
      const a = Math.atan2(590 - 300, FL[f.kind] - 180);
      const x = 180 + Math.cos(a) * 100;
      const y = 300 + Math.sin(a) * 100;
      if (!down) {
        down = true;
        return [{ type: 'down', x, y, id: 1 }];
      }
      return [{ type: 'move', x, y, id: 1 }];
    };
  },
  'rinoceronte-rompemuros': () => {
    let step = 0;
    let to = { x: 180, y: 240 };
    return (_t, inst) => {
      const g = inst as Any;
      if (g.phase !== 'aim') {
        step = 0;
        return;
      }
      if (step === 0) {
        let best: { r: number; c: number } | null = null;
        for (let r = 9; r >= 0 && !best; r--) for (let c = 0; c < 7; c++) if (g.grid[r][c] && !g.grid[r][c].item) best = { r, c };
        const tx = 19 + (best?.c ?? 3) * 46 + 23;
        const ty = 70 + (best?.r ?? 3) * 46 + 23;
        const a = Math.atan2(g.shooterX - tx === 0 ? 0 : 562 - ty, tx - g.shooterX);
        void a;
        const ang = Math.atan2(562 - ty, tx - g.shooterX);
        to = { x: 180 + Math.cos(ang) * 70, y: 300 - Math.sin(ang) * 70 };
        step = 1;
        return [{ type: 'down', x: 180, y: 300, id: 1 }];
      }
      if (step === 1) {
        step = 2;
        return [{ type: 'move', x: to.x, y: to.y, id: 1 }];
      }
      if (step === 2) {
        step = 3;
        return [{ type: 'up', x: to.x, y: to.y, id: 1 }];
      }
    };
  },
  'escarabajo-pelotero': () => {
    let down = false;
    return (_t, inst) => {
      const g = inst as Any;
      if (g.pause > 0) {
        if (down) {
          down = false;
          return [{ type: 'up', x: 180, y: 400, id: 1 }];
        }
        return;
      }
      const t = g.pts[(g.idx + 14) % g.N];
      const dx = t.x - g.x;
      const dy = t.y - g.y;
      const l = Math.hypot(dx, dy) || 1;
      const px = 180 + (dx / l) * 46;
      const py = 400 + (dy / l) * 46;
      if (!down) {
        down = true;
        return [{ type: 'down', x: 180, y: 400, id: 1 }, { type: 'move', x: px, y: py, id: 1 }];
      }
      return [{ type: 'move', x: px, y: py, id: 1 }];
    };
  },
  'carrera-de-galgos': () => sideBot((_t, g) => {
    const t = g.pts[(g.idx + 9) % g.N];
    const want = Math.atan2(t.y - g.y, t.x - g.x);
    const d = wrapAngle(want - g.ang);
    return d > 0.06 ? 1 : d < -0.06 ? -1 : 0;
  }, [90, 270], 400),
  'correcaminos': () => sideBot((_t, g) => {
    const k = g.speed / 1400;
    const c = g.curveAt(g.pos + 600);
    const ideal = c * k * 0.5 - 1.3 * g.x;
    return ideal > 0.12 ? 1 : ideal < -0.12 ? -1 : 0;
  }, [62, 172], 602),
  'hamster-al-volante': () => {
    let cur = 0;
    return (_t, inst) => {
      const g = inst as Any;
      const w = g.ratio < 1.0 ? 1 : g.ratio > 1.06 ? -1 : 0;
      if (w === cur) return;
      const ev: BotEvent[] = [];
      if (cur !== 0) ev.push({ type: 'up', x: cur > 0 ? 277 : 83, y: 601, id: 1 });
      if (w !== 0) ev.push({ type: 'down', x: w > 0 ? 277 : 83, y: 601, id: 1 });
      cur = w;
      return ev;
    };
  },
  'topo-golfista': golfBot((_g, dx, dy) => ({ x: dx, y: dy }), 620, (g) => ({ x: g.ball.x, y: g.ball.y })),
  'topo-golfista-2': golfBot(
    (g, dx, dy) => {
      const s = 0.5 + (0.5 * (g.ball.y - 90)) / 514;
      return { x: dx * s, y: dy * (440 / 514) };
    },
    620,
    (g) => {
      const d = (g.ball.y - 90) / 514;
      const s = 0.5 + 0.5 * d;
      return { x: 180 + (g.ball.x - 180) * s, y: 150 + d * 440 - 8 * s };
    },
  ),
  'suricatas-del-minigolf': golfBot((_g, dx, dy) => ({ x: dx, y: dy }), 700, (g) => ({ x: g.ball.x, y: g.ball.y })),
  'raton-de-laberinto': () => {
    let down = false;
    return (_t, inst) => {
      const g = inst as Any;
      if (g.freeze > 0) return;
      const COLS = 6;
      const ROWS = 8;
      const CS = 54;
      const OX = 18;
      const OY = 110;
      const cell = (x: number, y: number) => [Math.max(0, Math.min(COLS - 1, Math.floor((x - OX) / CS))), Math.max(0, Math.min(ROWS - 1, Math.floor((y - OY) / CS)))];
      const center = (c: number, r: number) => ({ x: OX + c * CS + CS / 2, y: OY + r * CS + CS / 2 });
      const blocked = (a: number[], b: number[]) => {
        const A = center(a[0], a[1]);
        const B = center(b[0], b[1]);
        for (const w of g.walls) {
          // segmento axis-aligned entre centros de celdas contiguas
          const minx = Math.min(A.x, B.x);
          const maxx = Math.max(A.x, B.x);
          const miny = Math.min(A.y, B.y);
          const maxy = Math.max(A.y, B.y);
          if (w.x < maxx + 1 && w.x + w.w > minx - 1 && w.y < maxy + 1 && w.y + w.h > miny - 1) return true;
        }
        return false;
      };
      const here = cell(g.x, g.y);
      const gi = g.goals.findIndex((_: unknown, i: number) => !g.got[i]);
      if (gi < 0) return;
      const targets = g.goals.filter((_: unknown, i: number) => !g.got[i]) as number[][];
      // BFS a la meta más cercana
      const key = (c: number[]) => c[1] * COLS + c[0];
      const prev = new Map<number, number>([[key(here), -1]]);
      const q = [here];
      let found: number[] | null = null;
      while (q.length && !found) {
        const c = q.shift()!;
        if (targets.some((t) => t[0] === c[0] && t[1] === c[1])) {
          found = c;
          break;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = [c[0] + dx, c[1] + dy];
          if (n[0] < 0 || n[1] < 0 || n[0] >= COLS || n[1] >= ROWS || prev.has(key(n)) || blocked(c, n)) continue;
          prev.set(key(n), key(c));
          q.push(n);
        }
      }
      if (!found) return;
      let cur = key(found);
      let next = cur;
      while (prev.get(cur) !== -1 && prev.get(cur) !== undefined) {
        next = cur;
        cur = prev.get(cur)!;
      }
      const nc = [next % COLS, Math.floor(next / COLS)];
      const tgt = center(nc[0], nc[1]);
      // si ya estamos en la celda final, ir al centro
      const dx = tgt.x - g.x;
      const dy = tgt.y - g.y;
      const l = Math.hypot(dx, dy) || 1;
      const px = 180 + (dx / l) * 46;
      const py = 400 + (dy / l) * 46;
      if (!down) {
        down = true;
        return [{ type: 'down', x: 180, y: 400, id: 1 }, { type: 'move', x: px, y: py, id: 1 }];
      }
      return [{ type: 'move', x: px, y: py, id: 1 }];
    };
  },
};

void TICK_MS;
void shotVelocity;
