import { prisPerMnd } from './kort';
import type { Butikk, ButikkSats, Kort, Niva, Program } from '../data/types';

/** Det brukeren bruker i måneden, i kroner. */
export interface Forbruk {
  netthandel: number;
  dagligvare: number;
  kortbruk: number;
}

/** Trumf Kredittkort: høyere Trumf-bonus på dagligvare, ingen EuroBonus-poeng på andre kjøp. */
export interface Trumfkort {
  navn: string;
  prisPerMnd: number;
  dagligvare: number;
}

export interface PlanData {
  programmer: Program[];
  /** Butikkene netthandelen fordeles på: de brukeren følger, ellers kjente nettbutikker. */
  butikker: Butikk[];
  kort: Kort[];
  /** Trumf-bonus på dagligvare for alle Trumf-medlemmer (prosent), bare der Trumf finnes. */
  dagligvareProsent: number | null;
  trumfKort: Trumfkort | null;
  idag: string;
}

export interface Oppsett {
  id: string;
  /** Løsningens navn: kortet, eller Klarna-nivået (med Klarna-kortet). null uten kredittkort. */
  navn: string | null;
  kortId: string | null;
  /** Klarna-nivået i Klarna-løsningene. */
  nivaId: string | null;
  poengAr: number;
  kostnadAr: number;
  /** Øre per poeng: årskostnad delt på poeng. null uten poeng. */
  ore: number | null;
  nivapoengAr: number;
  /** 2 for 1-kuponger i året med dette forbruket, og om de bare gjelder i Europa. */
  toForEn: number;
  toForEnEuropa: boolean;
  /** Måneder fra nå til den første 2 for 1-kupongen, eller null når kortet ikke gir en med dette forbruket. */
  toForEnMnd: number | null;
  /** Poengene fordelt på hvor de kommer fra. «kort» er kredittkortets egne poeng; med Klarna-kortet er de Klarna-cashback. */
  deler: Deler;
}

export type Kilde = 'trumf' | 'klarna' | 'kort';
export type Deler = Record<Kilde, number>;
const KILDER: Kilde[] = ['trumf', 'klarna', 'kort'];
const ingenDeler = (): Deler => ({ trumf: 0, klarna: 0, kort: 0 });
const sum = (x: Deler) => x.trumf + x.klarna + x.kort;

type Kortvalg = { type: 'ingen' } | { type: 'kort'; kort: Kort } | { type: 'klarna'; per100: number } | { type: 'trumf'; kort: Trumfkort };

/** Planen ser et år fram: er en ny kortpris varslet innen et år, brukes den. */
const prisFremover = (k: Kort, idag: string) => {
  const omEtAr = new Date(Date.parse(`${idag}T00:00:00Z`) + 365 * 86_400_000).toISOString().slice(0, 10);
  return k.prisPerMndFra && k.prisPerMndFra.dato <= omEtAr ? k.prisPerMndFra.kr : prisPerMnd(k, idag);
};
const gjeldende = (s: ButikkSats, idag: string) => (s.kampanje && s.kampanje.slutt >= idag ? s.kampanje.verdi : s.verdi);
const kurs = (p: Program) => p.konverteringer[0]?.poengPerKrone ?? 0;
const harNivaer = (p: Program) => p.nivaer.some((n) => n.id === 'max');

/**
 * EuroBonus-poeng per 100 kr i én butikk via beste vei, fordelt på kilde. Å betale rett med kortet gir alltid kortpoeng;
 * Trumf gir kortpoeng i tillegg. Kjøp i Klarna-appen betales med Klarna og gir ingen kortpoeng. SAS Shopping er ikke
 * med: den gir like mange poeng uansett kort, så den skiller ikke løsningene.
 */
function bestVei(b: Butikk, d: PlanData, niva: Niva | null, kortPer100: number, kortKilde: Kilde): Deler {
  let best = ingenDeler();
  best[kortKilde] = kortPer100;
  for (const p of d.programmer) {
    const s = b.satser[p.id];
    if (!s) continue;
    const v = gjeldende(s, d.idag);
    const vei = ingenDeler();
    if (harNivaer(p)) {
      if (!niva || niva.kanVeksle === false) continue;
      vei.klarna = (v * niva.butikkFaktor + niva.ekstraProsent) * kurs(p);
    } else if (p.id === 'trumf') {
      vei.trumf = v * kurs(p);
      if (p.kortlag) vei[kortKilde] += kortPer100;
    } else {
      continue;
    }
    if (sum(vei) > sum(best)) best = vei;
  }
  return best;
}

