import type { Maling } from '../data/types';

/** Hvordan dagens sats står seg mot historikken: som Prisjakts «laveste pris på 3 måneder», bare for poeng. */
export interface Vurdering {
  /** topp: høyeste i perioden. lav: laveste. middels: et sted mellom. uendret: ingen endring å sammenligne med. */
  type: 'topp' | 'lav' | 'middels' | 'uendret';
  /** Første dag perioden dekker (vinduet, eller første måling hvis historikken er kortere). */
  fra: string;
  naa: number;
  maks: number;
  min: number;
}

const DAG = 86_400_000;

/**
 * Vurderer dagens sats mot satsene siste `dager` dager: verdien som gjaldt ved starten av perioden og alle
 * målinger etter. Uten sats i dag (slutt-markør) eller uten historikk: null.
 */
export function vurderSats(malinger: Maling[] | undefined | null, idag: string, dager = 90): Vurdering | null {
  if (!malinger?.length) return null;
  const naa = malinger[malinger.length - 1][1];
  if (naa === null) return null;
  const grense = new Date(Date.parse(`${idag}T00:00:00Z`) - dager * DAG).toISOString().slice(0, 10);
  let vedStart: number | null = null;
  const verdier: number[] = [];
  for (const [dato, verdi] of malinger) {
    if (dato <= grense) vedStart = verdi;
    else if (verdi !== null) verdier.push(verdi);
  }
  if (vedStart !== null) verdier.unshift(vedStart);
  const fra = malinger[0][0] > grense ? malinger[0][0] : grense;
  const maks = Math.max(...verdier);
  const min = Math.min(...verdier);
  const type = maks === min ? 'uendret' : naa >= maks ? 'topp' : naa <= min ? 'lav' : 'middels';
  return { type, fra, naa, maks, min };
}
