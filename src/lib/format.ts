// Tallformat som følger landet: norsk/svensk «1 234,5», dansk «1.234,5».

export type Locale = 'nb-NO' | 'sv-SE' | 'da-DK';

let locale: Locale = 'nb-NO';
let heltall: Intl.NumberFormat;
let enDesimal: Intl.NumberFormat;
let toDesimaler: Intl.NumberFormat;

function lag() {
  heltall = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  enDesimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  toDesimaler = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
}
lag();

/** Bytter tallformat. Kalles når landet byttes. */
export function settLocale(ny: Locale) {
  if (ny !== locale) {
    locale = ny;
    lag();
  }
}

export function fmtPoeng(n: number): string {
  return heltall.format(Math.round(n));
}

export function fmtPer100(n: number): string {
  return enDesimal.format(n);
}

export function fmtKr(n: number): string {
  return `${toDesimaler.format(n)} kr`;
}

export function fmtProsent(n: number): string {
  return `${toDesimaler.format(n)} %`;
}

export function fmtTall(n: number): string {
  return toDesimaler.format(n);
}

/**
 * Gjør "1 234,5", "1.234,5" og "1234.5" om til tall. Komma er desimaltegn når det finnes;
 * da er punktum tusenskille. Ugyldig eller tomt gir 0.
 */
export function parseTall(tekst: string): number {
  let renset = tekst.replace(/\s/g, '');
  if (renset.includes(',')) renset = renset.replace(/\./g, '').replace(',', '.');
  const n = Number(renset);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** ISO-dato (2026-09-21) → 21.09.2026, eller 2026-09-21 på svensk. */
export function fmtDato(iso: string): string {
  const [aar, mnd, dag] = iso.split('-');
  if (!(dag && mnd && aar)) return iso;
  return locale === 'sv-SE' ? iso : `${dag}.${mnd}.${aar}`;
}
