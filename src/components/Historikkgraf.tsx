import { useEffect, useMemo, useRef, useState } from 'react';
import type { ButikkSats, Land, Maling, Program } from '../data/types';
import { SPRAK, tekst } from '../i18n';
import { fmtPer100, fmtTall } from '../lib/format';

// Grafens farger, validert mot billetten (#faf7f0) med dataviz-validatoren: alle par skilles også ved fargeblindhet.
// Programmenes merkefarger brukes ikke her – Trumf og SAS er begge mørkeblå og blir like som linjer.
const FARGE: Record<string, string> = { Trumf: '#2a5bb8', Klarna: '#d6457f', 'SAS Shopping': '#a86a00' };

interface Props {
  land: Land;
  programmer: Program[];
  historikk: Record<string, Maling[]> | undefined;
  idag: string;
  /** Poeng per 100 kr med brukerens oppsett – samme regning som kolonnene. */
  per100: (program: Program, sats: ButikkSats) => number | null;
}

interface Punkt {
  t: number;
  dato: string;
  sats: number | null;
  verdi: number | null;
}
interface Serie {
  p: Program;
  farge: string;
  punkter: Punkt[];
}

const DAG = 86_400_000;
const tid = (d: string) => Date.parse(`${d}T00:00:00Z`);
const PERIODER = [
  { dager: 90, nokkel: 'periode3' },
  { dager: 365, nokkel: 'periode12' },
] as const;
const H = 200;
const M = { topp: 10, hoyre: 12, bunn: 26, venstre: 40 };

/** Pen skala: 3–5 linjer i runde steg. */
function skala(maks: number) {
  if (maks <= 0) return { topp: 1, steg: 1 };
  const grovt = maks / 4;
  const mag = 10 ** Math.floor(Math.log10(grovt));
  const steg = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= grovt) ?? 10 * mag;
  return { topp: Math.ceil(maks / steg) * steg, steg };
}

/** Siste måling på eller før t. */
const vedTid = (s: Serie, t: number) => {
  let funnet: Punkt | null = null;
  for (const pt of s.punkter) {
    if (pt.t > t) break;
    funnet = pt;
  }
  return funnet;
};

