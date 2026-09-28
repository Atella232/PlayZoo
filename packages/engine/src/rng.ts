import { hashString, mulberry32 } from '@playzoo/shared';

export interface Rng {
  /** [0,1) */
  next(): number;
  range(a: number, b: number): number;
  /** Entero en [a,b] incluidos. */
  int(a: number, b: number): number;
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
  sign(): 1 | -1;
  /** RNG independiente y determinista derivado de este. */
  fork(label: string): Rng;
}

export function makeRng(seed: string): Rng {
  const f = mulberry32(hashString(seed));
  const r: Rng = {
    next: f,
    range: (a, b) => a + f() * (b - a),
    int: (a, b) => a + Math.floor(f() * (b - a + 1)),
    chance: (p) => f() < p,
    pick: (arr) => arr[Math.floor(f() * arr.length)],
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(f() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    sign: () => (f() < 0.5 ? -1 : 1),
    fork: (label) => makeRng(`${seed}/${label}/${Math.floor(f() * 1e9)}`),
  };
  return r;
}
