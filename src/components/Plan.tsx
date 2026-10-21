import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import hverdagJson from '../data/hverdag.json';
import type { Butikk, Kort, Land, Program, Samarbeidspartner } from '../data/types';
import { SPRAK, tekst } from '../i18n';
import { fmtPoeng, fmtTall, parseTall } from '../lib/format';
import { beregnOppsett, manederTil, oreVerdi, velgOppsett, type Oppsett } from '../lib/plan';

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

type Felt = 'netthandel' | 'dagligvare' | 'kortbruk' | 'har' | 'trenger' | 'kontant' | 'poeng' | 'avgifter';
const NOKKEL = 'pointmaxing.plan';
const STANDARD: Record<Felt, string> = { netthandel: '3000', dagligvare: '5000', kortbruk: '8000', har: '', trenger: '', kontant: '4500', poeng: '30000', avgifter: '900' };
const TILLATT = /^[\d\s.,]*$/;
// Skyveknappene: største verdi og steg per felt (kr i måneden).
const GLIDER: Partial<Record<Felt, { maks: number; steg: number }>> = {
  netthandel: { maks: 20_000, steg: 500 },
  dagligvare: { maks: 15_000, steg: 500 },
  kortbruk: { maks: 60_000, steg: 1_000 },
};
// Hvor poengene kommer fra, i stolpene. Programfargene er de samme som i historikkgrafen; Kortet (teal) står aldri
// ved siden av Klarna i en stolpe (med Klarna-kortet er kortpoengene Klarna), og er validert mot Trumf og SAS Shopping.
const DELER = [
  { id: 'trumf', farge: '#2a5bb8', nokkel: 'planDel_trumf' },
  { id: 'klarna', farge: '#d6457f', nokkel: 'planDel_klarna' },
  { id: 'sas', farge: '#a86a00', nokkel: 'planDel_sas' },
  { id: 'kort', farge: '#1a9a76', nokkel: 'planDel_kort' },
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
        <Penger programmer={programmer} samarbeid={samarbeid} T={T} tall={tall} tallfelt={tallfelt} />
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
          trumfKort: harTrumf && hverdag?.kort ? hverdag.kort : null,
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
  const kostnad = (o: Oppsett) => (o.kostnadAr > 0 ? T('planKostnad', { kr: fmtTall(Math.round(o.kostnadAr)) }) : T('planGratis'));

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
                {o.nivapoengAr > 0 && (
                  <>
                    {' · '}
                    <span className="plan-nivapoeng">{T('planNivapoeng', { n: fmtPoeng(o.nivapoengAr) })}</span>
                  </>
                )}
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
        <summary>{T('planAlle', { n: alle.length })}</summary>
        <ul className="plan-alle-liste">
          {alle.map((o) => (
            <li key={o.id}>
              <span>
                {navn(o)}
                <span className="muted">
                  {' · '}
                  {kostnad(o)}
                  {o.ore !== null && o.kostnadAr > 0 ? ` · ${T('planOre', { ore: enDesimal(o.ore) })}` : ''}
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
    </>
  );
}

/**
 * «Kjøp for penger eller poeng?»: det poengbilletten sparer deg i kroner, mot hva poengene er verdt som penger.
 * Trumf-bonus og Klarna-cashback kan tas ut som penger (trumf.no/automatisk-overforing-til-bankkonto,
 * klarna.com/se/kundservice/hur-tar-jag-ut-pengar-fran-min-klarna-saldo, klarna.com/dk/klarna-saldo); vekslingen som
 * gir flest poeng per krone setter prisen på et poeng.
 */
function Penger({ programmer, samarbeid, T, tall, tallfelt }: Felles & Pick<Props, 'programmer' | 'samarbeid'>) {
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
      <div className="plan-billett">
        {tallfelt('kontant', T('planKontant'), 'kr')}
        {tallfelt('poeng', T('planPoeng'), T('planPoengEnhet'))}
        {tallfelt('avgifter', T('planAvgifter'), 'kr')}
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
