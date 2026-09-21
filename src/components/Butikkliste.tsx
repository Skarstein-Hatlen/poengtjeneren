import { useState } from 'react';
import type { Butikk, ButikkSats, Program } from '../data/types';
import { gjeldendeSats, sokButikker } from '../lib/butikker';
import { fmtTall } from '../lib/format';

interface Props {
  liste: Butikk[];
  programmer: Program[];
  idag: string;
  onVelg: (butikk: Butikk) => void;
  onLukk: () => void;
}

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
      {butikk.logo && <img src={butikk.logo} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />}
    </span>
  );
}

/** Alle butikkene vi har satser på, med logo og satsene per program. */
export default function Butikkliste({ liste, programmer, idag, onVelg, onLukk }: Props) {
  const [filter, setFilter] = useState('');
  // Avhukede programmer: butikken må finnes i alle dem (og kan i tillegg finnes i flere).
  const [valgte, setValgte] = useState<string[]>([]);
  const veksle = (id: string) => setValgte((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const treff = (filter.trim() ? sokButikker(liste, filter, Infinity) : liste).filter((b) => valgte.every((id) => b.satser[id]));

  return (
    <section className="katalog">
      <div className="katalog-topp">
        <button type="button" className="lenke" onClick={onLukk}>
          ← Tilbake
        </button>
        <span className="etikett">{treff.length} butikker</span>
      </div>
      <div className="programfilter" role="group" aria-label="Vis butikker som finnes hos">
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
      <input
        type="search"
        placeholder="Filtrer"
        autoComplete="off"
        autoFocus
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul className="fliser">
        {treff.map((b) => (
          <li key={b.id}>
            <button type="button" onClick={() => onVelg(b)}>
              <ButikkLogo butikk={b} />
              <span className="flis-navn">{b.navn}</span>
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