/**
 * Regner ut poeng, kostnad og nivåpoeng i året for hver løsning – ett kort til alt, eller Klarna-kortet med et
 * medlemskap – gitt forbruket. Et kort blandes ikke med et Klarna-medlemskap: kjøp i Klarna-appen betales med Klarna,
 * så kortet gir ingen poeng der, og to årspriser for de samme kjøpene lønner seg sjelden. Flest poeng først.
 * Velkomstbonuser og kampanjer er ikke med – det er et normalår.
 */
export function beregnOppsett(d: PlanData, f: Forbruk): Oppsett[] {
  const klarna = d.programmer.find(harNivaer) ?? null;
  const trumf = d.programmer.find((p) => p.id === 'trumf') ?? null;
  const trumfKurs = trumf ? kurs(trumf) : 0;
  const butikker = d.butikker.filter((b) => d.programmer.some((p) => b.satser[p.id]));
  const losninger: { niva: Niva | null; v: Kortvalg }[] = [
    { niva: null, v: { type: 'ingen' } },
    ...d.kort.filter((k) => k.status !== 'uverifisert').map((kort) => ({ niva: null, v: { type: 'kort' as const, kort } })),
    ...(klarna ? klarna.nivaer.filter((n) => n.kanVeksle !== false && n.ekstraProsent > 0) : []).map((niva) => ({
      niva,
      v: { type: 'klarna' as const, per100: niva.ekstraProsent * kurs(klarna!) },
    })),
    ...(d.trumfKort && trumf ? [{ niva: null, v: { type: 'trumf' as const, kort: d.trumfKort } }] : []),
  ];

  return losninger
    .map(({ niva, v }): Oppsett => {
      const kortPer100 = v.type === 'kort' ? v.kort.poengPer100 : v.type === 'klarna' ? v.per100 : 0;
      // Med Klarna-kortet er kortpoengene Klarna-cashback.
      const kortKilde: Kilde = v.type === 'klarna' ? 'klarna' : 'kort';
      const deler = ingenDeler();
      // Netthandel: snittet av beste vei i hver butikk.
      const nett = f.netthandel * 12;
      for (const b of butikker) {
        const vei = bestVei(b, d, niva, kortPer100, kortKilde);
        for (const k of KILDER) deler[k] += (nett * vei[k]) / 100 / butikker.length;
      }
      // Dagligvare og annen kortbruk betales med kortet. Med et vanlig kort betales netthandelen også med kortet,
      // så den teller mot taket og gir nivåpoeng.
      const kortForbruk = (f.dagligvare + f.kortbruk) * 12;
      let nivapoengAr = 0;
      let toForEn = 0;
      let toForEnMnd: number | null = null;
      if (v.type === 'kort') {
        const tak = v.kort.tak ?? Infinity;
        const medPoeng = Math.max(0, Math.min(kortForbruk, tak - nett));
        deler.kort += (medPoeng * v.kort.poengPer100) / 100;
        nivapoengAr = ((v.kort.nivaapoengPer100 ?? 0) * Math.min(nett + kortForbruk, tak)) / 100 + (v.kort.nivaapoengAndel ?? 0) * deler.kort;
        // 2 for 1: alt som betales med kortet i løpet av året teller mot grensen.
        if (v.kort.toForEn) {
          toForEn = Math.min(v.kort.toForEn.antall, Math.floor((nett + kortForbruk) / v.kort.toForEn.grense));
          toForEnMnd = manederTilToForEn(v.kort.toForEn.grense, (nett + kortForbruk) / 12, d.idag);
        }
      } else if (v.type === 'klarna') {
        deler.klarna += (kortForbruk * v.per100) / 100;
      }
      // Trumf-bonus på dagligvare (alle medlemmer), høyere med Trumf Kredittkort.
      const trumfProsent = v.type === 'trumf' ? v.kort.dagligvare : (d.dagligvareProsent ?? 0);
      if (trumf) deler.trumf += ((f.dagligvare * 12 * trumfProsent) / 100) * trumfKurs;

      const kostnadAr = (niva?.prisPerMnd ?? 0) * 12 + (v.type === 'kort' ? prisFremover(v.kort, d.idag) * 12 : v.type === 'trumf' ? v.kort.prisPerMnd * 12 : 0);
      const poengAr = sum(deler);
      const kortId = v.type === 'kort' ? v.kort.id : v.type === 'klarna' ? `${klarna?.id}-kort-${niva?.id}` : v.type === 'trumf' ? 'trumf-kredittkort' : null;
      return {
        id: `${niva?.id ?? 'ingen'}|${kortId ?? 'ingen'}`,
        navn: v.type === 'kort' || v.type === 'trumf' ? v.kort.navn : v.type === 'klarna' ? `${klarna?.kortnavn} ${niva?.navn}` : null,
        kortId,
        nivaId: niva?.id ?? null,
        poengAr,
        kostnadAr,
        ore: poengAr > 0 ? (kostnadAr * 100) / poengAr : null,
        nivapoengAr,
        toForEn,
        toForEnEuropa: v.type === 'kort' && v.kort.toForEn?.omrade === 'europa',
        toForEnMnd,
        deler,
      };
    })
    .sort((a, c) => c.poengAr - a.poengAr || a.kostnadAr - c.kostnadAr);
}

