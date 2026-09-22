import type { Butikk, ButikkSats, Land, Maling, Program } from '../data/types';
import { dagerTekst, tekst } from '../i18n';
import { fmtDato, fmtPer100, fmtTall } from '../lib/format';
import { dagerIgjen } from '../lib/nytt';
import { finnUkens } from '../lib/ukens';
import { ButikkLogo } from './Butikkliste';

interface Props {
  land: Land;
  butikker: Butikk[];
  programmer: Program[];
  historikk: Record<string, Record<string, Maling[]>> | undefined;
  idag: string;
  per100: (program: Program, sats: ButikkSats) => number | null;
  onVelg: (butikk: Butikk) => void;
}

const sats = (p: Program, v: number) => (p.satsEnhet === 'prosent' ? `${fmtTall(v)} %` : `${fmtTall(v)} p`);

/** Ukens beste: det som er verdt å dele i gruppa – regnet med brukerens eget oppsett. */
export default function Ukens({ land, butikker, programmer, historikk, idag, per100, onVelg }: Props) {
  const { topp, okninger, utloper } = finnUkens(butikker, programmer, historikk, idag, per100);

  const rad = (nokkel: string, b: Butikk, p: Program, hoved: string, under: string, klasse = '') => (
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
        <span className={`nytt-sats${klasse}`}>{hoved}</span>
      </button>
    </li>
  );

  return (
    <section className="nytt">
      <h2 className="etikett">{tekst(land, 'toppNaa')}</h2>
      <ul className="nytt-liste">
        {topp.map((r) => rad(`t-${r.butikk.id}`, r.butikk, r.program, `${fmtPer100(r.per100)} p/100`, sats(r.program, r.butikk.satser[r.program.id].kampanje && r.butikk.satser[r.program.id].kampanje!.slutt >= idag ? r.butikk.satser[r.program.id].kampanje!.verdi : r.butikk.satser[r.program.id].verdi)))}
      </ul>

      <h2 className="etikett">{tekst(land, 'oktSiste7')}</h2>
      {okninger.length === 0 ? (
        <p className="tom">{tekst(land, 'ingenEndringer')}</p>
      ) : (
        <ul className="nytt-liste">{okninger.map((e) => rad(`o-${e.butikk.id}-${e.program.id}`, e.butikk, e.program, `${sats(e.program, e.fra)} → ${sats(e.program, e.til)}`, fmtDato(e.dato), ' opp'))}</ul>
      )}

      <h2 className="etikett">{tekst(land, 'utloperInnen7')}</h2>
      {utloper.length === 0 ? (
        <p className="tom">{tekst(land, 'ingenKampanjer')}</p>
      ) : (
        <ul className="nytt-liste">
          {utloper.map((k) => rad(`u-${k.butikk.id}-${k.program.id}`, k.butikk, k.program, sats(k.program, k.naa), `${tekst(land, 'normalt', { sats: sats(k.program, k.normalt) })} · ${dagerTekst(land, dagerIgjen(idag, k.slutt))}`, ' opp'))}
        </ul>
      )}
    </section>
  );
}
