import type { Program } from '../data/types';
import type { Resultat } from '../lib/calc';
import { fmtPer100, fmtPoeng } from '../lib/format';
import Monogram from './Monogram';

export interface RadTilstand {
  /** Butikkens sats som tekst, ferdig regnet med nivået der programmet har nivåer. */
  sats: string;
  /** Valgt overføringsmåte eller nivå (styres av kortvalget for programmer med eget kort). */
  valgId: string;
}

interface Props {
  program: Program;
  tilstand: RadTilstand;
  /** Nivået som gjelder, vist ved siden av navnet (f.eks. «Max»). */
  nivaNavn: string | null;
  onSats: (sats: string) => void;
  resultat: Resultat | null;
  /** Butikkens side hos programmet – der kjøpet må starte for å få satsen. */
  lenke: string | null;
  erBest: boolean;
  apen: boolean;
  onToggle: () => void;
}

const TILLATT = /^[\d\s.,]*$/;

/** Én kolonne per program: logo, butikkens sats og resultat. */
export default function ProgramKolonne({ program, tilstand, nivaNavn, onSats, resultat, lenke, erBest, apen, onToggle }: Props) {
  const satsId = `${program.id}-sats`;

  return (
    <div className={`kolonne${erBest ? ' best' : ''}${resultat ? '' : ' inaktiv'}`}>
      <label className="kolonne-topp" htmlFor={satsId}>
        <Monogram program={program} />
        <span>
          {program.kortnavn}
          {nivaNavn && <span className="niva"> {nivaNavn}</span>}
        </span>
      </label>

      <span className="tall">
        <input
          id={satsId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="–"
          value={tilstand.sats}
          onChange={(e) => {
            if (TILLATT.test(e.target.value)) onSats(e.target.value);
          }}
        />
        <span className="enhet">{program.satsEnhet === 'prosent' ? '%' : 'p/100'}</span>
      </span>

      {erBest && <span className="stempel">Mest poeng</span>}
      <button type="button" className="resultat" onClick={onToggle} aria-expanded={apen} disabled={!resultat}>
        <span className="poeng">
          {resultat ? fmtPoeng(resultat.total) : '–'}
          {resultat?.status === 'uverifisert' && <sup>*</sup>}
        </span>
        <span className="per100">{resultat ? `${fmtPer100(resultat.per100)} per 100 kr` : ' '}</span>
      </button>
      {lenke && (
        <a className="lenke kolonne-lenke" href={lenke} target="_blank" rel="noreferrer">
          Handle via {program.kortnavn} ↗
        </a>
      )}
    </div>
  );
}
