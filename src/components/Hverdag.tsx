import hverdagJson from '../data/hverdag.json';
import type { Land, Program } from '../data/types';
import { tekst } from '../i18n';
import { fmtDato, fmtPer100, fmtTall } from '../lib/format';

interface Rad {
  id: string;
  navn: string;
  hvor: string;
  prosent: number;
  medTrumfPay?: number;
  merknad?: string;
}

/** Trumf Kredittkort: mer Trumf-bonus på dagligvare og Talkmore, ingen bonus på vanlige kjøp – derfor her og ikke i kortlisten. */
interface Trumfkort {
  navn: string;
  prisPerMnd: number;
  /** Trumf-bonus i prosent med kortet i NorgesGruppens butikker, og med kortet i Trumf Pay. */
  dagligvare: number;
  dagligvareMedTrumfPay: number;
  /** Trumf-bonus på mobilregningen hos Talkmore med kortet. */
  mobil: number;
  lenke: string;
  kilde: string;
  sistVerifisert: string;
  sjekk?: string[];
}

interface Hverdagsdata {
  program: string;
  kilde: string;
  sistVerifisert: string;
  rader: Rad[];
  kort?: Trumfkort;
}

interface Props {
  land: Land;
  programmer: Program[];
}

const DATA = hverdagJson as Partial<Record<Land, Hverdagsdata>>;

/** Finnes hverdagssiden i landet? (Trumf i Norge.) */
export const harHverdag = (land: Land) => Boolean(DATA[land]);

/** Hverdagen utenfor netthandel: dagligvare, strøm og mobil via Trumf, vekslet til EuroBonus. Én rad per måte å tjene på. */
export default function Hverdag({ land, programmer }: Props) {
  const data = DATA[land];
  const program = data ? programmer.find((p) => p.id === data.program) : undefined;
  const konv = program?.konverteringer[0];
  if (!data || !program || !konv || konv.poengPerKrone === null) return null;
  const perKrone = konv.poengPerKrone;
  const kort = data.kort;

  // Hver måte å tjene på som egen rad, så tallene kan leses rett ned.
  const rader: { id: string; navn: string; under: string; prosent: number; lenke?: string }[] = [];
  for (const r of data.rader) {
    rader.push({ id: r.id, navn: r.navn, under: r.hvor, prosent: r.prosent });
    if (r.medTrumfPay !== undefined) rader.push({ id: `${r.id}-pay`, navn: tekst(land, 'hverdagMedPay', { navn: r.navn }), under: r.hvor, prosent: r.medTrumfPay });
    if (kort && r.id === 'dagligvare') {
      rader.push({
        id: `${r.id}-kort`,
        navn: tekst(land, 'hverdagMedKort', { navn: r.navn, kort: kort.navn }),
        under: tekst(land, 'hverdagKortUnder', { kr: fmtTall(kort.prisPerMnd) }),
        prosent: kort.dagligvareMedTrumfPay,
        lenke: kort.lenke,
      });
    }
    if (kort && r.id === 'mobil') rader.push({ id: `${r.id}-kort`, navn: tekst(land, 'hverdagMedKort', { navn: r.navn, kort: kort.navn }), under: r.hvor, prosent: kort.mobil, lenke: kort.lenke });
  }

  return (
    <section className="nytt kortsiden">
      <div className="liste-topp">
        <h2 className="etikett">{tekst(land, 'hverdagTittel', { program: program.kortnavn })}</h2>
      </div>
      <ul className="nytt-liste">
        {rader.map((r) => {
          const innhold = (
            <>
              <span className="nytt-tekst">
                <span className="nytt-navn">{r.navn}</span>
                <span className="nytt-under">
                  {tekst(land, 'prosentBonus', { p: fmtTall(r.prosent), program: program.kortnavn })} · {r.under}
                </span>
              </span>
              <span className="nytt-sats">
                {fmtPer100(r.prosent * perKrone)} <small>p/100</small>
              </span>
            </>
          );
          return (
            <li key={r.id}>
              {r.lenke ? (
                <a className="nytt-lenke" href={r.lenke} target="_blank" rel="noreferrer">
                  {innhold}
                </a>
              ) : (
                <div className="nytt-lenke">{innhold}</div>
              )}
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
