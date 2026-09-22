import type { Butikk, ButikkSats, Maling, Program } from '../data/types';
import { dagerIgjen, finnEndringer, finnKampanjer, type Endring, type Kampanje } from './nytt';

export interface ToppRad {
  butikk: Butikk;
  program: Program;
  per100: number;
}

export interface Ukens {
  /** Butikkene som gir flest poeng per 100 kr nå, med programmet som gir dem. */
  topp: ToppRad[];
  /** Satser som gikk opp de siste sju dagene, største løft først. */
  okninger: Endring[];
  /** Kampanjer som utløper innen sju dager, de som utløper først øverst. */
  utloper: Kampanje[];
}

/** Ukens beste – det som er verdt å dele: topp 10 nå, ukens økninger og kampanjer som snart utløper. */
export function finnUkens(
  butikker: Butikk[],
  programmer: Program[],
  historikk: Record<string, Record<string, Maling[]>> | undefined,
  idag: string,
  per100: (program: Program, sats: ButikkSats) => number | null,
  antall = 10,
): Ukens {
  const topp: ToppRad[] = [];
  for (const b of butikker) {
    let best: ToppRad | null = null;
    for (const p of programmer) {
      const s = b.satser[p.id];
      if (!s) continue;
      const v = per100(p, s);
      if (v !== null && (best === null || v > best.per100)) best = { butikk: b, program: p, per100: v };
    }
    if (best) topp.push(best);
  }
  topp.sort((a, b) => b.per100 - a.per100);
  const okninger = finnEndringer(butikker, programmer, historikk, idag, 7)
    .filter((e) => e.til > e.fra)
    .sort((a, b) => b.til / b.fra - a.til / a.fra);
  const utloper = finnKampanjer(butikker, programmer, idag)
    .filter((k) => dagerIgjen(idag, k.slutt) <= 7)
    .sort((a, b) => a.slutt.localeCompare(b.slutt));
  return { topp: topp.slice(0, antall), okninger, utloper };
}
