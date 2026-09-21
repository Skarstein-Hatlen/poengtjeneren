// Norsk tallformat: mellomrom som tusenskille, komma som desimaltegn.

const heltall = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const enDesimal = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const toDesimaler = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 });

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

/** Gjør "1 234,5" / "1234.5" om til tall. Ugyldig eller tomt gir 0. */
export function parseTall(tekst: string): number {
  const renset = tekst.replace(/\s/g, '').replace(',', '.');
  const n = Number(renset);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** ISO-dato (2026-09-21) → 21.09.2026 */
export function fmtDato(iso: string): string {
  const [aar, mnd, dag] = iso.split('-');
  return dag && mnd && aar ? `${dag}.${mnd}.${aar}` : iso;
}
