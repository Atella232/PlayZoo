// Reexporta lo que casi todos los juegos necesitan, para acortar los imports.
export * from '@playzoo/engine';
import { formatNumber } from '@playzoo/shared';
export { formatNumber };
export const formatPct = (n: number) => `${formatNumber(n, 1)} %`;
export const formatSec = (n: number, d = 2) => `${formatNumber(n, d)} s`;
