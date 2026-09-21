import type { Butikk, Maling, Program } from '../data/types';

export interface Kampanje {
  butikk: Butikk;
  program: Program;
  /** Satsen nå (kampanjesatsen). */
  naa: number;
  /** Satsen utenom kampanjen. */
  normalt: number;
  slutt: string;
}

export interface Endring {
  butikk: Butikk;
  program: Program;
  fra: number;
  til: number;
  dato: string;
}

/** Aktive kampanjer, de med størst løft først. */
export function finnKampanjer(butikker: Butikk[], programmer: Program[], idag: string): Kampanje[] {
  const ut: Kampanje[] = [];
  for (const b of butikker) {
    for (const p of programmer) {
      const s = b.satser[p.id];
      if (s?.kampanje && s.kampanje.slutt >= idag && s.kampanje.verdi > s.verdi) {
        ut.push({ butikk: b, program: p, naa: s.kampanje.verdi, normalt: s.verdi, slutt: s.kampanje.slutt });
      }
    }
  }
  return ut.sort((a, b) => b.naa / b.normalt - a.naa / a.normalt || a.slutt.localeCompare(b.slutt));
}

/** Dager mellom to ISO-datoer. */
const dager = (fra: string, til: string) => (new Date(til).getTime() - new Date(fra).getTime()) / 86_400_000;

/**
 * Satser som endret seg de siste `antallDager` dagene. Første måling av en serie er ikke en endring.
 * Nyeste først, deretter største endring.
 */
export function finnEndringer(
  butikker: Butikk[],
  programmer: Program[],
  historikk: Record<string, Record<string, Maling[]>> | undefined,
  idag: string,
  antallDager = 30,
): Endring[] {
  if (!historikk) return [];
  const ut: Endring[] = [];
  const perId = new Map(butikker.map((b) => [b.id, b]));
  const perProgram = new Map(programmer.map((p) => [p.id, p]));
  for (const [butikkId, serier] of Object.entries(historikk)) {
    const butikk = perId.get(butikkId);
    if (!butikk) continue;
    for (const [programId, malinger] of Object.entries(serier)) {
      const program = perProgram.get(programId);
      if (!program || malinger.length < 2) continue;
      const [dato, til] = malinger[malinger.length - 1];
      if (dager(dato, idag) > antallDager) continue;
      ut.push({ butikk, program, fra: malinger[malinger.length - 2][1], til, dato });
    }
  }
  return ut.sort((a, b) => b.dato.localeCompare(a.dato) || Math.abs(b.til - b.fra) - Math.abs(a.til - a.fra));
}
