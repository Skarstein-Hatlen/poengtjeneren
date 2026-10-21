import type { Kort } from '../data/types';

/** Månedsprisen som gjelder på datoen (varslede prisendringer tas med fra datoen de gjelder). */
export function prisPerMnd(k: Kort, idag: string): number {
  if (k.prisPerMndFra && idag >= k.prisPerMndFra.dato) return k.prisPerMndFra.kr;
  return k.prisPerMnd;
}
