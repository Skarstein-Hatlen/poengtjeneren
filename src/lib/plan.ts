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
  deler: { netthandel: number; dagligvare: number; kort: number };
}

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
 * EuroBonus-poeng per 100 kr i én butikk via beste vei, med gitt Klarna-nivå og kort. Å betale rett med kortet gir alltid
 * kortpoeng; Trumf og SAS Shopping gir kortpoeng i tillegg. Kjøp i Klarna-appen betales med Klarna og gir ingen kortpoeng.
 */
function bestePer100(b: Butikk, d: PlanData, niva: Niva | null, kortPer100: number): number {
  let best = kortPer100;
  for (const p of d.programmer) {
    const s = b.satser[p.id];
    if (!s) continue;
    const v = gjeldende(s, d.idag);
    let per100: number;
    if (harNivaer(p)) {
      if (!niva || niva.kanVeksle === false) continue;
      per100 = (v * niva.butikkFaktor + niva.ekstraProsent) * kurs(p);
    } else {
      per100 = (p.satsEnhet === 'prosent' ? v * kurs(p) : v) + (p.kortlag ? kortPer100 : 0);
    }
    if (per100 > best) best = per100;
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
      // Netthandel: snittet av beste vei i hver butikk.
      const snitt = butikker.length ? butikker.reduce((sum, b) => sum + bestePer100(b, d, niva, kortPer100), 0) / butikker.length : 0;
      const netthandel = (f.netthandel * 12 * snitt) / 100;
      // Dagligvare og annen kortbruk betales med kortet.
      const kortForbruk = (f.dagligvare + f.kortbruk) * 12;
      let kortPoeng = 0;
      let nivapoengAr = 0;
      if (v.type === 'kort') {
        const medPoeng = Math.min(kortForbruk, v.kort.tak ?? Infinity);
        kortPoeng = (medPoeng * v.kort.poengPer100) / 100;
        nivapoengAr = ((v.kort.nivaapoengPer100 ?? 0) * medPoeng) / 100 + (v.kort.nivaapoengAndel ?? 0) * kortPoeng;
      } else if (v.type === 'klarna') {
        kortPoeng = (kortForbruk * v.per100) / 100;
      }
      // Trumf-bonus på dagligvare (alle medlemmer), høyere med Trumf Kredittkort.
      const trumfProsent = v.type === 'trumf' ? v.kort.dagligvare : (d.dagligvareProsent ?? 0);
      const dagligvare = trumf ? ((f.dagligvare * 12 * trumfProsent) / 100) * trumfKurs : 0;

      const kostnadAr = (niva?.prisPerMnd ?? 0) * 12 + (v.type === 'kort' ? prisFremover(v.kort, d.idag) * 12 : v.type === 'trumf' ? v.kort.prisPerMnd * 12 : 0);
      const poengAr = netthandel + dagligvare + kortPoeng;
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
        deler: { netthandel, dagligvare, kort: kortPoeng },
      };
    })
    .sort((a, c) => c.poengAr - a.poengAr || a.kostnadAr - c.kostnadAr);
}

/**
 * Stigen som svarer på «hvilket oppsett passer meg?»: flest poeng, nesten like mange for langt mindre (billigst med
 * minst 95 % av toppen og høyst 80 % av prisen), best verdi (billigst per poeng blant dem med minst 60 % av toppen) og
 * beste gratis. Samme oppsett kan fylle flere roller.
 */
export function velgOppsett(alle: Oppsett[]): { flest: Oppsett | null; nesten: Oppsett | null; verdi: Oppsett | null; gratis: Oppsett | null } {
  const flest = alle[0] ?? null;
  if (!flest) return { flest: null, nesten: null, verdi: null, gratis: null };
  const nesten = alle
    .filter((o) => o.poengAr >= flest.poengAr * 0.95 && o.kostnadAr < flest.kostnadAr && o.kostnadAr <= flest.kostnadAr * 0.8)
    .reduce<Oppsett | null>((best, o) => (!best || o.kostnadAr < best.kostnadAr || (o.kostnadAr === best.kostnadAr && o.poengAr > best.poengAr) ? o : best), null);
  const sterke = alle.filter((o) => o.poengAr >= flest.poengAr * 0.6 && o.ore !== null);
  const verdi = sterke.reduce<Oppsett | null>((best, o) => (!best || (o.ore ?? Infinity) < (best.ore ?? Infinity) ? o : best), null);
  const gratis = alle.find((o) => o.kostnadAr === 0 && o.poengAr > 0) ?? null;
  return { flest, nesten, verdi, gratis };
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