/** Satsen per program over tid, som poeng per 100 kr – som prishistorikken på Prisjakt, med trapper fordi satsen holder til neste endring. */
export default function Historikkgraf({ land, programmer, historikk, idag, per100 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [bredde, setBredde] = useState(600);
  const [periode, setPeriode] = useState<number | null>(null);
  const [peker, setPeker] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBredde(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const serier = useMemo<Serie[]>(
    () =>
      programmer
        .filter((p) => historikk?.[p.id]?.length)
        .map((p) => ({
          p,
          farge: FARGE[p.kortnavn] ?? p.farge,
          punkter: historikk![p.id].map(([dato, sats]) => ({ t: tid(dato), dato, sats, verdi: sats === null ? null : per100(p, { verdi: sats, kilde: '' }) })),
        })),
    [programmer, historikk, per100],
  );
  if (!serier.length) return null;

  const datoFmt = new Intl.DateTimeFormat(SPRAK[land].locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const kortDato = (t: number) => datoFmt.format(new Date(t)).replace(/\.$/, '');
  const satsTekst = (p: Program, v: number) => (p.satsEnhet === 'prosent' ? `${fmtTall(v)} %` : `${fmtTall(v)} p`);

  const tIdag = tid(idag);
  const forste = Math.min(...serier.map((s) => s.punkter[0].t));
  const valg = PERIODER.filter((x) => (tIdag - forste) / DAG > x.dager);
  const t0 = periode ? Math.max(forste, tIdag - periode * DAG) : forste;
  const t1 = Math.max(tIdag, t0 + DAG);

  // Verdiene som vises i perioden: den som gjaldt ved start, og alle målinger etter.
  const maks = Math.max(0, ...serier.flatMap((s) => [vedTid(s, t0)?.verdi ?? 0, ...s.punkter.filter((pt) => pt.t > t0).map((pt) => pt.verdi ?? 0)]));
  const { topp, steg } = skala(maks * 1.08);
  const pb = bredde - M.venstre - M.hoyre;
  const ph = H - M.topp - M.bunn;
  const x = (t: number) => M.venstre + ((t - t0) / (t1 - t0)) * pb;
  const y = (v: number) => M.topp + ph - (v / topp) * ph;

  // Trappesti for én serie i perioden; null bryter linjen.
  const sti = (s: Serie) => {
    let d = '';
    let naa: number | null = vedTid(s, t0)?.verdi ?? null;
    if (naa !== null) d += `M${x(t0).toFixed(1)},${y(naa).toFixed(1)}`;
    for (const pt of s.punkter) {
      if (pt.t <= t0) continue;
      if (naa !== null) d += ` H${x(pt.t).toFixed(1)}`;
      if (pt.verdi === null) {
        naa = null;
        continue;
      }
      d += naa === null ? ` M${x(pt.t).toFixed(1)},${y(pt.verdi).toFixed(1)}` : ` V${y(pt.verdi).toFixed(1)}`;
      naa = pt.verdi;
    }
    if (naa !== null) d += ` H${x(t1).toFixed(1)}`;
    return d;
  };

  // Høyeste i perioden, med program og dato.
  let hoyeste: { s: Serie; pt: Punkt } | null = null;
  for (const s of serier) {
    for (const pt of s.punkter) {
      const gjelder = pt.t >= t0 || vedTid(s, t0) === pt;
      if (gjelder && pt.verdi !== null && (!hoyeste || pt.verdi > (hoyeste.pt.verdi ?? 0))) hoyeste = { s, pt };
    }
  }

  const fraPeker = (klientX: number, rect: DOMRect) => {
    if (!rect.width) return null;
    const px = ((klientX - rect.left) / rect.width) * bredde;
    const t = t0 + ((px - M.venstre) / pb) * (t1 - t0);
    return Math.min(t1, Math.max(t0, Math.round(t / DAG) * DAG));
  };
  const rader = peker === null ? [] : serier.map((s) => ({ s, pt: vedTid(s, peker) })).filter((r) => r.pt).sort((a, c) => (c.pt!.verdi ?? -1) - (a.pt!.verdi ?? -1));
  const pekerX = peker === null ? 0 : x(peker);

  // Endringer, nyeste først: satsendringer, ute av programmet og tilbake igjen.
  const endringer = serier
    .flatMap((s) =>
      s.punkter.slice(1).map((pt, i) => {
        const fra = s.punkter[i].sats;
        const tekstFor =
          pt.sats === null
            ? tekst(land, 'ikkeLengerMed', { program: s.p.kortnavn })
            : fra === null
              ? tekst(land, 'medIgjen', { program: s.p.kortnavn, sats: satsTekst(s.p, pt.sats) })
              : `${s.p.kortnavn}: ${satsTekst(s.p, fra)} → ${satsTekst(s.p, pt.sats)}`;
        return { t: pt.t, nokkel: `${s.p.id}-${pt.dato}`, farge: s.farge, tekst: tekstFor };
      }),
    )
    .sort((a, c) => c.t - a.t);

  return (
    <section className="graf" ref={ref}>
      <div className="graf-topp">
        <h2 className="etikett">{tekst(land, 'historikkTittel')}</h2>
        {valg.length > 0 && (
          <div className="graf-perioder">
            {valg.map((v) => (
              <button key={v.dager} type="button" aria-pressed={periode === v.dager} onClick={() => setPeriode(v.dager)}>
                {tekst(land, v.nokkel)}
              </button>
            ))}
            <button type="button" aria-pressed={periode === null} onClick={() => setPeriode(null)}>
              {tekst(land, 'periodeAlt')}
            </button>
          </div>
        )}
      </div>
      {hoyeste && (
        <p className="graf-sammendrag">
          {tekst(land, 'hoyesteSidenDato', { dato: kortDato(t0), verdi: fmtPer100(hoyeste.pt.verdi ?? 0), program: hoyeste.s.p.kortnavn, naar: hoyeste.pt.t > t0 ? ` (${kortDato(hoyeste.pt.t)})` : '' })}
        </p>
      )}

      <div className="graf-flate">
        <svg
          viewBox={`0 0 ${bredde} ${H}`}
          width={bredde}
          height={H}
          role="img"
          aria-label={tekst(land, 'historikkTittel')}
          tabIndex={0}
          onPointerMove={(e) => setPeker(fraPeker(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerDown={(e) => setPeker(fraPeker(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setPeker(null)}
          onBlur={() => setPeker(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              const fra = peker ?? t1;
              setPeker(Math.min(t1, Math.max(t0, fra + (e.key === 'ArrowLeft' ? -DAG : DAG))));
            } else if (e.key === 'Escape') setPeker(null);
          }}
        >
          {Array.from({ length: Math.round(topp / steg) + 1 }, (_, i) => i * steg).map((v) => (
            <g key={v}>
              <line x1={M.venstre} x2={bredde - M.hoyre} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
              <text x={M.venstre - 6} y={y(v) + 4} textAnchor="end" className="graf-akse">
                {fmtTall(v)}
              </text>
            </g>
          ))}
          <text x={M.venstre} y={H - 6} className="graf-akse">
            {kortDato(t0)}
          </text>
          {pb > 300 && (
            <text x={M.venstre + pb / 2} y={H - 6} textAnchor="middle" className="graf-akse">
              {kortDato(t0 + (t1 - t0) / 2)}
            </text>
          )}
          <text x={bredde - M.hoyre} y={H - 6} textAnchor="end" className="graf-akse">
            {kortDato(t1)}
          </text>

          {serier.map((s) => (
            <path key={s.p.id} d={sti(s)} fill="none" stroke={s.farge} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {serier.map((s) => {
            const siste = s.punkter[s.punkter.length - 1].verdi;
            return siste === null ? null : <circle key={s.p.id} cx={x(t1)} cy={y(siste)} r="4" fill={s.farge} stroke="var(--paper)" strokeWidth="2" />;
          })}

          {peker !== null && (
            <g>
              <line x1={pekerX} x2={pekerX} y1={M.topp} y2={M.topp + ph} stroke="var(--mute)" strokeWidth="1" />
              {rader.map(({ s, pt }) => (pt!.verdi === null ? null : <circle key={s.p.id} cx={pekerX} cy={y(pt!.verdi)} r="4" fill={s.farge} stroke="var(--paper)" strokeWidth="2" />))}
            </g>
          )}
        </svg>

        {peker !== null && rader.length > 0 && (
          <div className="graf-tips" style={pekerX > bredde / 2 ? { right: bredde - pekerX + 12 } : { left: pekerX + 12 }}>
            <div className="graf-tips-dato">{kortDato(peker)}</div>
            {rader.map(({ s, pt }) => (
              <div key={s.p.id} className="graf-tips-rad">
                <i style={{ background: s.farge }} />
                {pt!.verdi === null ? (
                  <span>
                    {s.p.kortnavn} · {tekst(land, 'ikkeMed')}
                  </span>
                ) : (
                  <span>
                    <strong>{fmtPer100(pt!.verdi)}</strong> {s.p.kortnavn} · {satsTekst(s.p, pt!.sats!)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ul className="graf-forklaring">
        {serier.map((s) => {
          const siste = s.punkter[s.punkter.length - 1];
          return (
            <li key={s.p.id}>
              <i style={{ background: s.farge }} />
              {s.p.kortnavn}
              <span>{siste.verdi === null ? tekst(land, 'ikkeMed') : `${fmtPer100(siste.verdi)} p/100 · ${satsTekst(s.p, siste.sats!)}`}</span>
            </li>
          );
        })}
      </ul>
      <p className="graf-merknad">{tekst(land, 'grafEnhet')}</p>

      {endringer.length > 0 && (
        <details className="graf-endringer">
          <summary>{tekst(land, 'endringerAntall', { n: endringer.length })}</summary>
          <ul>
            {endringer.map((e) => (
              <li key={e.nokkel}>
                <span className="graf-endring-dato">{kortDato(e.t)}</span>
                <i style={{ background: e.farge }} />
                {e.tekst}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
