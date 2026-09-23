import type { Butikk, ButikkSats, Land, Maling, Partnerkampanje, Program } from '../data/types';
import { dagerTekst, tekst } from '../i18n';
import { gjeldendeSats } from '../lib/butikker';
import { fmtDato, fmtPer100, fmtPoeng, fmtTall } from '../lib/format';
import { dagerIgjen, finnEndringer, finnKampanjer } from '../lib/nytt';
import { ButikkLogo } from './Butikkliste';

interface Props {
  land: Land;
  butikker: Butikk[];
  programmer: Program[];
  historikk: Record<string, Record<string, Maling[]>> | undefined;
  idag: string;
  /** Butikk-id-ene brukeren følger (stjernen). */
  folger: string[];
  /** Partner-, kort- og medlemskapskampanjer for landet (kampanjer.json). */
  partnerkampanjer: Partnerkampanje[];
  per100: (program: Program, sats: ButikkSats) => number | null;
  onVelg: (butikk: Butikk) => void;
  onUkens: () => void;
}

const sats = (p: Program, v: number) => (p.satsEnhet === 'prosent' ? `${fmtTall(v)} %` : `${fmtTall(v)} p`);

/** Kampanjer som pågår og satser som nylig endret seg – grunnen til å komme tilbake. */
export default function Nytt({ land, butikker, programmer, historikk, idag, folger, partnerkampanjer, per100, onVelg, onUkens }: Props) {
  const kampanjer = finnKampanjer(butikker, programmer, idag);
  const endringer = finnEndringer(butikker, programmer, historikk, idag);
  const opp = endringer.filter((e) => e.til > e.fra);
  const ned = endringer.filter((e) => e.til < e.fra);

  // Fulgte butikker med programmet som gir mest akkurat nå.
  const dine = folger
    .map((id) => butikker.find((b) => b.id === id))
    .filter((b): b is Butikk => b !== undefined)
    .map((b) => {
      let best: { p: Program; per100: number } | null = null;
      for (const p of programmer) {
        const s = b.satser[p.id];
        if (!s) continue;
        const v = per100(p, s);
        if (v !== null && (best === null || v > best.per100)) best = { p, per100: v };
      }
      return { b, best };
    });

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

  // Kroner i Trumf-bonus vekslet til EuroBonus med programmets sats; poeng vises som de er.
  const kampanjeTall = (k: Partnerkampanje): string => {
    if (k.verdi === null) return '';
    if (k.enhet === 'poeng') return `${fmtPoeng(k.verdi)} p`;
    if (k.enhet === '%') return `${fmtTall(k.verdi)} %`;
    const p = programmer.find((x) => x.id === k.program);
    const kurs = p?.konverteringer[0]?.poengPerKrone;
    return kurs ? `${fmtPoeng(k.verdi * kurs)} p` : `${fmtPoeng(k.verdi)} kr`;
  };
  const kampanjeFarge = (k: Partnerkampanje): string => programmer.find((x) => x.id === k.program)?.farge ?? 'var(--line)';

  return (
    <section className="nytt">
      <p className="ukens-lenke">
        <button type="button" className="lenke" onClick={onUkens}>
          {tekst(land, 'ukensLenke')}
        </button>
      </p>

      {dine.length > 0 && (
        <>
          <h2 className="etikett">{tekst(land, 'dineButikker')}</h2>
          <ul className="nytt-liste">
            {dine.map(({ b, best }) =>
              best
                ? rad(`d-${b.id}`, b, best.p, `${fmtPer100(best.per100)} p/100`, sats(best.p, gjeldendeSats(b.satser[best.p.id], idag).verdi))
                : rad(`d-${b.id}`, b, programmer[0], '–', ''),
            )}
          </ul>
        </>
      )}

      {partnerkampanjer.length > 0 && (
        <>
          <h2 className="etikett">{tekst(land, 'andreKampanjer')}</h2>
          <ul className="nytt-liste">
            {partnerkampanjer.map((k) => (
              <li key={k.id}>
                <a className="nytt-lenke" href={k.url} target="_blank" rel="noreferrer">
                  {k.logo ? (
                    <ButikkLogo butikk={{ id: k.id, navn: k.partner, logo: k.logo, satser: {} }} />
                  ) : (
                    <span className="flis-logo flis-bokstav" aria-hidden="true">
                      {k.partner.charAt(0)}
                    </span>
                  )}
                  <span className="nytt-tekst">
                    <span className="nytt-navn">{k.tittel}</span>
                    <span className="nytt-under">
                      <i style={{ background: kampanjeFarge(k) }} />
                      {k.tekst}
                      {k.slutt ? ` · ${dagerTekst(land, dagerIgjen(idag, k.slutt))}` : ''}
                    </span>
                  </span>
                  <span className="nytt-sats opp">{kampanjeTall(k)}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

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
