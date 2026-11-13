import { useState } from 'react';
import { prisPerMnd } from '../lib/kort';
import kortbilder from '../data/kortbilder.json';
import type { Kort, Land } from '../data/types';
import { tekst } from '../i18n';
import { fmtTall } from '../lib/format';

interface Props {
  land: Land;
  kort: Kort[];
  lenke: (k: Kort) => string | null;
  idag: string;
}

const BILDER = kortbilder as Record<string, string>;
type Sortering = 'poeng' | 'pris';

/** Månedsprisen som gjelder i dag (kort som prises per år deles på tolv). */
export { prisPerMnd } from '../lib/kort';

/** Alle kort og medlemskap i landet som gir EuroBonus-poeng: bilde, navn, pris og poeng per 100 kr. Raden går til utstederen. */
export default function Kortliste({ land, kort, lenke, idag }: Props) {
  const [sortering, setSortering] = useState<Sortering>('poeng');
  const rader = [...kort].sort((a, b) =>
    sortering === 'pris'
      ? prisPerMnd(a, idag) - prisPerMnd(b, idag) || b.poengPer100 - a.poengPer100
      : b.poengPer100 - a.poengPer100 || prisPerMnd(a, idag) - prisPerMnd(b, idag),
  );
  const valg: { id: Sortering; nokkel: 'flestPoeng' | 'pris' }[] = [
    { id: 'poeng', nokkel: 'flestPoeng' },
    { id: 'pris', nokkel: 'pris' },
  ];

  return (
    <section className="nytt kortsiden">
      <div className="liste-topp">
        <h2 className="etikett">{tekst(land, 'kortTittel')}</h2>
        <div className="sortering" role="group" aria-label={tekst(land, 'sortering')}>
          {valg.map((v) => (
            <button key={v.id} type="button" className={`lenke${sortering === v.id ? ' aktiv' : ''}`} aria-pressed={sortering === v.id} onClick={() => setSortering(v.id)}>
              {tekst(land, v.nokkel)}
            </button>
          ))}
        </div>
      </div>
      <ul className="nytt-liste">
        {rader.map((k) => {
          const url = lenke(k);
          const innhold = (
            <>
              <span className="kortrad-bilde" aria-hidden="true">
                {BILDER[k.id] && <img src={BILDER[k.id]} alt="" loading="lazy" />}
              </span>
              <span className="nytt-tekst">
                <span className="nytt-navn">
                  {k.navn}
                  {k.annonse && <span className="annonse">{tekst(land, 'annonse')}</span>}
                </span>
                <span className="nytt-under">{tekst(land, 'krPerMnd', { n: fmtTall(prisPerMnd(k, idag)) })}</span>
              </span>
              <span className="nytt-sats">
                {fmtTall(k.poengPer100)}
                {k.status === 'uverifisert' && <sup>*</sup>} <small>p/100</small>
              </span>
            </>
          );
          return (
            <li key={k.id}>
              {url ? (
                <a className="nytt-lenke" href={url} target="_blank" rel={k.annonse ? 'sponsored noreferrer' : 'noreferrer'} title={tekst(land, 'sokOmKortet')}>
                  {innhold}
                </a>
              ) : (
                <div className="nytt-lenke">{innhold}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
