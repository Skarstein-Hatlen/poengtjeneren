import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactElement } from 'react';
import hverdagJson from '../data/hverdag.json';
import type { Butikk, Kort, Land, Program, Samarbeidspartner } from '../data/types';
import { SPRAK, tekst } from '../i18n';
import { fmtPoeng, fmtTall, parseTall } from '../lib/format';
import { beregnOppsett, manederTil, oreVerdi, velgOppsett, type Oppsett } from '../lib/plan';
import Kortbilde from './Kortbilde';

export type PlanDel = 'poeng' | 'penger';

interface Props {
  land: Land;
  programmer: Program[];
  butikker: Butikk[];
  kort: Kort[];
  /** Butikkene brukeren følger – netthandelen fordeles på dem. */
  folger: string[];
  /** Kjente nettbutikker, brukt når brukeren ikke følger noen. */
  kjente: string[];
  idag: string;
  samarbeid: Samarbeidspartner | null;
  /** Hvilken av de to sidene: «Hvor mange poeng?» eller «Penger eller poeng?». */
  del: PlanDel;
  sti: (del: PlanDel) => string;
  onDel: (del: PlanDel) => void;
}

type Felt = 'netthandel' | 'dagligvare' | 'kortbruk' | 'har' | 'trenger' | 'ct' | 'kontant' | 'poeng' | 'avgifter';
const NOKKEL = 'pointmaxing.plan';
const STANDARD: Record<Felt, string> = { netthandel: '3000', dagligvare: '5000', kortbruk: '8000', har: '', trenger: '', ct: '', kontant: '4500', poeng: '30000', avgifter: '900' };
const TILLATT = /^[\d\s.,]*$/;
// Skyveknappene (kr i måneden): fine steg der folk flest er, grovere steg opp mot de store beløpene.
// Hvert trinn er [opp til, steg]; hvert hakk på glideren er ett steg, også med piltastene.
const trinn = (...deler: [number, number][]) => {
  const verdier = [0];
  for (const [til, steg] of deler) while (verdier[verdier.length - 1] < til) verdier.push(verdier[verdier.length - 1] + steg);
  return verdier;
};
const GLIDER: Partial<Record<Felt, number[]>> = {
  netthandel: trinn([20_000, 500]),
  dagligvare: trinn([15_000, 500], [40_000, 1_000]),
  kortbruk: trinn([20_000, 1_000], [100_000, 2_500], [250_000, 10_000]),
};
// Hvor poengene kommer fra, i stolpene. De tre fargene er validert sammen mot billetten. SAS Shopping er ikke med:
// den gir like mange poeng uansett kort.
const DELER = [
  { id: 'trumf', farge: '#2a5bb8', nokkel: 'planDel_trumf' },
  { id: 'klarna', farge: '#d6457f', nokkel: 'planDel_klarna' },
  { id: 'kort', farge: '#a86a00', nokkel: 'planDel_kort' },
] as const;

function lesLagret(): Record<Felt, string> {
  try {
    const p = JSON.parse(localStorage.getItem(NOKKEL) ?? 'null') as Partial<Record<Felt, string>> | null;
    return { ...STANDARD, ...(p ?? {}) };
  } catch {
    return STANDARD;
  }
}

/** Tall som glir til ny verdi (rolig når brukeren har bedt om mindre bevegelse). */
function useGlid(mal: number, ms = 280) {
  const [verdi, setVerdi] = useState(mal);
  const fra = useRef(mal);
  useEffect(() => {
    const rolig = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (rolig) {
      setVerdi(mal);
      fra.current = mal;
      return;
    }
    const start = performance.now();
    const fraVerdi = fra.current;
    let ramme = 0;
    const steg = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const v = fraVerdi + (mal - fraVerdi) * (1 - (1 - p) ** 3);
      setVerdi(v);
      fra.current = v;
      if (p < 1) ramme = requestAnimationFrame(steg);
    };
    ramme = requestAnimationFrame(steg);
    // Bakgrunnsfaner kjører ikke animasjoner: sett sluttverdien uansett.
    const sikring = setTimeout(() => {
      setVerdi(mal);
      fra.current = mal;
    }, ms + 60);
    return () => {
      cancelAnimationFrame(ramme);
      clearTimeout(sikring);
    };
  }, [mal, ms]);
  return verdi;
}

function GlidendeTall({ verdi }: { verdi: number }) {
  return <>{fmtPoeng(useGlid(verdi))}</>;
}

