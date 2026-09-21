import { useState } from 'react';
import type { Butikk } from '../data/types';
import { sokButikker } from '../lib/butikker';
import { ButikkLogo } from './Butikkliste';

interface Props {
  liste: Butikk[];
  verdi: string;
  onChange: (tekst: string) => void;
  onVelg: (butikk: Butikk) => void;
  /** Butikken som allerede er valgt – da trengs ingen forslag for samme navn. */
  valgt: Butikk | null;
}

/** Søkefelt som fyller inn satsene for en butikk vi har hentet data på. */
export default function ButikkSok({ liste, verdi, onChange, onVelg, valgt }: Props) {
  const [fokus, setFokus] = useState(false);
  const treff = fokus ? sokButikker(liste, verdi) : [];
  const eksakt = valgt !== null && verdi === valgt.navn;

  return (
    <div className="butikk">
      <input
        id="butikk"
        type="search"
        autoComplete="off"
        placeholder="Søk butikk"
        value={verdi}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFokus(true)}
        onBlur={() => setTimeout(() => setFokus(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && treff[0]) onVelg(treff[0]);
        }}
      />
      {treff.length > 0 && !eksakt && (
        <ul className="treff" role="listbox">
          {treff.map((b) => (
            <li key={b.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onVelg(b)}>
                <ButikkLogo butikk={b} />
                <span>{b.navn}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
