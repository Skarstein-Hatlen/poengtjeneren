import { useState } from 'react';
import type { Butikk, ButikkSats, Land, Program } from '../data/types';
import { KATEGORIER, kategoriNavn, tekst } from '../i18n';
import { gjeldendeSats, sokButikker } from '../lib/butikker';
import { fmtPer100, fmtTall } from '../lib/format';

interface Props {
  land: Land;
  liste: Butikk[];
  programmer: Program[];
  idag: string;
  /** EuroBonus-poeng per 100 kr for en butikksats, med brukerens valg (abonnement o.l.). null = kan ikke veksles. */
  per100: (program: Program, sats: ButikkSats) => number | null;
  /** Valgt kategori (styres av adressen: /no/butikker/mote). */
  kategori: string | null;
  onKategori: (kategori: string | null) => void;
  onVelg: (butikk: Butikk) => void;
  onLukk: () => void;
}

type Sortering = 'navn' | 'poeng';

function satsTekst(program: Program, sats: ButikkSats, idag: string): string {
  const g = gjeldendeSats(sats, idag);
  const tall = fmtTall(g.verdi);
  return program.satsEnhet === 'prosent' ? `${sats.opptil ? '≤' : ''}${tall} %` : `${tall} p`;
}

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

/** Alle butikkene vi har satser på, med logo og satsene per program. */
export default function Butikkliste({ land, liste, programmer, idag, per100, kategori, onKategori, onVelg, onLukk }: Props) {
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
      <div className="katalog-topp">
        <button type="button" className="lenke" onClick={onLukk}>
          {tekst(land, 'tilbake')}
        </button>
        <span className="etikett">{tekst(land, 'antallButikker', { n: treff.length })}</span>
      </div>
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
      <div className="programfilter kategorifilter" role="group" aria-label={tekst(land, 'kategori')}>
        <button type="button" className={`programknapp${kategori === null ? ' aktiv' : ''}`} aria-pressed={kategori === null} onClick={() => onKategori(null)}>
          {tekst(land, 'alleKategorier')}
        </button>
        {kategorier.map((k) => (
          <button key={k} type="button" className={`programknapp${kategori === k ? ' aktiv' : ''}`} aria-pressed={kategori === k} onClick={() => onKategori(k)}>
            {kategoriNavn(land, k)}
          </button>
        ))}
      </div>
      <div className="katalog-verktoy">
        <input type="search" placeholder={tekst(land, 'filtrer')} autoComplete="off" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="sortering" role="group" aria-label={tekst(land, 'sortering')}>
          <button type="button" className={`lenke${sortering === 'navn' ? ' aktiv' : ''}`} aria-pressed={sortering === 'navn'} onClick={() => setSortering('navn')}>
            {tekst(land, 'alfabetisk')}
          </button>
          <button type="button" className={`lenke${sortering === 'poeng' ? ' aktiv' : ''}`} aria-pressed={sortering === 'poeng'} onClick={() => setSortering('poeng')}>
            {tekst(land, 'flestPoeng')}
          </button>
        </div>
      </div>
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
              <span className="chips">
                {programmer
                  .filter((p) => b.satser[p.id])
                  .map((p) => (
                    <span key={p.id} className="chip" title={p.kortnavn}>
                      <i style={{ background: p.farge }} />
                      {satsTekst(p, b.satser[p.id], idag)}
                    </span>
                  ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