/** Tallfelt med mellomrom i tusenene som holder markøren på plass mens du skriver. Lagrer bare sifrene. */
function TallInput({ verdi, onEndre, ...rest }: { verdi: string; onEndre: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const ref = useRef<HTMLInputElement>(null);
  const siffer = useRef<number | null>(null);
  const vist = verdi ? fmtTall(parseTall(verdi)) : '';
  // Etter formateringen: sett markøren etter like mange sifre som før.
  useLayoutEffect(() => {
    const el = ref.current;
    if (siffer.current === null || !el) return;
    let igjen = siffer.current;
    let pos = 0;
    while (pos < vist.length && igjen > 0) {
      if (/\d/.test(vist[pos])) igjen--;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    siffer.current = null;
  }, [vist]);
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="0"
      {...rest}
      value={vist}
      onChange={(e) => {
        if (!TILLATT.test(e.target.value)) return;
        siffer.current = e.target.value.slice(0, e.target.selectionStart ?? e.target.value.length).replace(/\D/g, '').length;
        onEndre(e.target.value.replace(/\D/g, ''));
      }}
    />
  );
}

const HVERDAG = hverdagJson as Partial<
  Record<Land, { rader: { id: string; prosent: number }[]; kort?: { navn: string; prisPerMnd: number; dagligvare: number; dagligvareMedTrumfPay?: number } }>
>;
const FLY = 'M50 4 Q58 8 58 26 L58 40 L94 62 L94 71 L58 59 L58 78 L74 91 L74 97 L57 92 L50 95 L43 92 L26 97 L26 91 L42 78 L42 59 L6 71 L6 62 L42 40 L42 26 Q42 8 50 4 Z';
const enDesimal = (n: number) => fmtTall(Math.round(n * 10) / 10);

/**
 * Planen i to sider. «Hvor mange poeng?»: forbruket gir poeng med ett kort til alt – flest, nesten like mange for
 * mindre, mest for pengene og gratis – og når du kan reise. «Penger eller poeng?»: er poengbilletten verdt poengene?
 */
export default function Plan({ land, programmer, butikker, kort, folger, kjente, idag, samarbeid, del, sti, onDel }: Props) {
  const [felt, setFelt] = useState(lesLagret);
  useEffect(() => {
    try {
      localStorage.setItem(NOKKEL, JSON.stringify(felt));
    } catch {
      /* lagring er bare en bekvemmelighet */
    }
  }, [felt]);
  const T = (n: Parameters<typeof tekst>[1], v?: Record<string, string | number>) => tekst(land, n, v);
  const tall = (f: Felt) => parseTall(felt[f]);
  const sett = (f: Felt, v: string) => setFelt((s) => ({ ...s, [f]: v }));

  const tallfelt = (f: Felt, etikett: string, enhet: string) => (
    <label className="plan-tallfelt" key={f}>
      <span className="etikett">{etikett}</span>
      <span className="tall">
        <TallInput id={`plan-${f}`} verdi={felt[f]} onEndre={(v) => sett(f, v)} />
        <span className="enhet">{enhet}</span>
      </span>
    </label>
  );

  return (
    <section className="plan">
      <nav className="plan-faner" aria-label={T('navPlan')}>
        {(['poeng', 'penger'] as const).map((d) => (
          <a
            key={d}
            href={sti(d)}
            aria-current={d === del ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onDel(d);
            }}
          >
            {T(d === 'poeng' ? 'planFanePoeng' : 'planFanePenger')}
          </a>
        ))}
      </nav>
      {del === 'poeng' ? (
        <Poeng land={land} programmer={programmer} butikker={butikker} kort={kort} folger={folger} kjente={kjente} idag={idag} T={T} tall={tall} sett={sett} tallfelt={tallfelt} />
      ) : (
        <Penger programmer={programmer} samarbeid={samarbeid} T={T} tall={tall} tallfelt={tallfelt} felt={felt} sett={sett} />
      )}
    </section>
  );
}

interface Felles {
  T: (n: Parameters<typeof tekst>[1], v?: Record<string, string | number>) => string;
  tall: (f: Felt) => number;
  tallfelt: (f: Felt, etikett: string, enhet: string) => ReactElement;
}

