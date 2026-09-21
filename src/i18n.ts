import type { Land } from './data/types';
import type { Locale } from './lib/format';

/** Språk og tallformat følger landet: flagget velger begge deler. */
export const SPRAK: Record<Land, { locale: Locale; kode: 'nb' | 'sv' | 'da'; sti: string }> = {
  NO: { locale: 'nb-NO', kode: 'nb', sti: 'no' },
  SE: { locale: 'sv-SE', kode: 'sv', sti: 'se' },
  DK: { locale: 'da-DK', kode: 'da', sti: 'dk' },
};

type Oversettelse = { nb: string; sv: string; da: string };

export const TEKSTER = {
  slagord: { nb: 'Hvor lønner kjøpet seg?', sv: 'Var lönar sig köpet?', da: 'Hvor kan købet bedst betale sig?' },
  land: { nb: 'Land', sv: 'Land', da: 'Land' },
  kjopesum: { nb: 'Kjøpesum', sv: 'Köpesumma', da: 'Købesum' },
  butikk: { nb: 'Butikk', sv: 'Butik', da: 'Butik' },
  sokButikk: { nb: 'Søk butikk', sv: 'Sök butik', da: 'Søg butik' },
  alle: { nb: 'Alle {n} →', sv: 'Alla {n} →', da: 'Alle {n} →' },
  kort: { nb: 'Kort', sv: 'Kort', da: 'Kort' },
  ingen: { nb: 'Ingen', sv: 'Inget', da: 'Ingen' },
  annet: { nb: 'Annet', sv: 'Annat', da: 'Andet' },
  egetKortPoeng: { nb: 'Poeng per 100 kr på eget kort', sv: 'Poäng per 100 kr på eget kort', da: 'Point per 100 kr på eget kort' },
  sokOm: { nb: 'Søk om {kort}', sv: 'Ansök om {kort}', da: 'Ansøg om {kort}' },
  sokOmKortet: { nb: 'Søk om kortet', sv: 'Ansök om kortet', da: 'Ansøg om kortet' },
  annonse: { nb: 'Annonse', sv: 'Annons', da: 'Annonce' },
  perHundre: { nb: '{n} per 100 kr', sv: '{n} per 100 kr', da: '{n} per 100 kr' },
  mestPoeng: { nb: 'Mest poeng', sv: 'Flest poäng', da: 'Flest point' },
  handleVia: { nb: 'Handle via {program}', sv: 'Handla via {program}', da: 'Køb via {program}' },
  konklusjonMer: { nb: '{a} gir {n} poeng mer enn {b}.', sv: '{a} ger {n} poäng mer än {b}.', da: '{a} giver {n} point mere end {b}.' },
  konklusjonLikt: { nb: '{a} og {b} gir like mye.', sv: '{a} och {b} ger lika mycket.', da: '{a} og {b} giver lige meget.' },
  skrivBelop: { nb: 'Skriv inn en kjøpesum.', sv: 'Ange en köpesumma.', da: 'Indtast en købesum.' },
  skrivSats: {
    nb: 'Skriv inn satsen for minst ett program, eller søk opp en butikk.',
    sv: 'Ange satsen för minst ett program, eller sök upp en butik.',
    da: 'Indtast satsen for mindst ét program, eller søg en butik frem.',
  },
  tips: { nb: 'Med {kort} hadde {program} gitt {n} poeng mer.', sv: 'Med {kort} hade {program} gett {n} poäng mer.', da: 'Med {kort} havde {program} givet {n} point mere.' },
  satserHentet: {
    nb: 'Satser for {butikk} hentet {dato} fra programmenes egne sider.',
    sv: 'Satser för {butikk} hämtade {dato} från programmens egna sidor.',
    da: 'Satser for {butikk} hentet {dato} fra programmernes egne sider.',
  },
  forbehold: {
    nb: 'Beløp i {valuta}. Satser endres – sjekk hos programmet før du handler. Programsatser sist oppdatert {dato}.',
    sv: 'Belopp i {valuta}. Satser ändras – kontrollera hos programmet innan du handlar. Programsatser senast uppdaterade {dato}.',
    da: 'Beløb i {valuta}. Satser ændres – tjek hos programmet, før du handler. Programsatser senest opdateret {dato}.',
  },
  annonseForklaring: {
    nb: 'Lenker merket «Annonse» gir oss provisjon hvis du søker om kortet. Det påvirker ikke tallene.',
    sv: 'Länkar märkta «Annons» ger oss provision om du ansöker om kortet. Det påverkar inte siffrorna.',
    da: 'Links markeret «Annonce» giver os provision, hvis du ansøger om kortet. Det påvirker ikke tallene.',
  },
  signatur: {
    nb: 'Laget i Norge av Kjetil, som selv jakter EuroBonus-poeng. Pointmaxing er ikke tilknyttet SAS, Trumf eller Klarna.',
    sv: 'Byggt i Norge av Kjetil, som själv jagar EuroBonus-poäng. Pointmaxing är inte knutet till SAS, Trumf eller Klarna.',
    da: 'Lavet i Norge af Kjetil, som selv jagter EuroBonus-point. Pointmaxing er ikke tilknyttet SAS, Trumf eller Klarna.',
  },
  kilder: { nb: 'Kilder', sv: 'Källor', da: 'Kilder' },
  hos: { nb: '{butikk} hos {program}', sv: '{butikk} hos {program}', da: '{butikk} hos {program}' },
  poeng: { nb: 'poeng', sv: 'poäng', da: 'point' },
  eurobonusPoeng: { nb: 'EuroBonus-poeng', sv: 'EuroBonus-poäng', da: 'EuroBonus-point' },
  fraKort: { nb: '+ {n} fra {kort}', sv: '+ {n} från {kort}', da: '+ {n} fra {kort}' },
  alleredeMed: {
    nb: 'medlemscashbacken fra kortet er allerede regnet inn',
    sv: 'medlemscashbacken från kortet är redan medräknad',
    da: 'medlemscashbacken fra kortet er allerede regnet med',
  },
  ikkeKortVia: {
    nb: 'kortet gir ikke poeng når du betaler via {program}',
    sv: 'kortet ger inga poäng när du betalar via {program}',
    da: 'kortet giver ikke point, når du betaler via {program}',
  },
  poengPer100Er: { nb: '{sats} poeng per 100 kr = {n} poeng', sv: '{sats} poäng per 100 kr = {n} poäng', da: '{sats} point per 100 kr = {n} point' },
  kampanjeTil: { nb: '{program}: kampanjesats til {dato}.', sv: '{program}: kampanjsats till {dato}.', da: '{program}: kampagnesats til {dato}.' },
  opptilVarierer: {
    nb: '{program}: «opptil» – satsen varierer med varekategori.',
    sv: '{program}: «upp till» – satsen varierar med varukategori.',
    da: '{program}: «op til» – satsen varierer med varekategori.',
  },
  egetKortIkkeSjekket: { nb: '* Satsen på eget kort er ikke sjekket.', sv: '* Satsen på eget kort är inte kontrollerad.', da: '* Satsen på eget kort er ikke tjekket.' },
  tilbake: { nb: '← Tilbake', sv: '← Tillbaka', da: '← Tilbage' },
  antallButikker: { nb: '{n} butikker', sv: '{n} butiker', da: '{n} butikker' },
  filtrer: { nb: 'Filtrer', sv: 'Filtrera', da: 'Filtrer' },
  alfabetisk: { nb: 'A–Å', sv: 'A–Ö', da: 'A–Å' },
  flestPoeng: { nb: 'Flest poeng', sv: 'Flest poäng', da: 'Flest point' },
  sortering: { nb: 'Sortering', sv: 'Sortering', da: 'Sortering' },
  visButikkerHos: { nb: 'Vis butikker som finnes hos', sv: 'Visa butiker som finns hos', da: 'Vis butikker, der findes hos' },
  pPer100kr: { nb: 'p/100 kr', sv: 'p/100 kr', da: 'p/100 kr' },
  forsteMaling: { nb: 'Første måling {dato}', sv: 'Första mätningen {dato}', da: 'Første måling {dato}' },
  hoyesteSiden: { nb: 'Høyeste sats siden {dato}', sv: 'Högsta satsen sedan {dato}', da: 'Højeste sats siden {dato}' },
  lavereEnnTopp: { nb: 'Lavere enn toppen ({verdi})', sv: 'Lägre än toppen ({verdi})', da: 'Lavere end toppen ({verdi})' },
  historikk: { nb: 'Sats over tid', sv: 'Sats över tid', da: 'Sats over tid' },
} satisfies Record<string, Oversettelse>;

export type Nokkel = keyof typeof TEKSTER;

/** Henter en tekst på landets språk og fyller inn {plassholdere}. */
export function tekst(land: Land, nokkel: Nokkel, verdier: Record<string, string | number> = {}): string {
  let s: string = TEKSTER[nokkel][SPRAK[land].kode];
  for (const [k, v] of Object.entries(verdier)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
