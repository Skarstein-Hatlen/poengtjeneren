import kategorierJson from './data/kategorier.json';
import type { Land } from './data/types';
import type { Locale } from './lib/format';

/** Språk og tallformat følger landet: flagget velger begge deler. */
export const SPRAK: Record<Land, { locale: Locale; kode: 'nb' | 'sv' | 'da'; sti: string }> = {
  NO: { locale: 'nb-NO', kode: 'nb', sti: 'no' },
  SE: { locale: 'sv-SE', kode: 'sv', sti: 'se' },
  DK: { locale: 'da-DK', kode: 'da', sti: 'dk' },
};

type Oversettelse = { nb: string; sv: string; da: string };

/** Butikkategoriene, i samme rekkefølge som de vises. Id-ene settes av scripts/hent-butikker.mjs. */
export const KATEGORIER = kategorierJson as Record<string, Oversettelse>;

export const TEKSTER = {
  slagord: { nb: 'Hvor lønner kjøpet seg?', sv: 'Var lönar sig köpet?', da: 'Hvor kan købet bedst betale sig?' },
  land: { nb: 'Land', sv: 'Land', da: 'Land' },
  navKalkulator: { nb: 'Kalkulator', sv: 'Kalkylator', da: 'Beregner' },
  navButikker: { nb: 'Butikker', sv: 'Butiker', da: 'Butikker' },
  navNytt: { nb: 'Nytt', sv: 'Nytt', da: 'Nyt' },
  navKort: { nb: 'Kort', sv: 'Kort', da: 'Kort' },
  navReise: { nb: 'Reise', sv: 'Resa', da: 'Rejse' },
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
  kategori: { nb: 'Kategori', sv: 'Kategori', da: 'Kategori' },
  alleKategorier: { nb: 'Alle kategorier', sv: 'Alla kategorier', da: 'Alle kategorier' },
  pPer100kr: { nb: 'p/100 kr', sv: 'p/100 kr', da: 'p/100 kr' },
  forsteMaling: { nb: 'Første måling {dato}', sv: 'Första mätningen {dato}', da: 'Første måling {dato}' },
  hoyesteSiden: { nb: 'Høyeste sats siden {dato}', sv: 'Högsta satsen sedan {dato}', da: 'Højeste sats siden {dato}' },
  lavereEnnTopp: { nb: 'Lavere enn toppen ({verdi})', sv: 'Lägre än toppen ({verdi})', da: 'Lavere end toppen ({verdi})' },
  historikk: { nb: 'Sats over tid', sv: 'Sats över tid', da: 'Sats over tid' },
  // Nytt
  kampanjerNaa: { nb: 'Kampanjer nå', sv: 'Kampanjer just nu', da: 'Kampagner lige nu' },
  andreKampanjer: { nb: 'Andre kampanjer', sv: 'Andra kampanjer', da: 'Andre kampagner' },
  ingenSluttdato: { nb: 'ingen sluttdato oppgitt', sv: 'inget slutdatum angivet', da: 'ingen slutdato oplyst' },
  gikkOpp: { nb: 'Gikk opp siste 30 dager', sv: 'Gick upp senaste 30 dagarna', da: 'Steg de seneste 30 dage' },
  gikkNed: { nb: 'Gikk ned siste 30 dager', sv: 'Gick ner senaste 30 dagarna', da: 'Faldt de seneste 30 dage' },
  ingenKampanjer: { nb: 'Ingen kampanjer akkurat nå.', sv: 'Inga kampanjer just nu.', da: 'Ingen kampagner lige nu.' },
  ingenEndringer: { nb: 'Ingen endringer ennå – satsene sjekkes hver natt.', sv: 'Inga ändringar ännu – satserna kontrolleras varje natt.', da: 'Ingen ændringer endnu – satserne tjekkes hver nat.' },
  utloper: { nb: 'til {dato}', sv: 'till {dato}', da: 'til {dato}' },
  normalt: { nb: 'normalt {sats}', sv: 'normalt {sats}', da: 'normalt {sats}' },
  // Kort
  kortTittel: { nb: 'Kort som gir EuroBonus-poeng', sv: 'Kort som ger EuroBonus-poäng', da: 'Kort, der giver EuroBonus-point' },
  pris: { nb: 'Pris', sv: 'Pris', da: 'Pris' },
  kortbrukPerAr: { nb: 'Kortbruk per år', sv: 'Kortköp per år', da: 'Kortforbrug per år' },
  krPerMnd: { nb: '{n} kr/mnd', sv: '{n} kr/mån', da: '{n} kr/md.' },
  orePoengSort: { nb: 'Øre/poeng', sv: 'Öre/poäng', da: 'Øre/point' },
  ingenKort: { nb: 'Ingen kort', sv: 'Inget kort', da: 'Intet kort' },
  velgKort: { nb: 'Velg kort', sv: 'Välj kort', da: 'Vælg kort' },
  poengPerAr: { nb: '{n} poeng/år', sv: '{n} poäng/år', da: '{n} point/år' },
  orePerPoeng: { nb: '{n} øre/poeng', sv: '{n} öre/poäng', da: '{n} øre/point' },
  ingenArsavgift: { nb: 'ingen årsavgift', sv: 'ingen årsavgift', da: 'ingen årsafgift' },
  forsteAr: { nb: 'første år {n} øre/poeng', sv: 'första året {n} öre/poäng', da: 'første år {n} øre/point' },
  forsteArMedVelkomst: {
    nb: 'første år {n} øre/poeng med {v} velkomstpoeng',
    sv: 'första året {n} öre/poäng med {v} välkomstpoäng',
    da: 'første år {n} øre/point med {v} velkomstpoint',
  },
  // Nivåpoeng, personvern og utvidelse
  nivaapoengLinje: { nb: '+ {n} nivåpoeng', sv: '+ {n} nivåpoäng', da: '+ {n} niveaupoint' },
  nivaapoengTil: {
    nb: 'SAS Shopping gir 20 nivåpoeng per 100 bonuspoeng til {dato}. Nivåpoeng teller mot medlemsnivå, ikke til reiser.',
    sv: 'SAS Shopping ger 20 nivåpoäng per 100 bonuspoäng till {dato}. Nivåpoäng räknas mot medlemsnivå, inte till resor.',
    da: 'SAS Shopping giver 20 niveaupoint per 100 bonuspoint til {dato}. Niveaupoint tæller mod medlemsniveau, ikke til rejser.',
  },
  personvern: { nb: 'Personvern', sv: 'Integritet', da: 'Privatliv' },
  omTallene: { nb: 'Om tallene', sv: 'Om siffrorna', da: 'Om tallene' },
  utvidelseLenke: { nb: 'Chrome-utvidelse', sv: 'Chrome-tillägg', da: 'Chrome-udvidelse' },
  utvidelseCta: {
    nb: 'Chrome-utvidelsen viser poengene rett i Google-søk og i nettbutikken.',
    sv: 'Chrome-tillägget visar poängen direkt i Google-sökningen och i butiken.',
    da: 'Chrome-udvidelsen viser pointene direkte i Google-søgningen og i butikken.',
  },
  leggTil: { nb: 'Legg til i Chrome', sv: 'Lägg till i Chrome', da: 'Føj til Chrome' },
  // Hverdag
  hverdag: { nb: 'Hverdag', sv: 'Vardag', da: 'Hverdag' },
  hverdagForklaring: {
    nb: '{program}-bonus på hverdagskjøp, vekslet til EuroBonus ({n} poeng per krone med automatisk overføring).',
    sv: '{program}-bonus på vardagsköp, växlad till EuroBonus ({n} poäng per krona).',
    da: '{program}-bonus på hverdagskøb, vekslet til EuroBonus ({n} point per krone).',
  },
  matPerMnd: { nb: 'Mat per måned', sv: 'Mat per månad', da: 'Mad per måned' },
  prosentBonus: { nb: '{p} % {program}-bonus', sv: '{p} % {program}-bonus', da: '{p} % {program}-bonus' },
  medTrumfPay: { nb: '{p} % med Trumf Pay = {n} p/100 kr', sv: '{p} % med Trumf Pay = {n} p/100 kr', da: '{p} % med Trumf Pay = {n} p/100 kr' },
  medTrumfPayAr: { nb: '{n} med Trumf Pay', sv: '{n} med Trumf Pay', da: '{n} med Trumf Pay' },
  plussKort: { nb: '+ {n} med {kort}', sv: '+ {n} med {kort}', da: '+ {n} med {kort}' },
  hverdagKilde: { nb: 'Satser fra trumf.no, sjekket {dato}', sv: 'Satser från trumf.no, kontrollerade {dato}', da: 'Satser fra trumf.no, tjekket {dato}' },
  // Følg
  folg: { nb: 'Følg {butikk}', sv: 'Följ {butikk}', da: 'Følg {butikk}' },
  folger: { nb: 'Følger {butikk}', sv: 'Följer {butikk}', da: 'Følger {butikk}' },
  folgForklaring: {
    nb: 'varsel i utvidelsen når satsen går opp',
    sv: 'avisering i tillägget när satsen går upp',
    da: 'besked i udvidelsen, når satsen går op',
  },
  dineButikker: { nb: 'Dine butikker', sv: 'Dina butiker', da: 'Dine butikker' },
  // Ukens beste
  ukensBeste: { nb: 'Ukens beste', sv: 'Veckans bästa', da: 'Ugens bedste' },
  ukensLenke: { nb: 'Ukens beste →', sv: 'Veckans bästa →', da: 'Ugens bedste →' },
  toppNaa: { nb: 'Flest poeng nå', sv: 'Flest poäng just nu', da: 'Flest point lige nu' },
  oktSiste7: { nb: 'Gikk opp siste 7 dager', sv: 'Gick upp senaste 7 dagarna', da: 'Steg de seneste 7 dage' },
  utloperInnen7: { nb: 'Utløper innen 7 dager', sv: 'Går ut inom 7 dagar', da: 'Udløber inden for 7 dage' },
  // Mitt oppsett, nivå, deling, kampanjer og rabattkode
  regnetMed: { nb: 'Regnet med {oppsett}', sv: 'Beräknat med {oppsett}', da: 'Beregnet med {oppsett}' },
  endre: { nb: 'endre', sv: 'ändra', da: 'ændr' },
  slikFar: { nb: 'Slik får du poengene hos {program}', sv: 'Så får du poängen hos {program}', da: 'Sådan får du pointene hos {program}' },
  nivaOpp: {
    nb: '{niva} hadde gitt {n} poeng mer på dette kjøpet, for {kr} kr mer i måneden.',
    sv: '{niva} hade gett {n} poäng mer på det här köpet, för {kr} kr mer i månaden.',
    da: '{niva} havde givet {n} point mere på dette køb, for {kr} kr mere om måneden.',
  },
  nivaNed: {
    nb: '{niva} hadde gitt {n} poeng mindre på dette kjøpet, og spart deg {kr} kr i måneden.',
    sv: '{niva} hade gett {n} poäng mindre på det här köpet, och sparat dig {kr} kr i månaden.',
    da: '{niva} havde givet {n} point mindre på dette køb og sparet dig {kr} kr om måneden.',
  },
  nivaFraIngen: {
    nb: 'Med {niva} hadde Klarna gitt {n} poeng her, for {kr} kr i måneden.',
    sv: 'Med {niva} hade Klarna gett {n} poäng här, för {kr} kr i månaden.',
    da: 'Med {niva} havde Klarna givet {n} point her, for {kr} kr om måneden.',
  },
  kopier: { nb: 'Kopier', sv: 'Kopiera', da: 'Kopiér' },
  kopiert: { nb: 'Kopiert', sv: 'Kopierat', da: 'Kopieret' },
  dagerIgjen: { nb: '{n} dager igjen', sv: '{n} dagar kvar', da: '{n} dage tilbage' },
  enDagIgjen: { nb: '1 dag igjen', sv: '1 dag kvar', da: '1 dag tilbage' },
  sisteDag: { nb: 'Siste dag', sv: 'Sista dagen', da: 'Sidste dag' },
  rabattkode: { nb: 'Rabattkode', sv: 'Rabattkod', da: 'Rabatkode' },
  leggTilRabatt: { nb: '+ Rabattkode', sv: '+ Rabattkod', da: '+ Rabatkode' },
  rabattSparer: { nb: 'Koden sparer {kr} · {program} gir {n} poeng.', sv: 'Koden sparar {kr} · {program} ger {n} poäng.', da: 'Koden sparer {kr} · {program} giver {n} point.' },
  rabattTrumf: {
    nb: 'Trumf gir ingen bonus når du bruker rabattkoder utenfra – velg koden eller poengene.',
    sv: 'Trumf ger ingen bonus när du använder rabattkoder utifrån – välj koden eller poängen.',
    da: 'Trumf giver ingen bonus, når du bruger rabatkoder udefra – vælg koden eller pointene.',
  },
  leiebil: { nb: 'Leiebil', sv: 'Hyrbil', da: 'Lejebil' },
  perLeie: { nb: 'poeng per leie', sv: 'poäng per hyra', da: 'point pr. leje' },
  bestillHos: { nb: 'Bestill hos {navn}', sv: 'Boka hos {navn}', da: 'Book hos {navn}' },
  forsinketFly: { nb: 'Forsinket fly', sv: 'Försenat flyg', da: 'Forsinket fly' },
  flyIntro: {
    nb: 'Over 3 timer forsinket eller innstilt? Du kan ha krav på',
    sv: 'Mer än 3 timmar försenat eller inställt? Du kan ha rätt till',
    da: 'Mere end 3 timer forsinket eller aflyst? Du kan have krav på',
  },
  flyKort: { nb: 'Til og med 1 500 km', sv: 'Upp till 1 500 km', da: 'Op til 1.500 km' },
  flyMiddels: { nb: '1 500–3 500 km', sv: '1 500–3 500 km', da: '1.500–3.500 km' },
  flyLang: { nb: 'Over 3 500 km utenfor EU', sv: 'Över 3 500 km utanför EU', da: 'Over 3.500 km uden for EU' },
  kravSelv: { nb: 'Krev selv hos SAS', sv: 'Kräv själv hos SAS', da: 'Kræv selv hos SAS' },
  honorar: { nb: 'honorar', sv: 'arvode', da: 'gebyr' },
  tilSkjemaet: { nb: 'Til skjemaet', sv: 'Till formuläret', da: 'Til formularen' },
  bareVedSeier: { nb: 'Bare hvis de vinner', sv: 'Bara om de vinner', da: 'Kun hvis de vinder' },
  sendSaken: { nb: 'Send saken', sv: 'Skicka ärendet', da: 'Send sagen' },
  flyForbehold: {
    nb: 'Gjelder ikke ved ekstraordinære omstendigheter, som dårlig vær.',
    sv: 'Gäller inte vid extraordinära omständigheter, som dåligt väder.',
    da: 'Gælder ikke ved usædvanlige omstændigheder, som dårligt vejr.',
  },
} satisfies Record<string, Oversettelse>;

export type Nokkel = keyof typeof TEKSTER;

/** Henter en tekst på landets språk og fyller inn {plassholdere}. */
export function tekst(land: Land, nokkel: Nokkel, verdier: Record<string, string | number> = {}): string {
  let s: string = TEKSTER[nokkel][SPRAK[land].kode];
  for (const [k, v] of Object.entries(verdier)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** «3 dager igjen», «1 dag igjen» eller «Siste dag». */
export function dagerTekst(land: Land, n: number): string {
  if (n <= 0) return tekst(land, 'sisteDag');
  if (n === 1) return tekst(land, 'enDagIgjen');
  return tekst(land, 'dagerIgjen', { n });
}

export function kategoriNavn(land: Land, id: string): string {
  const k = KATEGORIER[id];
  return k ? k[SPRAK[land].kode] : id;
}
