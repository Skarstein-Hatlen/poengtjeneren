import type { Butikk, Land, Maling, Program } from '../data/types';
import { dagerTekst, tekst } from '../i18n';
import { fmtDato, fmtTall } from '../lib/format';
import { dagerIgjen, finnEndringer, finnKampanjer } from '../lib/nytt';
import { ButikkLogo } from './Butikkliste';

interface Props {
  land: Land;
  butikker: Butikk[];
  programmer: Program[];
  historikk: Record<string, Record<string, Maling[]>> | undefined;
  idag: string;
  onVelg: (butikk: Butikk) => void;
}

const sats = (p: Program, v: number) => (p.satsEnhet === 'prosent' ? `${fmtTall(v)} %` : `${fmtTall(v)} p`);

/** Kampanjer som pågår og satser som nylig endret seg – grunnen til å komme tilbake. */
export default function Nytt({ land, butikker, programmer, historikk, idag, onVelg }: Props) {
  const kampanjer = finnKampanjer(butikker, programmer, idag);
  const endringer = finnEndringer(butikker, programmer, historikk, idag);
  const opp = endringer.filter((e) => e.til > e.fra);
  const ned = endringer.filter((e) => e.til < e.fra);

  const rad = (nokkel: string, b: Butikk, p: Program, hoved: string, under: string, opp?: boolean) => (
    <li key={nokkel}>
      <button type="button" onClick={() => onVelg(b)}>
        <ButikkLogo butikk={b} />
        <span className="nytt-tekst">
          <span className="nytt-navn">{b.navn}</span>
          <span className="nytt-under">
            <i style={{ background: p.farge }} />
            {p.kortnavn} · {under}
          </span>
        </span>
        <span className={`nytt-sats${opp === undefined ? '' : opp ? ' opp' : ' ned'}`}>{hoved}</span>
      </button>
    </li>
  );

  return (
    <section className="nytt">
      <h2 className="etikett">{tekst(land, 'kampanjerNaa')}</h2>
      {kampanjer.length === 0 ? (
        <p className="tom">{tekst(land, 'ingenKampanjer')}</p>
      ) : (
        <ul className="nytt-liste">
          {kampanjer.map((k) =>
            rad(`k-${k.butikk.id}-${k.program.id}`, k.butikk, k.program, sats(k.program, k.naa), `${tekst(land, 'normalt', { sats: sats(k.program, k.normalt) })} · ${dagerTekst(land, dagerIgjen(idag, k.slutt))}`, true),
          )}
        </ul>
      )}

      <h2 className="etikett">{tekst(land, 'gikkOpp')}</h2>
      {opp.length === 0 ? (
        <p className="tom">{tekst(land, 'ingenEndringer')}</p>
      ) : (
        <ul className="nytt-liste">
          {opp.map((e) => rad(`o-${e.butikk.id}-${e.program.id}`, e.butikk, e.program, `${sats(e.program, e.fra)} → ${sats(e.program, e.til)}`, fmtDato(e.dato), true))}
        </ul>
      )}

      <h2 className="etikett">{tekst(land, 'gikkNed')}</h2>
      {ned.length === 0 ? (
        <p className="tom">{tekst(land, 'ingenEndringer')}</p>
      ) : (
        <ul className="nytt-liste">
          {ned.map((e) => rad(`n-${e.butikk.id}-${e.program.id}`, e.butikk, e.program, `${sats(e.program, e.fra)} → ${sats(e.program, e.til)}`, fmtDato(e.dato), false))}
        </ul>
      )}
    </section>
  );
}
