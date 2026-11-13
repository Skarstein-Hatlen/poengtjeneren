import type { Land, Niva, Program } from '../data/types';
import { dagerTekst, tekst } from '../i18n';
import type { Resultat } from '../lib/calc';
import { fmtPer100, fmtPoeng } from '../lib/format';
import { dagerIgjen } from '../lib/nytt';
import Monogram from './Monogram';

export interface RadTilstand {
  /** Butikkens sats som tekst, ferdig regnet med nivået der programmet har nivåer. */
  sats: string;
  /** Valgt overføringsmåte eller nivå (styres av kortvalget for programmer med eget kort). */
  valgId: string;
}

interface Props {
  land: Land;
  program: Program;
  tilstand: RadTilstand;
  /** Nivåene programmet har (Klarna: Ingen, Plus, Premium, Max) – velges i kolonnens tittel. */
  nivaer: Niva[];
  onNiva: (valgId: string) => void;
  onSats: (sats: string) => void;
  resultat: Resultat | null;
  /** Butikkens side hos programmet – der kjøpet må starte for å få satsen. */
  lenke: string | null;
  /** Sluttdato når satsen i feltet er en kampanjesats. */
  kampanjeSlutt: string | null;
  /** Nivåpoeng kjøpet gir i tillegg (program og kort), 0 når ingen. */
  nivaapoeng: number;
  idag: string;
  erBest: boolean;
  apen: boolean;
  onToggle: () => void;
}

const TILLATT = /^[\d\s.,]*$/;

/** Én kolonne per program: navn (og nivå), butikkens sats, poengene og veien til butikken. */
export default function ProgramKolonne({ land, program, tilstand, nivaer, onNiva, onSats, resultat, lenke, kampanjeSlutt, nivaapoeng, idag, erBest, apen, onToggle }: Props) {
  const satsId = `${program.id}-sats`;

  return (
    <div className={`kolonne${erBest ? ' best' : ''}${resultat ? '' : ' inaktiv'}`}>
      <div className="kolonne-topp">
        <label htmlFor={satsId}>
          <Monogram program={program} />
          <span>{program.kortnavn}</span>
        </label>
        {nivaer.length > 0 && (
          <select className="kolonne-niva" aria-label={tekst(land, 'nivaFor', { program: program.kortnavn })} value={tilstand.valgId} onChange={(e) => onNiva(e.target.value)}>
            {nivaer.map((n) => (
              <option key={n.id} value={n.id}>
                {n.navn}
              </option>
            ))}
          </select>
        )}
      </div>

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

      {erBest && <span className="stempel">{tekst(land, 'mestPoeng')}</span>}
      <button type="button" className="resultat" onClick={onToggle} aria-expanded={apen} disabled={!resultat}>
        <span className="poeng">
          {resultat ? fmtPoeng(resultat.total) : '–'}
          {resultat?.status === 'uverifisert' && <sup>*</sup>}
        </span>
        <span className="per100">{resultat ? tekst(land, 'perHundre', { n: fmtPer100(resultat.per100) }) : ' '}</span>
      </button>

      {((resultat && nivaapoeng > 0) || kampanjeSlutt || lenke) && (
        <div className="kolonne-ekstra">
          {kampanjeSlutt && <span className="igjen">{dagerTekst(land, dagerIgjen(idag, kampanjeSlutt))}</span>}
          {resultat && nivaapoeng > 0 && <span className="nivaa">{tekst(land, 'nivaapoengLinje', { n: fmtPoeng(nivaapoeng) })}</span>}
          {lenke && (
            <a className="kolonne-lenke" href={lenke} target="_blank" rel="noreferrer">
              {tekst(land, 'handleVia', { program: program.kortnavn })} <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
