import { useEffect, useMemo, useState } from 'react';
import Butikkliste from './components/Butikkliste';
import ButikkSok from './components/ButikkSok';
import ProgramKolonne, { type RadTilstand } from './components/ProgramKolonne';
import { hentData, LAND } from './data';
import type { Butikk, ButikkSats, Kort, Land, Niva, Program } from './data/types';
import { gjeldendeSats } from './lib/butikker';
import { beregnAlle, beregnProgram, butikkProsent, effektivProsent, type ProgramValg, type Resultat } from './lib/calc';
import { fmtDato, fmtKr, fmtPoeng, fmtProsent, fmtTall, parseTall } from './lib/format';

const data = hentData();
const NOKKEL = 'poengtjeneren.v6';
const INGEN = 'ingen';
const ANNET = 'annet';
const TILLATT = /^[\d\s.,]*$/;
const IDAG = new Date().toISOString().slice(0, 10);

interface Tilstand {
  land: Land;
  belop: string;
  butikk: string;
  butikkId: string | null;
  kortId: string;
  egenKortPoeng: string;
  rader: Record<string, RadTilstand>;
}

/** Butikkens grunnsats som feltet starter med. */
const STANDARD_SATS: Record<string, number> = { trumf: 5, klarna: 3, 'klarna-se': 3, 'klarna-dk': 3 };

const nivaFor = (p: Program, valgId: string): Niva | undefined => p.nivaer.find((n) => n.id === valgId);

/** Tall til feltet: «13,5», uten tusenskille. */
const tilFelt = (n: number): string => fmtTall(n).replace(/\s/g, '');

/** Standardkortet i et land: programmets eget kort (Klarna-kortet) hvis det finnes. */
const standardKort = (land: Land): string => {
  const p = data.programmer.find((x) => x.land === land && x.kort);
  return p ? `${p.id}-kort` : INGEN;
};

/**
 * Programmets eget kort (Klarna-kortet): nivåets tillegg på alle kjøp, vekslet med
 * programmets sats. Satsen følger nivået som er valgt for programmet.
 */
function kortForProgram(p: Program, valgId: string): Kort | null {
  const konv = p.konverteringer[0];
  const niva = nivaFor(p, valgId);
  if (!p.kort || !konv || !niva) return null;
  const aktivt = niva.kanVeksle !== false && konv.poengPerKrone !== null;
  return {
    id: `${p.id}-kort`,
    land: [p.land],
    navn: p.kort.navn,
    utsteder: p.navn,
    poengPer100: aktivt ? niva.ekstraProsent * (konv.poengPerKrone ?? 0) : 0,
    pris: aktivt ? `${niva.prisPerMnd} kr/mnd` : '',
    status: konv.status,
    kilde: p.kort.kilde,
    sistVerifisert: konv.sistVerifisert,
    merknad: konv.status === 'uverifisert' ? konv.merknad : p.kort.merknad,
  };
}

/**
 * Det som skal stå i feltet for en butikksats. For programmer med nivå (Klarna)
 * viser feltet satsen ferdig regnet med abonnementet – 3 % blir 13,5 % med Max.
 */
function feltVerdi(p: Program, grunnsats: number | null, niva: Niva | undefined): string {
  if (p.nivaer.length === 0) return grunnsats === null ? '' : tilFelt(grunnsats);
  if (niva?.kanVeksle === false) return grunnsats === null ? '' : tilFelt(grunnsats);
  return tilFelt(effektivProsent(grunnsats ?? 0, niva));
}

function standard(): Tilstand {
  const rader: Record<string, RadTilstand> = {};
  for (const p of data.programmer) {
    const valgId = p.standardNiva ?? p.nivaer[0]?.id ?? p.konverteringer[0]?.id ?? '';
    rader[p.id] = { sats: feltVerdi(p, STANDARD_SATS[p.id] ?? null, nivaFor(p, valgId)), valgId };
  }
  return { land: 'NO', belop: '1000', butikk: '', butikkId: null, kortId: standardKort('NO'), egenKortPoeng: '', rader };
}

