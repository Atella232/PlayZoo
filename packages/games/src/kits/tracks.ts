import type { Rng } from '@playzoo/engine';
import { W } from '@playzoo/engine';
import { closedSpline, type Pt } from './track';

const BASES: [number, number][][] = [
  [[70, 130], [290, 110], [320, 260], [220, 330], [300, 420], [280, 560], [100, 580], [50, 450], [120, 360], [60, 250]],
  [[180, 100], [310, 240], [290, 420], [200, 590], [70, 500], [60, 300], [130, 220]],
  [[60, 110], [300, 110], [300, 300], [170, 300], [170, 430], [300, 430], [300, 590], [60, 590]],
  [[70, 120], [280, 130], [310, 330], [190, 250], [110, 400], [290, 560], [80, 580]],
];

/** Circuito cerrado (muestras cada ~8 px) elegido y posiblemente reflejado según la semilla. */
export function pickTrack(rng: Rng): Pt[] {
  const base = BASES[rng.int(0, BASES.length - 1)];
  const flip = rng.chance(0.5);
  return closedSpline(base.map(([x, y]) => ({ x: flip ? W - x : x, y })), 8);
}
