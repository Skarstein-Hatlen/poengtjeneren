import hverdagJson from '../data/hverdag.json';
import type { Kort, Land, Program } from '../data/types';
import { tekst } from '../i18n';
import { fmtDato, fmtPer100, fmtPoeng, fmtTall, parseTall } from '../lib/format';

interface Rad {
  id: string;
  navn: string;
  hvor: string;
  prosent: number;
  medTrumfPay?: number;
  merknad?: string;
}

interface Hverdagsdata {
  program: string;
  kilde: string;
  sistVerifisert: string;
  rader: Rad[];
}

interface Props {
  land: Land;
  programmer: Program[];
  /** Kortet brukeren har valgt – poengene kommer i tillegg til Trumf-bonusen. */
  kort: Kort | null;
  matPerMnd: string;
  onMatPerMnd: (verdi: string) => void;
}

const TILLATT = /^[\d\s.,]*$/;
const DATA = hverdagJson as Partial<Record<Land, Hverdagsdata>>;

/** Hverdagen utenfor netthandel: dagligvare, strøm og mobil via Trumf, vekslet til EuroBonus. */
export default function Hverdag({ land, programmer, kort, matPerMnd, onMatPerMnd }: Props) {
  const data = DATA[land];
  const program = data ? programmer.find((p) => p.id === data.program) : undefined;
  const konv = program?.konverteringer[0];
  if (!data || !program || !konv || konv.poengPerKrone === null) return null;
  const perKrone = konv.poengPerKrone;
  const per100 = (prosent: number) => prosent * perKrone;
  const mat = parseTall(matPerMnd);
  const kortPoeng = kort && kort.poengPer100 > 0 ? (mat * 12 * kort.poengPer100) / 100 : 0;

  return (
    <section className="hverdag">
      <h2 className="etikett">{tekst(land, 'hverdag')}</h2>
      <p className="muted kortliste-intro">{tekst(land, 'hverdagForklaring', { program: program.kortnavn, n: fmtTall(perKrone) })}</p>
      <div className="valg-rad rad-kort kortbruk">
        <label className="etikett" htmlFor="mat">
          {tekst(land, 'matPerMnd')}
        </label>
        <span className="tall">
          <input
            id="mat"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={matPerMnd}
            onChange={(e) => {
              if (TILLATT.test(e.target.value)) onMatPerMnd(e.target.value);
            }}
          />
          <span className="enhet">kr</span>
        </span>
        <span />
      </div>
      <ul className="hverdag-liste">
        {data.rader.map((r) => {
          const erMat = r.id === 'dagligvare';
          const arBasis = erMat ? (mat * 12 * r.prosent) / 100 : 0;
          const arPay = erMat && r.medTrumfPay ? (mat * 12 * r.medTrumfPay) / 100 : 0;
          return (
            <li key={r.id}>
              <span className="kortliste-poeng">
                {fmtPer100(per100(r.prosent))}
                <small>p/100 kr</small>
              </span>
              <span className="kortliste-tekst">
                <span className="kortliste-navn">
                  {r.navn} <span className="muted">· {r.hvor}</span>
                </span>
                <span className="muted">
                  {tekst(land, 'prosentBonus', { p: fmtTall(r.prosent), program: program.kortnavn })}
                  {r.medTrumfPay !== undefined && ` · ${tekst(land, 'medTrumfPay', { p: fmtTall(r.medTrumfPay), n: fmtPer100(per100(r.medTrumfPay)) })}`}
                  {r.merknad ? ` · ${r.merknad}` : ''}
                </span>
                {erMat && mat > 0 && (
                  <span className="kortliste-netto">
                    {tekst(land, 'poengPerAr', { n: fmtPoeng(arBasis * perKrone) })}
                    {kortPoeng > 0 && kort && ` ${tekst(land, 'plussKort', { n: fmtPoeng(kortPoeng), kort: kort.navn })}`}
                    {arPay > 0 && ` · ${tekst(land, 'medTrumfPayAr', { n: fmtPoeng(arPay * perKrone) })}`}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="fotnote">
        <a href={data.kilde} target="_blank" rel="noreferrer">
          {tekst(land, 'hverdagKilde', { dato: fmtDato(data.sistVerifisert) })}
        </a>
      </p>
    </section>
  );
}
