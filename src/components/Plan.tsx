import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import hverdagJson from '../data/hverdag.json';
import type { Butikk, Kort, Land, Program, Samarbeidspartner } from '../data/types';
import { SPRAK, tekst } from '../i18n';
import { fmtPoeng, fmtTall, parseTall } from '../lib/format';
import { beregnOppsett, manederTil, oreVerdi, velgOppsett, type Oppsett } from '../lib/plan';

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
}

type Felt = 'netthandel' | 'dagligvare' | 'kortbruk' | 'har' | 'trenger' | 'kontant' | 'poeng' | 'avgifter';
const NOKKEL = 'pointmaxing.plan';
const STANDARD: Record<Felt, string> = { netthandel: '3000', dagligvare: '5000', kortbruk: '8000', har: '', trenger: '', kontant: '', poeng: '', avgifter: '' };
const TILLATT = /^[\d\s.,]*$/;
// Skyveknappene: største verdi og steg per felt (kr i måneden).
const GLIDER: Partial<Record<Felt, { maks: number; steg: number }>> = {
  netthandel: { maks: 20_000, steg: 500 },
  dagligvare: { maks: 15_000, steg: 500 },
  kortbruk: { maks: 60_000, steg: 1_000 },
};
// Delene av poengene i stolpene. Fargene er validert mot billetten (samme sett som historikkgrafen).
const DELER = [
  { id: 'netthandel', farge: '#d6457f', nokkel: 'planDel_netthandel' },
  { id: 'dagligvare', farge: '#a86a00', nokkel: 'planDel_dagligvare' },
  { id: 'kort', farge: '#2a5bb8', nokkel: 'planDel_kort' },
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

const HVERDAG = hverdagJson as Partial<Record<Land, { rader: { id: string; prosent: number }[]; kort?: { navn: string; prisPerMnd: number; dagligvare: number } }>>;
const FLY = 'M50 4 Q58 8 58 26 L58 40 L94 62 L94 71 L58 59 L58 78 L74 91 L74 97 L57 92 L50 95 L43 92 L26 97 L26 91 L42 78 L42 59 L6 71 L6 62 L42 40 L42 26 Q42 8 50 4 Z';

/** Planen: hva forbruket ditt gir av poeng på det meste, nesten like mye for mindre, mest for pengene og gratis – og når du har nok til reisen. */
export default function Plan({ land, programmer, butikker, kort, folger, kjente, idag, samarbeid }: Props) {
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
  const hverdag = HVERDAG[land];
  const harTrumf = programmer.some((p) => p.id === 'trumf') && Boolean(hverdag);

  const kurv = useMemo(() => {
    const ider = folger.length ? folger : kjente;
    return butikker.filter((b) => ider.includes(b.id));
  }, [butikker, folger, kjente]);

  const alle = useMemo(
    () =>
      beregnOppsett(
        {
          programmer,
          butikker: kurv,
          kort,
          dagligvareProsent: harTrumf ? (hverdag?.rader.find((r) => r.id === 'dagligvare')?.prosent ?? null) : null,
          trumfKort: harTrumf && hverdag?.kort ? hverdag.kort : null,
          idag,
        },
        { netthandel: tall('netthandel'), dagligvare: harTrumf ? tall('dagligvare') : 0, kortbruk: tall('kortbruk') },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [programmer, kurv, kort, idag, felt.netthandel, felt.dagligvare, felt.kortbruk, harTrumf],
  );
  const { flest, nesten, verdi, gratis } = velgOppsett(alle);
  const navn = (o: Oppsett) => [o.kortNavn, o.nivaNavn].filter(Boolean).join(' + ') || T('planUtenKort');

  // Stigen: flest poeng, nesten like mange for langt mindre, mest for pengene og gratis. Samme oppsett i flere roller blir én rad.
  const rader: { roller: string[]; o: Oppsett }[] = [];
  for (const [rolle, o] of [
    [T('planFlest'), flest],
    [T('planNesten'), nesten],
    [T('planVerdi'), verdi],
    [T('planGratisBest'), gratis],
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
  const mangler = Math.max(0, trenger - har);
  const manedFmt = new Intl.DateTimeFormat(SPRAK[land].locale, { month: 'long', year: 'numeric' });
  const reiseDato = (o: Oppsett) => {
    if (trenger <= 0 || mangler === 0) return null;
    const mnd = manederTil(mangler, o.poengAr);
    if (mnd === null) return null;
    const d = new Date(`${idag}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + mnd);
    return manedFmt.format(d);
  };

  const glider = (f: Felt, etikett: string) => {
    const g = GLIDER[f]!;
    const v = Math.min(g.maks, tall(f));
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
          max={g.maks}
          step={g.steg}
          value={v}
          aria-valuetext={`${fmtTall(v)} kr`}
          style={{ '--fyll': `${(v / g.maks) * 100}%` } as CSSProperties}
          onChange={(e) => sett(f, e.target.value)}
        />
      </div>
    );
  };

  const tallfelt = (f: Felt, etikett: string, enhet: string) => (
    <label className="plan-tallfelt" key={f}>
      <span className="etikett">{etikett}</span>
      <span className="tall">
        <input
          id={`plan-${f}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={felt[f] ? fmtTall(parseTall(felt[f])) : ''}
          onChange={(e) => {
            if (TILLATT.test(e.target.value)) sett(f, e.target.value.replace(/\s/g, ''));
          }}
        />
        <span className="enhet">{enhet}</span>
      </span>
    </label>
  );

  const kostnad = (o: Oppsett) => (o.kostnadAr > 0 ? T('planKostnad', { kr: fmtTall(Math.round(o.kostnadAr)) }) : T('planGratis'));
  const verdiOre = oreVerdi(tall('kontant'), tall('poeng'), tall('avgifter'));
  const referanse = verdi ?? flest;
  const refOre = referanse && referanse.kostnadAr > 0 ? referanse.ore : 0;
  const skalaMaks = Math.max(20, Math.ceil(((verdiOre ?? 0) * 1.25) / 5) * 5, Math.ceil(((refOre ?? 0) * 1.25) / 5) * 5);

  return (
    <section className="plan">
      <h1>{T('planTittel')}</h1>

      <div className="plan-forbruk">
        {glider('netthandel', T('planNetthandel'))}
        {harTrumf && glider('dagligvare', T('planDagligvare'))}
        {glider('kortbruk', T('planKortbruk'))}
      </div>

      <div className="plan-mal">
        {tallfelt('har', T('planHar'), T('planPoengEnhet'))}
        {tallfelt('trenger', T('planTrenger'), T('planPoengEnhet'))}
      </div>
      {trenger > 0 && mangler === 0 && <p className="plan-nok">{T('planNokAllerede')}</p>}

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
                {o.nivapoengAr > 0 && ` · ${T('planNivapoeng', { n: fmtPoeng(o.nivapoengAr) })}`}
                {dato && (
                  <>
                    {' · '}
                    <span className="plan-dato">
                      <svg className="plan-fly-ikon" viewBox="0 0 100 100" aria-hidden="true">
                        <path d={FLY} transform="rotate(90 50 50)" />
                      </svg>
                      {T('planReis', { dato })}
                    </span>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ol>

      <details className="plan-mer">
        <summary>{T('planBruk')}</summary>
        <div className="plan-billett">
          {tallfelt('kontant', T('planKontant'), 'kr')}
          {tallfelt('poeng', T('planPoeng'), T('planPoengEnhet'))}
          {tallfelt('avgifter', T('planAvgifter'), 'kr')}
        </div>
        {verdiOre !== null && (
          <div className="plan-skala">
            <p className={`plan-dom ${refOre !== null && verdiOre >= refOre ? 'god' : 'darlig'}`}>
              {refOre !== null && verdiOre >= refOre ? T('planDomGod') : T('planDomDarlig')}
            </p>
            <div className="plan-skala-linje" aria-hidden="true">
              {refOre !== null && refOre > 0 && (
                <span className="plan-merke-ref" style={{ left: `${(refOre / skalaMaks) * 100}%` }}>
                  <span>{T('planKosterDeg', { ore: fmtTall(Math.round(refOre * 10) / 10) })}</span>
                </span>
              )}
              <span className="plan-merke-verdi" style={{ left: `${Math.min(1, verdiOre / skalaMaks) * 100}%` }}>
                <span>{T('planDenneBilletten', { ore: fmtTall(Math.round(verdiOre * 10) / 10) })}</span>
              </span>
            </div>
            <div className="plan-skala-ender">
              <span>0 øre</span>
              <span>{skalaMaks} øre</span>
            </div>
            <p className="muted plan-tekst">
              {T('planVerdiPer', { v: fmtTall(Math.round(verdiOre * 10) / 10) })}{' '}
              {refOre ? T(verdiOre >= refOre ? 'planGodBruk' : 'planDarligBruk', { ore: fmtTall(Math.round(refOre * 10) / 10) }) : T('planGratisPoeng')}
            </p>
          </div>
        )}
        {samarbeid && (
          <p className="samarbeid">
            <a href={samarbeid.booking} target="_blank" rel="sponsored noopener">
              {T('brukPoengene', { navn: samarbeid.navn })} <span aria-hidden="true">→</span>
            </a>
          </p>
        )}
      </details>

      <details className="plan-mer">
        <summary>{T('planAlle', { n: Math.min(alle.length, 15) })}</summary>
        <ul className="plan-alle-liste">
          {alle.slice(0, 15).map((o) => (
            <li key={o.id}>
              <span>
                {navn(o)}
                <span className="muted">
                  {' · '}
                  {kostnad(o)}
                  {o.ore !== null && o.kostnadAr > 0 ? ` · ${T('planOre', { ore: fmtTall(Math.round(o.ore * 10) / 10) })}` : ''}
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
          {harTrumf ? ` ${T('planSlikTrumf')}` : ''} {T('planAmex')}
        </p>
      </details>
    </section>
  );
}
