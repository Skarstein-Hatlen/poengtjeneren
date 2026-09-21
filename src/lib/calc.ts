import type { Konvertering, Kort, Niva, Program, Status } from '../data/types';

/** Det brukeren har valgt for ett program. */
export interface ProgramValg {
  programId: string;
  aktiv: boolean;
  /** Butikkens sats: prosent, eller poeng per 100 kr for direkte-programmer. */
  sats: number;
  /** true = sats er allerede regnet med nivået (faktor og tillegg), slik brukeren ser den i feltet. */
  satsErEffektiv?: boolean;
  konverteringId?: string;
  nivaId?: string;
  /** Overstyrt vekslingssats (poeng per krone). */
  egenPoengPerKrone?: number;
}

export interface Resultat {
  program: Program;
  konvertering: Konvertering | null;
  niva: Niva | null;
  /** Butikkens sats slik brukeren skrev den inn. */
  butikkSats: number;
  /** Nivåets tillegg i prosent (0 hvis ingen). */
  nivaProsent: number;
  /** Hva nivået ganger butikksatsen med (1 hvis ingen). */
  butikkFaktor: number;
  /** Butikksats + nivåtillegg (prosent), eller poeng per 100 kr for direkte-programmer. */
  effektivSats: number;
  /** Opptjent bonus/cashback i kroner før veksling. null for direkte-programmer. */
  opptjentKr: number | null;
  /** Vekslingssats som ble brukt. null for direkte-programmer. */
  poengPerKrone: number | null;
  programPoeng: number;
  kortPoeng: number;
  total: number;
  per100: number;
  status: Status;
}

const STATUS_RANG: Record<Status, number> = { verifisert: 0, kampanje: 1, uverifisert: 2 };

export function verstStatus(...statuser: (Status | undefined)[]): Status {
  let verst: Status = 'verifisert';
  for (const s of statuser) {
    if (s && STATUS_RANG[s] > STATUS_RANG[verst]) verst = s;
  }
  return verst;
}

/** Butikkens sats slik den blir med nivået: sats × faktor + nivåets tillegg. */
export function effektivProsent(butikkSats: number, niva: Niva | null | undefined): number {
  return butikkSats * (niva?.butikkFaktor ?? 1) + (niva?.ekstraProsent ?? 0);
}

/** Baklengs: fra satsen slik den vises med nivået, til butikkens grunnsats. */
export function butikkProsent(effektiv: number, niva: Niva | null | undefined): number {
  return Math.max(0, (effektiv - (niva?.ekstraProsent ?? 0)) / (niva?.butikkFaktor ?? 1));
}

export function beregnProgram(program: Program, valg: ProgramValg, belop: number, kort: Kort | null): Resultat {
  const konvertering =
    program.konverteringer.find((k) => k.id === valg.konverteringId) ?? program.konverteringer[0] ?? null;
  const niva = program.nivaer.find((n) => n.id === valg.nivaId) ?? program.nivaer[0] ?? null;
  const nivaProsent = niva?.ekstraProsent ?? 0;
  const butikkFaktor = niva?.butikkFaktor ?? 1;

  let butikkSats = valg.sats;
  let effektivSats: number;
  let opptjentKr: number | null;
  let poengPerKrone: number | null;
  let programPoeng: number;

  if (program.satsEnhet === 'prosent') {
    if (valg.satsErEffektiv) {
      effektivSats = valg.sats;
      butikkSats = butikkProsent(valg.sats, niva);
    } else {
      effektivSats = effektivProsent(valg.sats, niva);
    }
    opptjentKr = (belop * effektivSats) / 100;
    poengPerKrone = valg.egenPoengPerKrone ?? konvertering?.poengPerKrone ?? 0;
    programPoeng = opptjentKr * poengPerKrone;
  } else {
    effektivSats = valg.sats;
    opptjentKr = null;
    poengPerKrone = null;
    programPoeng = (belop / 100) * effektivSats;
  }

  const kortPoeng = program.kortlag && kort ? (belop / 100) * kort.poengPer100 : 0;
  const total = programPoeng + kortPoeng;

  const status = verstStatus(
    konvertering?.status,
    niva?.status,
    program.kortlag && kort ? kort.status : undefined,
    valg.egenPoengPerKrone !== undefined ? 'uverifisert' : undefined,
  );

  return {
    program,
    konvertering,
    niva,
    butikkSats,
    nivaProsent,
    butikkFaktor,
    effektivSats,
    opptjentKr,
    poengPerKrone,
    programPoeng,
    kortPoeng,
    total,
    per100: belop > 0 ? (total / belop) * 100 : 0,
    status,
  };
}

/** Beregner alle aktive programmer og sorterer med flest poeng først. */
export function beregnAlle(programmer: Program[], valg: ProgramValg[], belop: number, kort: Kort | null): Resultat[] {
  return programmer
    .map((program) => {
      const v = valg.find((x) => x.programId === program.id);
      return v && v.aktiv ? beregnProgram(program, v, belop, kort) : null;
    })
    .filter((r): r is Resultat => r !== null)
    .sort((a, b) => b.total - a.total);
}
