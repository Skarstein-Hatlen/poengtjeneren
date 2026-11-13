import { useState } from 'react';
import type { Butikk, ButikkSats, Land, Program } from '../data/types';
import { KATEGORIER, kategoriNavn, tekst } from '../i18n';
import { sokButikker } from '../lib/butikker';
import { fmtPer100 } from '../lib/format';

interface Props {
  land: Land;
  liste: Butikk[];
  programmer: Program[];
  /** EuroBonus-poeng per 100 kr for en butikksats, med brukerens valg (abonnement o.l.). null = kan ikke veksles. */
  per100: (program: Program, sats: ButikkSats) => number | null;
  /** Valgt kategori (styres av adressen: /no/butikker/mote). */
  kategori: string | null;
  onKategori: (kategori: string | null) => void;
  onVelg: (butikk: Butikk) => void;
}

type Sortering = 'navn' | 'poeng';

/** Logo slik programmet viser den; forbokstav hvis bildet mangler eller ikke laster. */
export function ButikkLogo({ butikk }: { butikk: Butikk }) {
  return (
    <span className="flis-logo" aria-hidden="true">
      {butikk.navn.charAt(0)}
      {butikk.logo && (
        <img
          src={butikk.logo.startsWith('http') || butikk.logo.startsWith('/') ? butikk.logo : `/${butikk.logo}`}
          alt=""
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
    </span>
  );
}

/** Alle butikkene vi har satser på: søk, kategori og program, og programmet som gir mest i hver butikk. */
export default function Butikkliste({ land, liste, programmer, per100, kategori, onKategori, onVelg }: Props) {
  const [filter, setFilter] = useState('');
  const [sortering, setSortering] = useState<Sortering>('navn');
  // Avhukede programmer: butikken må finnes i alle dem (og kan i tillegg finnes i flere).
  const [valgte, setValgte] = useState<string[]>([]);
  const veksle = (id: string) => setValgte((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  // Programmene som teller når vi rangerer: de avhukede, ellers alle.
  const tellende = valgte.length > 0 ? programmer.filter((p) => valgte.includes(p.id)) : programmer;

  /** Beste program for butikken målt i EuroBonus-poeng per 100 kr. */
  const beste = (b: Butikk): { program: Program; per100: number } | null => {
    let topp: { program: Program; per100: number } | null = null;
    for (const p of tellende) {
      const sats = b.satser[p.id];
      if (!sats) continue;
      const verdi = per100(p, sats);
      if (verdi !== null && (topp === null || verdi > topp.per100)) topp = { program: p, per100: verdi };
    }
    return topp;
  };

  // Kategorier som faktisk finnes i landet, i fast rekkefølge.
  const kategorier = Object.keys(KATEGORIER).filter((k) => liste.some((b) => b.kategorier?.includes(k)));

  const treff = (filter.trim() ? sokButikker(liste, filter, Infinity) : liste)
    .filter((b) => valgte.every((id) => b.satser[id]))
    .filter((b) => !kategori || b.kategorier?.includes(kategori))
    .map((b) => ({ b, beste: beste(b) }));
  if (sortering === 'poeng') treff.sort((x, y) => (y.beste?.per100 ?? -1) - (x.beste?.per100 ?? -1));

  return (
    <section className="katalog">
      {/* Søket først: det er slik de fleste finner butikken sin. */}
      <div className="katalog-sok">
        <input
          type="search"
          aria-label={tekst(land, 'sokIButikker', { n: liste.length })}
          placeholder={tekst(land, 'sokIButikker', { n: liste.length })}
          autoComplete="off"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="katalog-filter">
        <span className="velg">
          <select aria-label={tekst(land, 'kategori')} value={kategori ?? ''} onChange={(e) => onKategori(e.target.value || null)}>
            <option value="">{tekst(land, 'alleKategorier')}</option>
            {kategorier.map((k) => (
              <option key={k} value={k}>
                {kategoriNavn(land, k)}
              </option>
            ))}
          </select>
        </span>
        <div className="programfilter" role="group" aria-label={tekst(land, 'visButikkerHos')}>
          {programmer.map((p) => {
            const aktiv = valgte.includes(p.id);
            return (
              <button key={p.id} type="button" className={`programknapp${aktiv ? ' aktiv' : ''}`} aria-pressed={aktiv} onClick={() => veksle(p.id)}>
                <i style={{ background: p.farge }} />
                {p.kortnavn}
              </button>
            );
          })}
        </div>
        <div className="sortering" role="group" aria-label={tekst(land, 'sortering')}>
          <button type="button" className={`lenke${sortering === 'navn' ? ' aktiv' : ''}`} aria-pressed={sortering === 'navn'} onClick={() => setSortering('navn')}>
            {tekst(land, 'alfabetisk')}
          </button>
          <button type="button" className={`lenke${sortering === 'poeng' ? ' aktiv' : ''}`} aria-pressed={sortering === 'poeng'} onClick={() => setSortering('poeng')}>
            {tekst(land, 'flestPoeng')}
          </button>
        </div>
      </div>
      {treff.length === 0 ? (
        <p className="tom">{tekst(land, 'ingenButikker')}</p>
      ) : (
        <ul className="fliser">
          {treff.map(({ b, beste }) => (
            <li key={b.id}>
              <button type="button" onClick={() => onVelg(b)}>
                <ButikkLogo butikk={b} />
                <span className="flis-navn">{b.navn}</span>
                {beste && (
                  <span className="flis-beste">
                    <i style={{ background: beste.program.farge }} />
                    {fmtPer100(beste.per100)} {tekst(land, 'pPer100kr')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
