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
  /** Kortet og Klarna-nivået valgt i kortvelgeren, for «Ditt oppsett nå». */
  mittKortId: string;
  mittNivaId: string | null;
  samarbeid: Samarbeidspartner | null;
}

type Felt = 'netthandel' | 'dagligvare' | 'kortbruk' | 'har' | 'trenger' | 'nivaMangler' | 'kontant' | 'poeng' | 'avgifter';
const NOKKEL = 'pointmaxing.plan';
const STANDARD: Record<Felt, string> = { netthandel: '3000', dagligvare: '5000', kortbruk: '8000', har: '', trenger: '', nivaMangler: '', kontant: '', poeng: '', avgifter: '' };
const TILLATT = /^[\d\s.,]*$/;
const MAL = [30_000, 60_000, 100_000];
// Skyveknappene: største verdi og steg per felt (kr i måneden).
const GLIDER: Partial<Record<Felt, { maks: number; steg: number }>> = {
  netthandel: { maks: 20_000, steg: 500 },
  dagligvare: { maks: 15_000, steg: 500 },
  kortbruk: { maks: 60_000, steg: 1_000 },
};
// Delene av poengene i stolpen øverst. Fargene er validert mot billetten (samme sett som historikkgrafen).
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

const HVERDAG = hverdagJson as Partial<Record<Land, { rader: { id: string; prosent: number }[]; kort?: { navn: string; prisPerMnd: number; dagligvare: number } }>>;
const FLY = 'M50 4 Q58 8 58 26 L58 40 L94 62 L94 71 L58 59 L58 78 L74 91 L74 97 L57 92 L50 95 L43 92 L26 97 L26 91 L42 78 L42 59 L6 71 L6 62 L42 40 L42 26 Q42 8 50 4 Z';

