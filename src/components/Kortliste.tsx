import type { Kort, Land } from '../data/types';
import { tekst } from '../i18n';
import { fmtTall } from '../lib/format';

interface Props {
  land: Land;
  kort: Kort[];
  lenke: (k: Kort) => string | null;
}

/** Alle kort i landet som gir EuroBonus-poeng, med søknadslenke. */
export default function Kortliste({ land, kort, lenke }: Props) {
  const sortert = [...kort].sort((a, b) => b.poengPer100 - a.poengPer100);
  return (
    <section className="kortliste">
      <h2 className="etikett">{tekst(land, 'kortTittel')}</h2>
      <p className="muted kortliste-intro">{tekst(land, 'kortForklaring')}</p>
      <ul>
        {sortert.map((k) => {
          const url = lenke(k);
          return (
            <li key={k.id}>
              <span className="kortliste-poeng">
                {fmtTall(k.poengPer100)}
                {k.status === 'uverifisert' && <sup>*</sup>}
              </span>
              <span className="kortliste-tekst">
                <span className="kortliste-navn">{k.navn}</span>
                <span className="muted">
                  {k.pris}
                  {k.merknad ? ` · ${k.merknad}` : ''}
                </span>
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
