import type { Land, Maling, Program } from '../data/types';
import { tekst } from '../i18n';
import type { Resultat } from '../lib/calc';
import { fmtDato, fmtKr, fmtPer100, fmtPoeng, fmtTall } from '../lib/format';
import Monogram from './Monogram';
import Sparkline from './Sparkline';

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
  /** Nivået som gjelder, vist ved siden av navnet (f.eks. «Max»). */
  nivaNavn: string | null;
  onSats: (sats: string) => void;
  resultat: Resultat | null;
  /** Anslått kroneverdi av poengene, eller null når poengverdi ikke er satt. */
  kroner: number | null;
  /** Butikkens side hos programmet – der kjøpet må starte for å få satsen. */
  lenke: string | null;
  /** Satsens historikk for valgt butikk. */
  historikk: Maling[] | null;
  idag: string;
  erBest: boolean;
  apen: boolean;
  onToggle: () => void;
}

const TILLATT = /^[\d\s.,]*$/;

/** Kort dom over satsen: første måling, høyeste siden start, eller under toppen. */
function historikkTekst(land: Land, program: Program, malinger: Maling[]): string {
  const forste = fmtDato(malinger[0][0]);
  if (malinger.length === 1) return tekst(land, 'forsteMaling', { dato: forste });
  const naa = malinger[malinger.length - 1][1];
  const topp = Math.max(...malinger.map((m) => m[1]));
  if (naa >= topp) return tekst(land, 'hoyesteSiden', { dato: forste });
  const enhet = program.satsEnhet === 'prosent' ? ' %' : ' p';
  return tekst(land, 'lavereEnnTopp', { verdi: `${fmtTall(topp)}${enhet}` });
}

/** Én kolonne per program: logo, butikkens sats og resultat. */
export default function ProgramKolonne({ land, program, tilstand, nivaNavn, onSats, resultat, kroner, lenke, historikk, idag, erBest, apen, onToggle }: Props) {
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

      {erBest && <span className="stempel">{tekst(land, 'mestPoeng')}</span>}
      <button type="button" className="resultat" onClick={onToggle} aria-expanded={apen} disabled={!resultat}>
        <span className="poeng">
          {resultat ? fmtPoeng(resultat.total) : '–'}
          {resultat?.status === 'uverifisert' && <sup>*</sup>}
        </span>
        <span className="per100">{resultat ? tekst(land, 'perHundre', { n: fmtPer100(resultat.per100) }) : ' '}</span>
        {resultat && kroner !== null && <span className="kroner">≈ {fmtKr(kroner)}</span>}
      </button>

      {historikk && historikk.length > 0 && (
        <div className="historikk" title={tekst(land, 'historikk')}>
          <Sparkline malinger={historikk} idag={idag} farge="currentColor" />
          <span className="historikk-tekst">{historikkTekst(land, program, historikk)}</span>
        </div>
      )}

      {lenke && (
        <a className="lenke kolonne-lenke" href={lenke} target="_blank" rel="noreferrer">
          {tekst(land, 'handleVia', { program: program.kortnavn })} ↗
        </a>
      )}
    </div>
  );
}