/** «Hvor mange poeng kan du få?»: glidere for forbruket, målet, og stigen med én løsning per rad. */
function Poeng({
  land,
  programmer,
  butikker,
  kort,
  folger,
  kjente,
  idag,
  T,
  tall,
  sett,
  tallfelt,
}: Felles & Pick<Props, 'land' | 'programmer' | 'butikker' | 'kort' | 'folger' | 'kjente' | 'idag'> & { sett: (f: Felt, v: string) => void }) {
  const hverdag = HVERDAG[land];
  const harTrumf = programmer.some((p) => p.id === 'trumf') && Boolean(hverdag);
  const kurv = useMemo(() => {
    const ider = folger.length ? folger : kjente;
    return butikker.filter((b) => ider.includes(b.id));
  }, [butikker, folger, kjente]);
  const netthandel = tall('netthandel');
  const dagligvare = harTrumf ? tall('dagligvare') : 0;
  const kortbruk = tall('kortbruk');
  const alle = useMemo(
    () =>
      beregnOppsett(
        {
          programmer,
          butikker: kurv,
          kort,
          dagligvareProsent: harTrumf ? (hverdag?.rader.find((r) => r.id === 'dagligvare')?.prosent ?? null) : null,
          // De som har Trumf Kredittkort, betaler med det i Trumf Pay: 1 % ekstra på dagligvare (trumf.no).
          trumfKort:
            harTrumf && hverdag?.kort
              ? { ...hverdag.kort, navn: `${hverdag.kort.navn} med Trumf Pay`, dagligvare: hverdag.kort.dagligvareMedTrumfPay ?? hverdag.kort.dagligvare }
              : null,
          idag,
        },
        { netthandel, dagligvare, kortbruk },
      ),
    [programmer, kurv, kort, idag, harTrumf, hverdag, netthandel, dagligvare, kortbruk],
  );
  const { flest, nesten, verdi, gratis, nivapoeng } = velgOppsett(alle);
  const navn = (o: Oppsett) => o.navn ?? T('planUtenKort');

  // Stigen: flest poeng, nesten like mange for langt mindre, mest for pengene, gratis og flest nivåpoeng. Samme løsning i flere roller blir én rad.
  const rader: { roller: string[]; o: Oppsett }[] = [];
  for (const [rolle, o] of [
    [T('planFlest'), flest],
    [T('planNesten'), nesten],
    [T('planVerdi'), verdi],
    [T('planGratisBest'), gratis],
    [T('planNivaRolle'), nivapoeng],
  ] as const) {
    if (!o) continue;
    const rad = rader.find((r) => r.o.id === o.id);
    if (rad) rad.roller.push(rolle);
    else rader.push({ roller: [rolle], o });
  }
  rader.sort((a, b) => b.o.poengAr - a.o.poengAr);
  const maks = Math.max(1, ...rader.map((r) => r.o.poengAr));
  const deler = DELER.filter((d) => rader.some((r) => r.o.deler[d.id] > 0));

  const har = tall('har');
  const trenger = tall('trenger');
  const nokAllerede = trenger > 0 && har >= trenger;
  const manedFmt = new Intl.DateTimeFormat(SPRAK[land].locale, { month: 'long', year: 'numeric' });
  const reiseDato = (o: Oppsett) => {
    if (trenger <= 0 || nokAllerede) return null;
    const mndTil = (poeng: number) => (poeng > har ? manederTil(poeng - har, o.poengAr) : 0);
    let mnd = mndTil(trenger);
    let ct = false;
    // 2 for 1 (CT) bare med kort som gir det: halve poengene, men tidligst fra måneden kupongen kommer – og bare når
    // det er før du har nok til full pris.
    const halv = tall('ct') === 1 && o.toForEnMnd !== null ? mndTil(trenger / 2) : null;
    if (halv !== null && o.toForEnMnd !== null) {
      const medCt = Math.max(halv, o.toForEnMnd);
      if (mnd === null || medCt < mnd) [mnd, ct] = [medCt, true];
    }
    if (mnd === null) return null;
    const d = new Date(`${idag}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + mnd);
    return T(ct ? 'planReisCt' : 'planReis', { dato: manedFmt.format(d) });
  };
  const kostnad = (o: Oppsett) => (o.kostnadAr > 0 ? T('planKostnad', { kr: fmtTall(Math.round(o.kostnadAr)) }) : T('planGratis'));
  const toForEn = (o: Oppsett) => `${T(o.toForEnEuropa ? 'planToForEnEuropa' : 'planToForEn')}${o.toForEn > 1 ? ` ×${o.toForEn}` : ''}`;

  const glider = (f: Felt, etikett: string) => {
    const verdier = GLIDER[f]!;
    // Nærmeste trinn til det som er lagret (også fra før glideren fikk trinn).
    const hakk = verdier.reduce((best, x, i) => (Math.abs(x - tall(f)) < Math.abs(verdier[best] - tall(f)) ? i : best), 0);
    const v = verdier[hakk];
    return (
      <div className="plan-glider" key={f}>
        <label htmlFor={`plan-${f}`}>
          <span className="etikett">{etikett}</span>
          <span className="plan-glider-verdi">
            {fmtTall(v)} <small>kr/mnd</small>
          </span>
        </label>
        <input
          id={`plan-${f}`}
          type="range"
          min={0}
          max={verdier.length - 1}
          step={1}
          value={hakk}
          aria-valuetext={`${fmtTall(v)} kr`}
          style={{ '--fyll': `${(hakk / (verdier.length - 1)) * 100}%` } as CSSProperties}
          onChange={(e) => sett(f, String(verdier[Number(e.target.value)]))}
        />
      </div>
    );
  };

  return (
    <>
      <h1>{T('planTittel')}</h1>

      <div className="plan-forbruk">
        {glider('netthandel', T('planNetthandel'))}
        {harTrumf && glider('dagligvare', T('planDagligvare'))}
        {glider('kortbruk', T('planKortbruk'))}
      </div>

      <div className="plan-mal">
        {tallfelt('har', T('planHar'), T('planPoengEnhet'))}
        <div>
          {tallfelt('trenger', T('planTrenger'), T('planPoengEnhet'))}
          <label className="plan-ct">
            <input type="checkbox" role="switch" id="plan-ct" checked={tall('ct') === 1} onChange={(e) => sett('ct', e.target.checked ? '1' : '')} />
            <span className="plan-bryter" aria-hidden="true" />
            {T('planCt')}
          </label>
        </div>
      </div>
      {nokAllerede && <p className="plan-nok">{T('planNokAllerede')}</p>}

      <div className="plan-stige-topp">
        <ul className="plan-forklaring">
          {deler.map((d) => (
            <li key={d.id}>
              <i style={{ background: d.farge }} />
              {T(d.nokkel)}
            </li>
          ))}
        </ul>
        <span className="muted">{T('planPoengAr')}</span>
      </div>
      <ol className="plan-stige">
        {rader.map(({ roller, o }) => {
          const dato = reiseDato(o);
          return (
            <li key={o.id}>
              <Kortbilde kortId={o.kortId} />
              <div className="plan-rad">
                <div className="plan-rad-topp">
                  <span className="plan-navn">{navn(o)}</span>
                  <span className="plan-rad-tall">
                    <GlidendeTall verdi={o.poengAr} />
                  </span>
                </div>
                {o.poengAr > 0 && (
                  <div
                    className="plan-stabel"
                    style={{ width: `${(o.poengAr / maks) * 100}%` }}
                    role="img"
                    aria-label={deler.map((d) => `${T(d.nokkel)} ${fmtPoeng(o.deler[d.id])}`).join(', ')}
                  >
                    {deler
                      .filter((d) => o.deler[d.id] > 0)
                      .map((d) => (
                        <span key={d.id} style={{ flexGrow: o.deler[d.id], background: d.farge }} />
                      ))}
                  </div>
                )}
                <p className="plan-rad-info">
                  <span className="plan-rolle">{roller.join(' · ')}</span>
                  {o.kostnadAr > 0 && ` · ${kostnad(o)}`}
                  {o.nivapoengAr > 0 && (
                    <>
                      {' · '}
                      <span className="plan-nivapoeng">{T('planNivapoeng', { n: fmtPoeng(o.nivapoengAr) })}</span>
                    </>
                  )}
                  {o.toForEn > 0 && (
                    <>
                      {' · '}
                      <span className="plan-nivapoeng">{toForEn(o)}</span>
                    </>
                  )}
                  {dato && (
                    <>
                      {' · '}
                      <span className="plan-dato">
                        <svg className="plan-fly-ikon" viewBox="0 0 100 100" aria-hidden="true">
                          <path d={FLY} transform="rotate(90 50 50)" />
                        </svg>
                        {dato}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <details className="plan-mer">
        <summary>{T('planAlle', { n: alle.length })}</summary>
        <ul className="plan-alle-liste">
          {alle.map((o) => (
            <li key={o.id}>
              <Kortbilde kortId={o.kortId} liten />
              <span>
                {navn(o)}
                <span className="muted">
                  {' · '}
                  {kostnad(o)}
                  {o.ore !== null && o.kostnadAr > 0 ? ` · ${T('planOre', { ore: enDesimal(o.ore) })}` : ''}
                  {o.toForEn > 0 ? ` · ${toForEn(o)}` : ''}
                </span>
              </span>
              <b>{fmtPoeng(o.poengAr)}</b>
            </li>
          ))}
        </ul>
      </details>

      <details className="plan-mer">
        <summary>{T('planSlikTittel')}</summary>
        <p className="graf-merknad">
          {T('planSlik', { butikker: folger.length ? T('planFulgte', { n: kurv.length }) : T('planKjente', { n: kurv.length }) })}
          {harTrumf ? ` ${T('planSlikTrumf')}` : ''} {T('planSlikCt')} {T('planAmex')}
        </p>
      </details>
    </>
  );
}

/**
 * «Book med penger eller poeng?»: det poengbilletten sparer deg i kroner, mot hva poengene er verdt som penger.
 * Trumf-bonus og Klarna-cashback kan tas ut som penger (trumf.no/automatisk-overforing-til-bankkonto,
 * klarna.com/se/kundservice/hur-tar-jag-ut-pengar-fran-min-klarna-saldo, klarna.com/dk/klarna-saldo); vekslingen som
 * gir flest poeng per krone setter prisen på et poeng.
 */
function Penger({
  programmer,
  samarbeid,
  T,
  tall,
  felt,
  sett,
}: Felles & Pick<Props, 'programmer' | 'samarbeid'> & { felt: Record<Felt, string>; sett: (f: Felt, v: string) => void }) {
  const kilde =
    programmer
      .filter((p) => p.satsEnhet === 'prosent')
      .map((p) => ({ p, kurs: Math.max(0, ...p.konverteringer.map((k) => k.poengPerKrone ?? 0)) }))
      .filter((x) => x.kurs > 0)
      .sort((a, b) => b.kurs - a.kurs)[0] ?? null;
  const bonus = kilde ? (kilde.p.id.startsWith('klarna') ? 'Klarna-cashback' : `${kilde.p.kortnavn}-bonus`) : '';
  const verdiOre = oreVerdi(tall('kontant'), tall('poeng'), tall('avgifter'));
  const sparer = Math.max(0, tall('kontant') - tall('avgifter'));
  const somPenger = kilde ? tall('poeng') / kilde.kurs : null;
  const bruk = somPenger !== null && sparer > somPenger;
  const skala = Math.max(1, sparer, somPenger ?? 0);

  return (
    <>
      <h1>{T('pengerTittel')}</h1>
      {/* Samme reise på to måter, slik flyselskapet viser den: prisen i kroner, eller poeng pluss skatter og avgifter. */}
      <div className="penger-valg">
        <div className="penger-side">
          <span className="etikett" id="penger-med-penger">
            {T('pengerMedPenger')}
          </span>
          <label className="penger-belop">
            <TallInput id="plan-kontant" aria-labelledby="penger-med-penger" verdi={felt.kontant} onEndre={(v) => sett('kontant', v)} />
            <span>kr</span>
          </label>
        </div>
        <div className="penger-side">
          <span className="etikett" id="penger-med-poeng">
            {T('pengerMedPoeng')}
          </span>
          <label className="penger-belop">
            <TallInput id="plan-poeng" aria-labelledby="penger-med-poeng" verdi={felt.poeng} onEndre={(v) => sett('poeng', v)} />
            <span>{T('planPoengEnhet')}</span>
          </label>
          <label className="penger-tillegg">
            <span aria-hidden="true">+</span>
            <TallInput id="plan-avgifter" aria-label={T('planAvgifter')} verdi={felt.avgifter} onEndre={(v) => sett('avgifter', v)} />
            <span>{T('pengerSkatter')}</span>
          </label>
        </div>
      </div>
      {kilde && verdiOre !== null && somPenger !== null && (
        <div className="penger-svar" aria-live="polite">
          <p className={`plan-dom${bruk ? ' god' : ''}`}>{bruk ? T('pengerBruk') : T('pengerBetal')}</p>
          {(
            [
              [T('pengerSparer'), sparer, bruk],
              [T('pengerSomPenger', { bonus }), somPenger, !bruk],
            ] as const
          ).map(([etikett, kr, vinner]) => (
            <div className="penger-rad" key={etikett}>
              <div className="plan-rad-topp">
                <span>{etikett}</span>
                <span className="plan-rad-tall">{fmtTall(Math.round(kr))} kr</span>
              </div>
              <div className="penger-bar">
                <span className={vinner ? 'vinner' : undefined} style={{ width: `${(kr / skala) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="muted plan-tekst">{T('pengerForklaring', { v: enDesimal(verdiOre), bonus, kurs: fmtTall(kilde.kurs), ore: enDesimal(100 / kilde.kurs) })}</p>
        </div>
      )}
      {samarbeid && (
        <p className="samarbeid">
          <a href={samarbeid.booking} target="_blank" rel="sponsored noopener">
            {T('brukPoengene', { navn: samarbeid.navn })} <span aria-hidden="true">→</span>
          </a>
        </p>
      )}
    </>
  );
}
