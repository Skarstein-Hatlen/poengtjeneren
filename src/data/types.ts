// Datatyper for satser og programmer. Selve tallene ligger i JSON-filene
// i samme mappe, ikke i koden.

export type Status = 'verifisert' | 'uverifisert' | 'kampanje';

export type Land = 'NO' | 'SE' | 'DK';

export interface LandInfo {
  navn: string;
  valuta: string;
}

export interface Kilde {
  tittel: string;
  url: string;
  dato: string; // ISO-dato (ÅÅÅÅ-MM-DD)
}

/** Hvordan opptjent bonus i kroner blir til EuroBonus-poeng. */
export interface Konvertering {
  id: string;
  navn: string;
  /** null = satsen er ikke kjent; programmet kan da ikke regnes ut. */
  poengPerKrone: number | null;
  status: Status;
  kilde: string;
  sistVerifisert: string;
  merknad?: string;
}

/** Nivå/abonnement som legger prosent oppå butikkens sats (f.eks. Klarna Max). */
export interface Niva {
  id: string;
  navn: string;
  ekstraProsent: number;
  /** Ganger butikkens sats i appen (Klarna Plus 2, Premium 3, Max 4 – 3 % blir 12 % med Max). */
  butikkFaktor: number;
  /** false = kan ikke veksle til EuroBonus (f.eks. uten medlemskap). */
  kanVeksle?: boolean;
  prisPerMnd: number;
  status: Status;
  kilde: string;
  sistVerifisert: string;
}

export interface Program {
  id: string;
  land: Land;
  navn: string;
  /** Kort navn til bruk i lister og rader. */
  kortnavn: string;
  /** Merkefarge til monogram/logo-plassholder. */
  farge: string;
  /** Valgfri logo (sti under /public). Uten logo vises et monogram i merkefargen. */
  logo?: string;
  beskrivelse: string;
  /** Programmets egne poeng, hvis bonusen telles i poeng og ikke kroner (Klarna: 100 poeng = 1 kr). */
  internPoeng?: { navn: string; perKrone: number };
  /** 'prosent' = bonus i kroner som veksles; 'poengPer100' = EuroBonus-poeng direkte. */
  satsEnhet: 'prosent' | 'poengPer100';
  satsEtikett: string;
  satsHjelp: string;
  standardSats: number;
  konverteringer: Konvertering[];
  nivaer: Niva[];
  nivaEtikett?: string;
  /** Nivået som er valgt fra start. */
  standardNiva?: string;
  /**
   * Programmet har et eget betalingskort der nivåets tillegg (f.eks. Klarna Max 1,5 %)
   * gis på alle kjøp og veksles med programmets sats. Kortet følger nivået som er valgt.
   */
  kort?: { navn: string; kilde: string; merknad?: string };
  /** Om betalingskortet gir poeng i tillegg (kjøpet betales med eget kort). */
  kortlag: boolean;
  kortlagMerknad?: string;
  vilkar: string[];
  kilder: Kilde[];
}

export interface Kort {
  id: string;
  land: Land[];
  navn: string;
  utsteder: string;
  poengPer100: number;
  pris: string;
  status: Status;
  kilde: string;
  sistVerifisert: string;
  merknad?: string;
  /** Søknadsside for kortet. Uten lenke brukes kilde. Bytt til affiliate-lenke og sett annonse: true. */
  lenke?: string;
  /** true = lenken gir oss provisjon og må merkes «Annonse». */
  annonse?: boolean;
  /** Årsavgift i kr. Uten verdi vises ikke kostnad per poeng. */
  arsavgift?: number;
  /** Lavere avgift første året (SAS Mastercard). */
  arsavgiftForsteAr?: number;
  /** Ny avgift fra en dato (Amex Classic blir 30 kr/mnd fra 01.11.2026). */
  arsavgiftFra?: { dato: string; kr: number };
  /** Velkomstbonus fra utstederen selv: poeng når du handler for `krav` kr innen `mnd` måneder. */
  velkomst?: { poeng: number; krav: number; mnd: number };
  /** Kortforbruk per år som gir poeng (SAS Mastercard World: 200 000 kr). */
  tak?: number;
}

/** Én butikks sats i ett program, hentet automatisk av scripts/hent-butikker.mjs. */
export interface ButikkSats {
  /** Prosent (Trumf, Klarna) eller poeng per 100 kr (SAS Online Shopping). */
  verdi: number;
  /** «Opptil» – satsen varierer per varekategori. */
  opptil?: boolean;
  /** Midlertidig kampanjesats som gjelder i stedet for verdi. */
  kampanje?: { verdi: number; slutt: string };
  kilde: string;
  /** Siden du handler fra for å få satsen. Uten lenke brukes kilde. */
  lenke?: string;
}

export interface Butikk {
  id: string;
  navn: string;
  /** Logo slik programmet selv viser den (lenke til programmets bildeserver). */
  logo?: string;
  /** Butikkens nettadresse uten www, f.eks. «kicks.no» (fra Klarna). Brukes av nettleserutvidelsen. */
  domene?: string;
  /** Våre kategori-id-er (mote, sport, elektronikk …). */
  kategorier?: string[];
  satser: Record<string, ButikkSats>;
}

/** Butikklister per land, slik stores.json og partners.json er lagret. */
export interface Butikkfil {
  hentet: string;
  land: Partial<Record<Land, Butikk[]>>;
}

/** Satsens historikk: [dato, verdi] hver gang satsen endret seg. Fylles av hentescriptet. */
export type Maling = [string, number];
export type Historikk = Partial<Record<Land, Record<string, Record<string, Maling[]>>>>;

export interface Datasett {
  sistOppdatert: string;
  /** Når butikksatsene sist ble hentet. */
  hentet: string;
  landInfo: Record<Land, LandInfo>;
  /** Alle programmer i alle land; filtrer på `land`. */
  programmer: Program[];
  kort: Kort[];
  butikker: Record<Land, Butikk[]>;
  historikk: Historikk;
}