function les(): Tilstand {
  const std = standard();
  try {
    const lagret = localStorage.getItem(NOKKEL);
    if (!lagret) return std;
    const p = JSON.parse(lagret) as Partial<Tilstand>;
    const rader: Record<string, RadTilstand> = {};
    for (const id of Object.keys(std.rader)) rader[id] = { ...std.rader[id], ...(p.rader?.[id] ?? {}) };
    return {
      land: LAND.includes(p.land as Land) ? (p.land as Land) : std.land,
      belop: typeof p.belop === 'string' ? p.belop : std.belop,
      butikk: typeof p.butikk === 'string' ? p.butikk : '',
      butikkId: typeof p.butikkId === 'string' ? p.butikkId : null,
      kortId: typeof p.kortId === 'string' ? p.kortId : std.kortId,
      egenKortPoeng: typeof p.egenKortPoeng === 'string' ? p.egenKortPoeng : '',
      rader,
    };
  } catch {
    return std;
  }
}

/** Ny tilstand med endret sats og/eller nivå for ett program; feltet regnes om når nivået byttes. */
function endreRad(s: Tilstand, p: Program, endring: Partial<RadTilstand>): Tilstand {
  const rad = s.rader[p.id];
  let sats = endring.sats ?? rad.sats;
  if (endring.valgId !== undefined && p.nivaer.length > 0 && endring.valgId !== rad.valgId) {
    const fra = nivaFor(p, rad.valgId);
    const til = nivaFor(p, endring.valgId);
    const grunn = rad.sats.trim() === '' ? 0 : fra?.kanVeksle === false ? parseTall(rad.sats) : butikkProsent(parseTall(rad.sats), fra);
    sats = feltVerdi(p, grunn, til);
  }
  return { ...s, rader: { ...s.rader, [p.id]: { ...rad, ...endring, sats } } };
}

/** Én setning som viser hvordan tallet ble til. */
function utregning(r: Resultat, kort: Kort | null): string {
  const deler: string[] = [];
  const { program } = r;
  if (r.opptjentKr !== null && r.poengPerKrone !== null) {
    const faktor = r.butikkFaktor > 1 ? ` × ${fmtTall(r.butikkFaktor)}` : '';
    const sats = r.niva
      ? `${fmtProsent(r.butikkSats)}${faktor} + ${fmtProsent(r.nivaProsent)} ${r.niva.navn} = ${fmtProsent(r.effektivSats)}`
      : fmtProsent(r.butikkSats);
    if (program.internPoeng) {
      const poeng = r.opptjentKr * program.internPoeng.perKrone;
      deler.push(`${sats} = ${fmtPoeng(poeng)} ${program.internPoeng.navn} × ${fmtTall(r.poengPerKrone)} per ${program.internPoeng.perKrone} = ${fmtPoeng(r.programPoeng)} EuroBonus-poeng`);
    } else {
      deler.push(`${sats} = ${fmtKr(r.opptjentKr)} × ${fmtTall(r.poengPerKrone)} = ${fmtPoeng(r.programPoeng)} poeng`);
    }
  } else {
    deler.push(`${fmtTall(r.effektivSats)} poeng per 100 kr = ${fmtPoeng(r.programPoeng)} poeng`);
  }
  if (kort) {
    if (program.kortlag) deler.push(`+ ${fmtPoeng(r.kortPoeng)} fra ${kort.navn}`);
    else if (kort.id === `${program.id}-kort`) deler.push('medlemscashbacken fra kortet er allerede regnet inn');
    else deler.push(`kortet gir ikke poeng når du betaler via ${program.kortnavn}`);
  }
  return deler.join(' · ');
}

