export type Categoria =
  | 'habilidad'
  | 'precision'
  | 'velocidad'
  | 'memoria'
  | 'rapidez';

export const CATEGORIAS: Record<Categoria, { nombre: string; emoji: string }> = {
  habilidad: { nombre: 'Habilidad y arcade', emoji: '🕹️' },
  precision: { nombre: 'Precisión y timing', emoji: '🎯' },
  velocidad: { nombre: 'Velocidad contra reloj', emoji: '⏱️' },
  memoria: { nombre: 'Memoria y lógica', emoji: '🧠' },
  rapidez: { nombre: 'Rapidez y multitarea', emoji: '⚡' },
};

/** Cómo se mide y se ordena un marcador. */
export interface ScoreSpec {
  /** Texto tras el número: "m", "s", "%", "" ... */
  unidad: string;
  /** Nombre del marcador ("Puntos", "Metros", "Segundos"...). */
  etiqueta: string;
  /** 'mayor': más es mejor. 'menor': menos es mejor. */
  mejor: 'mayor' | 'menor';
  decimales: number;
}

export const SPEC = {
  puntos: { unidad: '', etiqueta: 'Puntos', mejor: 'mayor', decimales: 0 },
  metros: { unidad: 'm', etiqueta: 'Metros', mejor: 'mayor', decimales: 1 },
  metros0: { unidad: 'm', etiqueta: 'Metros', mejor: 'mayor', decimales: 0 },
  metros2: { unidad: 'm', etiqueta: 'Metros', mejor: 'mayor', decimales: 2 },
  segundosMenos: { unidad: 's', etiqueta: 'Segundos', mejor: 'menor', decimales: 2 },
  segundos3: { unidad: 's', etiqueta: 'Segundos', mejor: 'menor', decimales: 3 },
  segundosMas: { unidad: 's', etiqueta: 'Segundos', mejor: 'mayor', decimales: 2 },
  desviacion: { unidad: 's', etiqueta: 'Desviación', mejor: 'menor', decimales: 2 },
  precision: { unidad: '%', etiqueta: 'Precisión', mejor: 'mayor', decimales: 2 },
  niveles: { unidad: '', etiqueta: 'Niveles', mejor: 'mayor', decimales: 0 },
  bloques: { unidad: '', etiqueta: 'Bloques', mejor: 'mayor', decimales: 0 },
  hoyos: { unidad: '', etiqueta: 'Hoyos', mejor: 'mayor', decimales: 1 },
  toques: { unidad: '', etiqueta: 'Toques', mejor: 'mayor', decimales: 0 },
  canastas: { unidad: '', etiqueta: 'Canastas', mejor: 'mayor', decimales: 0 },
  colores: { unidad: '', etiqueta: 'Colores igualados', mejor: 'mayor', decimales: 0 },
  parecido: { unidad: '%', etiqueta: 'Parecido', mejor: 'mayor', decimales: 2 },
} as const satisfies Record<string, ScoreSpec>;

/** Formato numérico estilo español del PDF: 1.026 · 163,9 · 0,288. */
export function formatNumber(n: number, decimales: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
    useGrouping: true,
  }).format(n);
}

export function formatScore(n: number | null | undefined, spec: ScoreSpec): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const num = formatNumber(n, spec.decimales);
  return spec.unidad ? `${num}${spec.unidad === '%' ? ' %' : ' ' + spec.unidad}` : num;
}

/** ¿a es mejor que b? */
export function isBetter(a: number, b: number, spec: ScoreSpec): boolean {
  return spec.mejor === 'mayor' ? a > b : a < b;
}

export function bestOf(scores: number[], spec: ScoreSpec): number | null {
  if (!scores.length) return null;
  return scores.reduce((m, s) => (isBetter(s, m, spec) ? s : m));
}

/**
 * Tope de plausibilidad para el servidor. Devuelve false si la marca es
 * imposible frente al Top 1 % de referencia.
 */
export function isPlausible(score: number, top1: number | null, spec: ScoreSpec): boolean {
  if (!Number.isFinite(score)) return false;
  if (top1 === null) return true;
  if (spec.mejor === 'mayor') {
    const cap = spec.unidad === '%' ? 100 : top1 * 1.5;
    return score >= 0 && score <= cap + 1e-9;
  }
  return score >= top1 * 0.25 - 1e-9 && score >= 0;
}

/** Progreso hacia el Top 1 % en [0,1+] para las barras de la ficha (más = mejor). */
export function progressToTop1(score: number | null, top1: number | null, spec: ScoreSpec): number | null {
  if (score === null || top1 === null) return null;
  if (spec.mejor === 'mayor') return top1 <= 0 ? 1 : score / top1;
  if (score <= 0) return 1;
  return Math.max(0, top1 / Math.max(score, 1e-9));
}