/** Planen: hvor mange poeng forbruket ditt kan gi, hvilket oppsett som gir mest, når du når målet, og hva poengene er verdt. */
export default function Plan({ land, programmer, butikker, kort, folger, kjente, idag, mittKortId, mittNivaId, samarbeid }: Props) {
  const [felt, setFelt] = useState(lesLagret);
  const [valgtId, setValgtId] = useState<string | null>(null);
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
  const { flest, verdi, gratis } = velgOppsett(alle);
  const klarna = programmer.find((p) => p.nivaer.some((n) => n.id === 'max'));
  const mittKort = klarna && mittKortId === `${klarna.id}-kort` ? `${klarna.id}-kort-${mittNivaId}` : mittKortId;
  const ditt = alle.find((o) => o.id === `${mittNivaId && mittNivaId !== 'ingen' ? mittNivaId : 'ingen'}|${mittKort || 'ingen'}`) ?? null;
  const valgt = alle.find((o) => o.id === valgtId) ?? flest;

  // Radene som sammenlignes: hver med sin rolle, uten doble.
  const rader: { merke: string; o: Oppsett }[] = [];
  for (const [merke, o] of [
    [T('planFlest'), flest],
    [T('planVerdi'), verdi],
    [T('planGratisBest'), gratis],
    [T('planDitt'), ditt],
  ] as const) {
    if (o && !rader.some((r) => r.o.id === o.id)) rader.push({ merke, o });
  }
  const maksPoeng = Math.max(1, ...rader.map((r) => r.o.poengAr));

  const poengVist = useGlid(valgt?.poengAr ?? 0);
  const manedFmt = new Intl.DateTimeFormat(SPRAK[land].locale, { month: 'long', year: 'numeric' });
  const omMnd = (n: number) => {
    const d = new Date(`${idag}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    return manedFmt.format(d);
  };
  const har = tall('har');
  const trenger = tall('trenger');
  const mnd = valgt && trenger > 0 ? manederTil(Math.max(0, trenger - har), valgt.poengAr) : null;
  const nivaMangler = tall('nivaMangler');
  const nivaMnd = valgt && nivaMangler > 0 ? manederTil(nivaMangler, valgt.nivapoengAr) : null;

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

  const verdiOre = oreVerdi(tall('kontant'), tall('poeng'), tall('avgifter'));
  const referanse = ditt ?? verdi ?? flest;
  const refOre = referanse && referanse.kostnadAr > 0 ? referanse.ore : 0;
  const skalaMaks = Math.max(20, Math.ceil(((verdiOre ?? 0) * 1.25) / 5) * 5, Math.ceil(((refOre ?? 0) * 1.25) / 5) * 5);
  const progresjon = trenger > 0 ? Math.min(1, har / trenger) : 0;

  return (
    <section className="plan">
      <span className="etikett">{T('navPlan')}</span>
      <h1>{T('planTittel')}</h1>

      {valgt && (
        <div className="plan-hero" aria-live="polite">
          <div className="plan-stort">{fmtPoeng(poengVist)}</div>
          <div className="plan-stort-under">{T('planPoengArLang')}</div>
          <div className="plan-oppsett">
            {valgt.kortNavn ?? T('planUtenKort')}
            {valgt.nivaNavn ? ` + ${valgt.nivaNavn}` : ''}
            <span className="muted">
              {' · '}
              {valgt.kostnadAr > 0 ? T('planKostnad', { kr: fmtTall(Math.round(valgt.kostnadAr)) }) : T('planGratis')}
              {valgt.nivapoengAr > 0 ? ` · ${T('planNivapoeng', { n: fmtPoeng(valgt.nivapoengAr) })}` : ''}
            </span>
          </div>
          {valgt.poengAr > 0 && (
            <>
              <div className="plan-stabel" role="img" aria-label={DELER.map((d) => `${T(d.nokkel)} ${fmtPoeng(valgt.deler[d.id])}`).join(', ')}>
                {DELER.filter((d) => valgt.deler[d.id] > 0).map((d) => (
                  <span key={d.id} style={{ width: `${(valgt.deler[d.id] / valgt.poengAr) * 100}%`, background: d.farge }} />
                ))}
              </div>
              <ul className="plan-forklaring">
                {DELER.filter((d) => valgt.deler[d.id] > 0).map((d) => (
                  <li key={d.id}>
                    <i style={{ background: d.farge }} />
                    {T(d.nokkel)} <span>{fmtPoeng(valgt.deler[d.id])}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Målet som en flyrute: flyet står der du er i dag, landingen er måneden du når målet. */}
          <div className="plan-reise">
            <div className="plan-rute" aria-hidden="true">
              <span className="plan-rute-fylt" style={{ width: `${progresjon * 100}%` }} />
              <svg className="plan-fly" viewBox="0 0 100 100" style={{ left: `${progresjon * 100}%` }}>
                <path d={FLY} transform="rotate(90 50 50)" />
              </svg>
              <span className="plan-rute-mal" />
            </div>
            <div className="plan-rute-ender">
              {tallfelt('har', T('planIDag'), T('planPoengEnhet'))}
              {tallfelt('trenger', T('planMalKort'), T('planPoengEnhet'))}
            </div>
            {trenger > 0 ? (
              <p className="plan-landing">{mnd === 0 ? T('planNokAllerede') : mnd !== null ? T('planLanding', { dato: omMnd(mnd), n: mnd }) : T('planIkkePoeng')}</p>
            ) : (
              <p className="plan-landing muted">
                {T('planVelgMal')}{' '}
                {MAL.map((m, i) => (
                  <span key={m}>
                    {i > 0 ? ' · ' : ''}
                    <button type="button" className="lenke" onClick={() => sett('trenger', String(m))}>
                      {fmtPoeng(m)}
                    </button>
                  </span>
                ))}
              </p>
            )}
            <div className="plan-niva">
              {tallfelt('nivaMangler', T('planNivaMangler'), T('planNivaEnhet'))}
              {nivaMangler > 0 && (
                <span className="muted">{nivaMnd !== null && nivaMnd <= 12 ? T('planNivaOm', { n: nivaMnd, dato: omMnd(nivaMnd) }) : T('planNivaIkke')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <h2 className="etikett">{T('planForbruk')}</h2>
      {glider('netthandel', T('planNetthandel'))}
      {harTrumf && glider('dagligvare', T('planDagligvare'))}
      {glider('kortbruk', T('planKortbruk'))}

      <h2 className="etikett">{T('planSammenlign')}</h2>
      <ul className="plan-sammenlign">
        {rader.map(({ merke, o }) => {
          const aktiv = o.id === valgt?.id;
          return (
            <li key={o.id}>
              <button type="button" aria-pressed={aktiv} className={aktiv ? 'aktiv' : undefined} onClick={() => setValgtId(o.id)}>
                <span className="plan-merke">{merke}</span>
                <span className="plan-rad-topp">
                  <span className="plan-navn">
                    {o.kortNavn ?? T('planUtenKort')}
                    {o.nivaNavn ? ` + ${o.nivaNavn}` : ''}
                  </span>
                  <span className="plan-rad-tall">{fmtPoeng(o.poengAr)}</span>
                </span>
                <span className="plan-bar">
                  <span style={{ width: `${(o.poengAr / maksPoeng) * 100}%` }} />
                </span>
                <span className="muted">
                  {o.kostnadAr > 0 ? T('planKostnad', { kr: fmtTall(Math.round(o.kostnadAr)) }) : T('planGratis')}
                  {o.ore !== null && o.kostnadAr > 0 ? ` · ${T('planOre', { ore: fmtTall(Math.round(o.ore * 10) / 10) })}` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <details className="plan-alle">
        <summary>{T('planAlle', { n: Math.min(alle.length, 15) })}</summary>
        <ul className="plan-sammenlign kompakt">
          {alle.slice(0, 15).map((o, i) => (
            <li key={o.id}>
              <button type="button" aria-pressed={o.id === valgt?.id} className={o.id === valgt?.id ? 'aktiv' : undefined} onClick={() => setValgtId(o.id)}>
                <span className="plan-rad-topp">
                  <span className="plan-navn">
                    {i + 1}. {o.kortNavn ?? T('planUtenKort')}
                    {o.nivaNavn ? ` + ${o.nivaNavn}` : ''}
                  </span>
                  <span className="plan-rad-tall">{fmtPoeng(o.poengAr)}</span>
                </span>
                <span className="muted">
                  {o.kostnadAr > 0 ? T('planKostnad', { kr: fmtTall(Math.round(o.kostnadAr)) }) : T('planGratis')}
                  {o.ore !== null && o.kostnadAr > 0 ? ` · ${T('planOre', { ore: fmtTall(Math.round(o.ore * 10) / 10) })}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>

      <h2 className="etikett">{T('planBruk')}</h2>
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

      <details className="plan-alle">
        <summary>{T('planSlikTittel')}</summary>
        <p className="graf-merknad">
          {T('planSlik', { butikker: folger.length ? T('planFulgte', { n: kurv.length }) : T('planKjente', { n: kurv.length }) })}
          {harTrumf ? ` ${T('planSlikTrumf')}` : ''} {T('planAmex')}
        </p>
      </details>
    </section>
  );
}
