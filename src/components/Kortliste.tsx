import { useState } from 'react';
import type { Kort, Land } from '../data/types';
import { tekst } from '../i18n';
import { fmtPoeng, fmtTall, parseTall } from '../lib/format';

interface Props {
  land: Land;
  kort: Kort[];
  lenke: (k: Kort) => string | null;
  /** Kortforbruk per år som tekst – styrer poeng per år og øre per poeng. */
  kortbruk: string;
  onKortbruk: (verdi: string) => void;
  idag: string;
}

const TILLATT = /^[\d\s.,]*$/;
type Sortering = 'poeng' | 'ore' | 'pris';

/** Månedsprisen som gjelder i dag (kort som prises per år deles på tolv). */
export function prisPerMnd(k: Kort, idag: string): number {
  if (k.prisPerMndFra && idag >= k.prisPerMndFra.dato) return k.prisPerMndFra.kr;
  return k.prisPerMnd;
}

/** Poeng per år ved et kortforbruk, og hva de koster i øre per poeng. */
function regn(k: Kort, kortbruk: number, idag: string) {
  const poengAr = (Math.min(kortbruk, k.tak ?? Infinity) * k.poengPer100) / 100;
  const ore = poengAr > 0 ? (prisPerMnd(k, idag) * 12 * 100) / poengAr : null;
  return { poengAr, ore };
}

/** Alle kort og medlemskap i landet som gir EuroBonus-poeng: samme tre tall for hvert, så de kan sammenlignes. */
export default function Kortliste({ land, kort, lenke, kortbruk, onKortbruk, idag }: Props) {
  const bruk = parseTall(kortbruk);
  const [sortering, setSortering] = useState<Sortering>('ore');
  const rader = kort.map((k) => ({ k, ...regn(k, bruk, idag) }));
  // Flest poeng uansett pris, billigste poeng (trenger et kortforbruk), eller billigste kort.
  const poengForst = (a: (typeof rader)[number], b: (typeof rader)[number]) => b.k.poengPer100 - a.k.poengPer100 || prisPerMnd(a.k, idag) - prisPerMnd(b.k, idag);
  rader.sort((a, b) => {
    if (sortering === 'pris') return prisPerMnd(a.k, idag) - prisPerMnd(b.k, idag) || b.k.poengPer100 - a.k.poengPer100;
    if (sortering === 'ore' && bruk > 0 && a.ore !== null && b.ore !== null) return a.ore - b.ore || poengForst(a, b);
    return poengForst(a, b);
  });
  const valg: { id: Sortering; nokkel: 'flestPoeng' | 'orePoengSort' | 'pris' }[] = [
    { id: 'poeng', nokkel: 'flestPoeng' },
    { id: 'ore', nokkel: 'orePoengSort' },
    { id: 'pris', nokkel: 'pris' },
  ];

  return (
    <section className="kortliste">
      <h2 className="etikett">{tekst(land, 'kortTittel')}</h2>
      <p className="muted kortliste-intro">{tekst(land, 'kortForklaring')}</p>
      <div className="valg-rad rad-kort kortbruk">
        <label className="etikett" htmlFor="kortbruk">
          {tekst(land, 'kortbrukPerAr')}
        </label>
        <span className="tall">
          <input
            id="kortbruk"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={kortbruk}
            onChange={(e) => {
              if (TILLATT.test(e.target.value)) onKortbruk(e.target.value);
            }}
          />
          <span className="enhet">kr</span>
        </span>
        <div className="sortering" role="group" aria-label={tekst(land, 'sortering')}>
          {valg.map((v) => (
            <button key={v.id} type="button" className={`lenke${sortering === v.id ? ' aktiv' : ''}`} aria-pressed={sortering === v.id} onClick={() => setSortering(v.id)}>
              {tekst(land, v.nokkel)}
            </button>
          ))}
        </div>
      </div>
      <ul>
        {rader.map(({ k, poengAr, ore }) => {
          const url = lenke(k);
          const pris = prisPerMnd(k, idag);
          return (
            <li key={k.id}>
              <span className="kortliste-poeng">
                {fmtTall(k.poengPer100)}
                {k.status === 'uverifisert' && <sup>*</sup>}
                <small>p/100 kr</small>
              </span>
              <span className="kortliste-tekst">
                <span className="kortliste-navn">{k.navn}</span>
                <span className="muted">{tekst(land, 'krPerMnd', { n: fmtTall(pris) })}</span>
                {bruk > 0 && (
                  <span className="kortliste-netto">
                    {tekst(land, 'poengPerAr', { n: fmtPoeng(poengAr) })}
                    {ore !== null && ` · ${tekst(land, 'orePerPoeng', { n: fmtTall(ore) })}`}
                  </span>
                )}
              </span>
              {url && (
                <a href={url} target="_blank" rel={k.annonse ? 'sponsored noreferrer' : 'noreferrer'}>
                  {tekst(land, 'sokOmKortet')} <span aria-hidden="true">→</span>
                  {k.annonse && <span className="annonse">{tekst(land, 'annonse')}</span>}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