export default function App() {
  const [t, setT] = useState<Tilstand>(les);
  const [apen, setApen] = useState<string | null>(null);
  const [visKatalog, setVisKatalog] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(NOKKEL, JSON.stringify(t));
    } catch {
      /* lagring er bare en bekvemmelighet */
    }
  }, [t]);

  // Alt under gjelder valgt land.
  const programmer = useMemo(() => data.programmer.filter((p) => p.land === t.land), [t.land]);
  const kortListe = useMemo(() => data.kort.filter((k) => k.land.includes(t.land)), [t.land]);
  const butikker = data.butikker[t.land];

  const belop = parseTall(t.belop);
  const butikk = t.butikkId ? (butikker.find((b) => b.id === t.butikkId) ?? null) : null;

  const programKortListe = useMemo(
    () => programmer.map((p) => kortForProgram(p, t.rader[p.id].valgId)).filter((k): k is Kort => k !== null),
    [programmer, t.rader],
  );

  const kort: Kort | null = useMemo(() => {
    if (t.kortId === INGEN) return null;
    if (t.kortId === ANNET) {
      return { id: ANNET, land: LAND, navn: 'eget kort', utsteder: '', poengPer100: parseTall(t.egenKortPoeng), pris: '', status: 'uverifisert', kilde: '', sistVerifisert: '' };
    }
    return kortListe.find((k) => k.id === t.kortId) ?? programKortListe.find((k) => k.id === t.kortId) ?? null;
  }, [t.kortId, t.egenKortPoeng, kortListe, programKortListe]);

  const resultater = useMemo(() => {
    const valg: ProgramValg[] = programmer.map((p) => {
      const rad = t.rader[p.id];
      const niva = nivaFor(p, rad.valgId);
      // Feltet viser satsen ferdig regnet med nivået. Tomt felt med Klarna Max gir likevel 1,5 %.
      const harNiva = niva !== undefined && niva.kanVeksle !== false;
      const sats = rad.sats.trim() === '' && harNiva ? niva.ekstraProsent : parseTall(rad.sats);
      const satsKjent = p.konverteringer.length === 0 || p.konverteringer.some((k) => k.poengPerKrone !== null);
      return {
        programId: p.id,
        aktiv: niva?.kanVeksle !== false && satsKjent && sats > 0,
        sats,
        satsErEffektiv: harNiva,
        nivaId: p.nivaer.length > 0 ? rad.valgId : undefined,
        konverteringId: p.nivaer.length === 0 ? rad.valgId : undefined,
      };
    });
    return beregnAlle(programmer, valg, belop, kort);
  }, [programmer, t.rader, belop, kort]);

  const [beste, nest] = belop > 0 ? resultater : [];
  const diff = beste && nest ? beste.total - nest.total : 0;
  const apent = resultater.find((r) => r.program.id === apen) ?? null;

  const feltForButikk = (p: Program, sats: ButikkSats | undefined, valgId: string) =>
    feltVerdi(p, sats ? gjeldendeSats(sats, IDAG).verdi : null, nivaFor(p, valgId));

  const velgButikk = (b: Butikk) => {
    setT((s) => {
      const rader = { ...s.rader };
      for (const p of programmer) rader[p.id] = { ...rader[p.id], sats: feltForButikk(p, b.satser[p.id], rader[p.id].valgId) };
      return { ...s, butikk: b.navn, butikkId: b.id, rader };
    });
  };

  /** Bytter land: nullstiller butikk, og kort som ikke finnes i det nye landet. */
  const velgLand = (land: Land) =>
    setT((s) => {
      const finnes = s.kortId === INGEN || s.kortId === ANNET || data.kort.some((k) => k.id === s.kortId && k.land.includes(land));
      return { ...s, land, butikk: '', butikkId: null, kortId: finnes ? s.kortId : standardKort(land) };
    });

  /** Poeng per 100 kr for en butikksats med dagens valg (abonnement, overføring), uten kort. */
  const per100ForSats = (p: Program, sats: ButikkSats): number | null => {
    const valgId = t.rader[p.id].valgId;
    if (nivaFor(p, valgId)?.kanVeksle === false) return null;
    if (p.konverteringer.length > 0 && p.konverteringer.every((k) => k.poengPerKrone === null)) return null;
    const valg: ProgramValg = {
      programId: p.id,
      aktiv: true,
      sats: gjeldendeSats(sats, IDAG).verdi,
      nivaId: p.nivaer.length > 0 ? valgId : undefined,
      konverteringId: p.nivaer.length === 0 ? valgId : undefined,
    };
    return beregnProgram(p, valg, 100, null).total;
  };

  // Små merknader under tallene: uverifiserte satser, kampanjer og «opptil».
  const merknader: string[] = [];
  for (const p of programmer) {
    const konv = p.konverteringer.find((k) => k.id === t.rader[p.id].valgId) ?? p.konverteringer[0];
    if (konv && konv.poengPerKrone === null && konv.merknad) merknader.push(`${p.kortnavn}: ${konv.merknad}`);
  }
  for (const r of resultater) {
    if (r.konvertering?.status === 'uverifisert' && r.konvertering.merknad) merknader.push(`* ${r.konvertering.merknad}`);
    const sats = butikk?.satser[r.program.id];
    if (sats && t.rader[r.program.id].sats === feltForButikk(r.program, sats, t.rader[r.program.id].valgId)) {
      const g = gjeldendeSats(sats, IDAG);
      if (g.kampanje && sats.kampanje) merknader.push(`${r.program.kortnavn}: kampanjesats til ${fmtDato(sats.kampanje.slutt)}.`);
      if (sats.opptil) merknader.push(`${r.program.kortnavn}: «opptil» – satsen varierer med varekategori.`);
    }
  }
  if (kort?.id === ANNET) merknader.push('* Satsen på eget kort er ikke sjekket.');
  if (kort && kort.status === 'uverifisert' && kort.merknad && kort.poengPer100 > 0 && programKortListe.some((k) => k.id === kort.id)) {
    merknader.push(`* ${kort.merknad}`);
  }

  const kilder = [
    ...programmer.flatMap((p) => p.kilder.map((k) => ({ tittel: `${p.kortnavn}: ${k.tittel}`, url: k.url }))),
    ...kortListe.map((k) => ({ tittel: k.navn, url: k.kilde })),
  ];

  /** Søknadslenken til et kort (affiliate når vi har det, ellers utstederens side). */
  const kortLenke = (k: Kort): string | null => {
    const url = k.lenke ?? k.kilde;
    return url.startsWith('http') ? url : null;
  };

  // Kortet som hadde gitt mest på dette kjøpet, til én diskret tipslinje. Gjelder bare
  // programmer der kortet gir poeng i tillegg (Trumf, SAS Shopping, Everyday).
  const besteKort = kortListe.filter(kortLenke).reduce<Kort | null>((b, k) => (b === null || k.poengPer100 > b.poengPer100 ? k : b), null);
  const medKortlag = belop > 0 ? resultater.find((r) => r.program.kortlag) : undefined;
  const kortTips =
    besteKort && medKortlag && besteKort.poengPer100 > (kort?.poengPer100 ?? 0) && besteKort.id !== kort?.id
      ? { kort: besteKort, program: medKortlag.program, ekstra: (belop / 100) * (besteKort.poengPer100 - (kort?.poengPer100 ?? 0)) }
      : null;
  const harAnnonse = kortListe.some((k) => k.annonse);

  const topp = (
    <header className="topp">
      <span className="ordmerke">Poengtjeneren</span>
      <span className="velg">
        <select aria-label="Land" value={t.land} onChange={(e) => velgLand(e.target.value as Land)}>
          {LAND.map((l) => (
            <option key={l} value={l}>
              {data.landInfo[l].navn}
            </option>
          ))}
        </select>
      </span>
    </header>
  );

  if (visKatalog) {
    return (
      <div className="app">
        {topp}
        <Butikkliste
          liste={butikker}
          programmer={programmer}
          idag={IDAG}
          per100={per100ForSats}
          onVelg={(b) => {
            velgButikk(b);
            setVisKatalog(false);
          }}
          onLukk={() => setVisKatalog(false)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {topp}

      <section className="belop">
        <label className="etikett" htmlFor="belop">
          Kjøpesum
        </label>
        <div className="belop-felt">
          <input
            id="belop"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={t.belop}
            onChange={(e) => {
              if (TILLATT.test(e.target.value)) setT((s) => ({ ...s, belop: e.target.value }));
            }}
          />
          <span>kr</span>
        </div>
      </section>

      <section className="valg">
        <div className="valg-rad rad-butikk">
          <label className="etikett" htmlFor="butikk">
            Butikk
          </label>
          <ButikkSok
            liste={butikker}
            verdi={t.butikk}
            onChange={(tekst) => setT((s) => ({ ...s, butikk: tekst, butikkId: tekst.trim() ? s.butikkId : null }))}
            onVelg={velgButikk}
            valgt={butikk}
          />
          <button type="button" className="lenke" onClick={() => setVisKatalog(true)}>
            Alle {butikker.length} →
          </button>
        </div>
        <div className="valg-rad rad-kort">
          <label className="etikett" htmlFor="kort">
            Kort
          </label>
          {t.kortId === ANNET ? (
            <span className="tall">
              <input
                aria-label="Poeng per 100 kr på eget kort"
                type="text"
                inputMode="decimal"
                placeholder="–"
                value={t.egenKortPoeng}
                onChange={(e) => {
                  if (TILLATT.test(e.target.value)) setT((s) => ({ ...s, egenKortPoeng: e.target.value }));
                }}
              />
              <span className="enhet">p/100</span>
            </span>
          ) : (
            <span />
          )}
          <span className="velg">
            <select id="kort" value={t.kortId} onChange={(e) => setT((s) => ({ ...s, kortId: e.target.value }))}>
              <option value={INGEN}>Ingen</option>
              {programKortListe.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.navn}
                </option>
              ))}
              {kortListe.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.navn}
                </option>
              ))}
              <option value={ANNET}>Annet</option>
            </select>
          </span>
        </div>
        {kort && kort.id !== ANNET && kortLenke(kort) && (
          <p className="kortlenke">
            <a href={kortLenke(kort)!} target="_blank" rel={kort.annonse ? 'sponsored noreferrer' : 'noreferrer'}>
              Søk om {kort.navn} ↗
            </a>
            {kort.annonse && <span className="annonse">Annonse</span>}
            {kort.pris && <span className="muted"> · {kort.pris}</span>}
          </p>
        )}
        {programmer
          .filter((p) => p.nivaer.length > 0)
          .map((p) => (
            <div className="valg-rad rad-kort" key={p.id}>
              <label className="etikett" htmlFor={`${p.id}-niva`}>
                {p.kortnavn}
              </label>
              <span />
              <span className="velg">
                <select id={`${p.id}-niva`} value={t.rader[p.id].valgId} onChange={(e) => setT((s) => endreRad(s, p, { valgId: e.target.value }))}>
                  {p.nivaer.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.navn}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          ))}
      </section>

      <section className="kolonner" aria-live="polite">
        {programmer.map((p) => (
          <ProgramKolonne
            key={p.id}
            program={p}
            tilstand={t.rader[p.id]}
            nivaNavn={p.kort ? (nivaFor(p, t.rader[p.id].valgId)?.kanVeksle === false ? null : (nivaFor(p, t.rader[p.id].valgId)?.navn ?? null)) : null}
            onSats={(sats) => setT((s) => endreRad(s, p, { sats }))}
            resultat={belop > 0 ? (resultater.find((r) => r.program.id === p.id) ?? null) : null}
            lenke={butikk?.satser[p.id] ? (butikk.satser[p.id].lenke ?? butikk.satser[p.id].kilde) : null}
            erBest={beste?.program.id === p.id && resultater.length > 1}
            apen={apen === p.id}
            onToggle={() => setApen(apen === p.id ? null : p.id)}
          />
        ))}
      </section>

      {apent && <p className="detaljer">{utregning(apent, kort)}</p>}

      {belop > 0 && beste && nest && (
        <p className="konklusjon">
          {diff > 0
            ? `${beste.program.kortnavn} gir ${fmtPoeng(diff)} poeng mer enn ${nest.program.kortnavn}.`
            : `${beste.program.kortnavn} og ${nest.program.kortnavn} gir like mye.`}
        </p>
      )}
      {kortTips && (
        <p className="tips">
          Med {kortTips.kort.navn} hadde {kortTips.program.kortnavn} gitt {fmtPoeng(kortTips.ekstra)} poeng mer.{' '}
          <a href={kortLenke(kortTips.kort)!} target="_blank" rel={kortTips.kort.annonse ? 'sponsored noreferrer' : 'noreferrer'}>
            Søk om kortet ↗
          </a>
          {kortTips.kort.annonse && <span className="annonse">Annonse</span>}
        </p>
      )}
      {belop <= 0 && <p className="tom">Skriv inn en kjøpesum.</p>}
      {belop > 0 && resultater.length === 0 && <p className="tom">Skriv inn satsen for minst ett program, eller søk opp en butikk.</p>}

      <footer>
        {[...new Set(merknader)].map((m) => (
          <p key={m}>{m}</p>
        ))}
        {butikk && (
          <p>
            Satser for {butikk.navn} hentet {fmtDato(data.hentet)} fra programmenes egne sider.
          </p>
        )}
        <p>
          Beløp i {data.landInfo[t.land].valuta}. Satser endres – sjekk hos programmet før du handler. Programsatser sist oppdatert{' '}
          {fmtDato(data.sistOppdatert)}.
        </p>
        {harAnnonse && <p>Lenker merket «Annonse» gir oss provisjon hvis du søker om kortet. Det påvirker ikke tallene.</p>}
        <details>
          <summary>Kilder</summary>
          <ul>
            {kilder.map((k) => (
              <li key={k.tittel}>
                {k.url.startsWith('http') ? (
                  <a href={k.url} target="_blank" rel="noreferrer">
                    {k.tittel}
                  </a>
                ) : (
                  `${k.tittel} – ${k.url}`
                )}
              </li>
            ))}
            {butikk &&
              Object.entries(butikk.satser).map(([pid, s]) => (
                <li key={pid}>
                  <a href={s.kilde} target="_blank" rel="noreferrer">
                    {butikk.navn} hos {programmer.find((p) => p.id === pid)?.kortnavn}
                  </a>
                </li>
              ))}
          </ul>
        </details>
      </footer>
    </div>
  );
}