/**
 * Stigen som svarer på «hvilket oppsett passer meg?»: flest poeng, nesten like mange for langt mindre (billigst med
 * minst 95 % av toppen og høyst 80 % av prisen), best verdi (billigst per poeng blant dem med minst 60 % av toppen),
 * beste gratis og flest nivåpoeng (nivået er en fordel i seg selv). Samme oppsett kan fylle flere roller.
 */
export function velgOppsett(alle: Oppsett[]): {
  flest: Oppsett | null;
  nesten: Oppsett | null;
  verdi: Oppsett | null;
  gratis: Oppsett | null;
  nivapoeng: Oppsett | null;
} {
  const flest = alle[0] ?? null;
  if (!flest) return { flest: null, nesten: null, verdi: null, gratis: null, nivapoeng: null };
  const nesten = alle
    .filter((o) => o.poengAr >= flest.poengAr * 0.95 && o.kostnadAr < flest.kostnadAr && o.kostnadAr <= flest.kostnadAr * 0.8)
    .reduce<Oppsett | null>((best, o) => (!best || o.kostnadAr < best.kostnadAr || (o.kostnadAr === best.kostnadAr && o.poengAr > best.poengAr) ? o : best), null);
  const sterke = alle.filter((o) => o.poengAr >= flest.poengAr * 0.6 && o.ore !== null);
  const verdi = sterke.reduce<Oppsett | null>((best, o) => (!best || (o.ore ?? Infinity) < (best.ore ?? Infinity) ? o : best), null);
  const gratis = alle.find((o) => o.kostnadAr === 0 && o.poengAr > 0) ?? null;
  const nivapoeng = alle.reduce<Oppsett | null>((best, o) => (o.nivapoengAr > (best?.nivapoengAr ?? 0) ? o : best), null);
  return { flest, nesten, verdi, gratis, nivapoeng };
}

/**
 * Måneder fra nå til kortforbruket i ett kalenderår når 2 for 1-grensen, med samme forbruk hver måned fra og med
 * denne. Forbruket teller fra 1. januar, så det som er brukt før nyttår, teller ikke. null når et helt år ikke er nok.
 */
export function manederTilToForEn(grense: number, perMnd: number, idag: string): number | null {
  if (perMnd <= 0 || perMnd * 12 < grense) return null;
  let maned = Number(idag.slice(5, 7));
  let sum = 0;
  for (let n = 1; n <= 24; n++) {
    sum += perMnd;
    if (sum >= grense) return n;
    maned = maned === 12 ? 1 : maned + 1;
    if (maned === 1) sum = 0;
  }
  return null;
}

/** Måneder til målet med et gitt antall poeng i året. null når det ikke kommer poeng. */
export function manederTil(mangler: number, perAr: number): number | null {
  if (mangler <= 0) return 0;
  if (perAr <= 0) return null;
  return Math.ceil(mangler / (perAr / 12));
}

/** Verdien av et poeng i en poengbillett, i øre: det du slipper å betale, delt på poengene. */
export function oreVerdi(kontantpris: number, poeng: number, avgifter: number): number | null {
  if (poeng <= 0 || kontantpris <= 0) return null;
  return (Math.max(0, kontantpris - avgifter) * 100) / poeng;
}
