import { useEffect, useMemo, useRef, useState } from 'react';
import Butikkliste from './components/Butikkliste';
import ButikkSok from './components/ButikkSok';
import Del from './components/Del';
import Flagg from './components/Flagg';
import Hverdag from './components/Hverdag';
import KlarnaSide from './components/KlarnaSide';
import Kortliste, { prisPerMnd } from './components/Kortliste';
import Kortvelger from './components/Kortvelger';
import Logo from './components/Logo';
import Nytt from './components/Nytt';
import Personvern from './components/Personvern';
import Reise from './components/Reise';
import ProgramKolonne, { type RadTilstand } from './components/ProgramKolonne';
import Ukens from './components/Ukens';
import Utvidelse from './components/Utvidelse';
import { hentData, LAND } from './data';
import utvidelseInfo from './data/utvidelse.json';
import type { Butikk, ButikkSats, Kort, Land, Niva, Program } from './data/types';
import { SPRAK, tekst, type Nokkel } from './i18n';
import { gjeldendeSats, sokButikker } from './lib/butikker';
import { beregnAlle, beregnProgram, butikkProsent, effektivProsent, type ProgramValg, type Resultat } from './lib/calc';
import { lesFolger, skrivFolger, vekslFolg, type Folger } from './lib/folger';
import { fmtDato, fmtKr, fmtPoeng, fmtProsent, fmtTall, parseTall, settLocale } from './lib/format';

const data = hentData();
const NOKKEL = 'pointmaxing.v8';
const INGEN = 'ingen';
const ANNET = 'annet';
const TILLATT = /^[\d\s.,]*$/;
const IDAG = new Date().toISOString().slice(0, 10);

type Visning = 'kalk' | 'butikker' | 'nytt' | 'kort' | 'reise' | 'klarna' | 'ukens' | 'personvern' | 'utvidelse';
/** Sider uten land i adressen. */
const TOPPSIDER: Record<string, Visning> = { klarna: 'klarna', personvern: 'personvern', utvidelse: 'utvidelse' };
const VISNINGER: Record<string, Visning> = { butikker: 'butikker', nytt: 'nytt', kort: 'kort', reise: 'reise', ukens: 'ukens' };
const NAV: { visning: Visning; nokkel: Nokkel }[] = [
  { visning: 'kalk', nokkel: 'navKalkulator' },
  { visning: 'butikker', nokkel: 'navButikker' },
  { visning: 'nytt', nokkel: 'navNytt' },
  { visning: 'kort', nokkel: 'navKort' },
  { visning: 'reise', nokkel: 'navReise' },
];

interface Rute {
  visning: Visning;
  kategori: string | null;
}

interface Tilstand {
  land: Land;
  belop: string;
  butikk: string;
  butikkId: string | null;
  kortId: string;
  egenKortPoeng: string;
  /** Rabattkode utenfra i prosent – tom når ingen. */
  rabatt: string;
  /** Kortforbruk per år og mat per måned – til Kort-siden. */
  kortbruk: string;
  matPerMnd: string;
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
 * Adressen styrer land, visning og butikk: /no (kalkulator), /no/kicks (butikk),
 * /no/butikker/mote (katalog), /no/nytt, /no/kort, /no/reise. Da kan alt deles og finnes av søkemotorer.
 * /klarna er partnersiden til Klarna (norske tall).
 */
function lesSti(): { land?: Land; butikkId?: string; rute: Rute } {
  const [sti, a, b] = window.location.pathname.split('/').filter(Boolean);
  if (sti && TOPPSIDER[sti]) return { land: 'NO', rute: { visning: TOPPSIDER[sti], kategori: null } };
  const land = LAND.find((l) => SPRAK[l].sti === sti);
  if (!land) return { rute: { visning: 'kalk', kategori: null } };
  if (a && VISNINGER[a]) return { land, rute: { visning: VISNINGER[a], kategori: a === 'butikker' ? (b ?? null) : null } };
  return { land, butikkId: a, rute: { visning: 'kalk', kategori: null } };
}

function stiFor(land: Land, rute: Rute, butikkId: string | null): string {
  if (rute.visning === 'klarna' || rute.visning === 'personvern' || rute.visning === 'utvidelse') return `/${rute.visning}`;
  const s = `/${SPRAK[land].sti}`;
  if (rute.visning === 'butikker') return `${s}/butikker${rute.kategori ? `/${rute.kategori}` : ''}`;
  if (rute.visning === 'kalk') return butikkId ? `${s}/${butikkId}` : s;
  return `${s}/${rute.visning}`;
}

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
    prisPerMnd: niva.prisPerMnd,
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
  return { land: 'NO', belop: '1000', butikk: '', butikkId: null, kortId: standardKort('NO'), egenKortPoeng: '', rabatt: '', kortbruk: '0', matPerMnd: '5000', rader };
}

function les(): Tilstand {
  const std = standard();
  let t = std;
  try {
    const lagret = localStorage.getItem(NOKKEL);
    if (lagret) {
      const p = JSON.parse(lagret) as Partial<Tilstand>;
      const rader: Record<string, RadTilstand> = {};
      for (const id of Object.keys(std.rader)) rader[id] = { ...std.rader[id], ...(p.rader?.[id] ?? {}) };
      t = {
        land: LAND.includes(p.land as Land) ? (p.land as Land) : std.land,
        belop: typeof p.belop === 'string' ? p.belop : std.belop,
        butikk: typeof p.butikk === 'string' ? p.butikk : '',
        butikkId: typeof p.butikkId === 'string' ? p.butikkId : null,
        kortId: typeof p.kortId === 'string' ? p.kortId : std.kortId,
        egenKortPoeng: typeof p.egenKortPoeng === 'string' ? p.egenKortPoeng : '',
        rabatt: typeof p.rabatt === 'string' ? p.rabatt : '',
        kortbruk: typeof p.kortbruk === 'string' ? p.kortbruk : std.kortbruk,
        matPerMnd: typeof p.matPerMnd === 'string' ? p.matPerMnd : std.matPerMnd,
        rader,
      };
    }
  } catch {
    t = std;
  }
  // Adressen vinner over lagret tilstand: /se/kicks åpner Kicks i Sverige.
  const sti = lesSti();
  if (sti.land) {
    if (sti.land !== t.land) t = medLand(t, sti.land);
    const b = sti.butikkId ? data.butikker[sti.land].find((x) => x.id === sti.butikkId) : undefined;
    if (b) t = medButikk(t, b);
  }
  // Delte beregninger: /no/kicks?belop=1000&kort=sas-amex-premium&niva=max
  const q = new URLSearchParams(window.location.search);
  const belopQ = q.get('belop');
  if (belopQ && TILLATT.test(belopQ)) t = { ...t, belop: belopQ };
  const kortQ = q.get('kort');
  if (kortQ && (kortQ === INGEN || data.kort.some((k) => k.id === kortQ && k.land.includes(t.land)) || data.programmer.some((p) => p.land === t.land && `${p.id}-kort` === kortQ))) {
    t = { ...t, kortId: kortQ };
  }
  const nivaQ = q.get('niva');
  if (nivaQ) for (const p of data.programmer.filter((x) => x.land === t.land && x.nivaer.some((n) => n.id === nivaQ))) t = endreRad(t, p, { valgId: nivaQ });
  // Delt til appen fra en annen app (share_target): finn butikken fra adressen eller teksten.
  const delt = q.get('url') ?? q.get('tekst') ?? q.get('tittel');
  if (delt && !sti.butikkId) {
    let b: Butikk | undefined;
    const m = delt.match(/https?:\/\/[^\s]+/);
    if (m) {
      try {
        const vert = new URL(m[0]).hostname.toLowerCase().replace(/^www\./, '');
        b = data.butikker[t.land].find((x) => x.domene && (vert === x.domene || vert.endsWith(`.${x.domene}`)));
      } catch {
        /* ikke en adresse */
      }
    }
    b ??= sokButikker(data.butikker[t.land], delt.replace(/https?:\/\/\S+/g, ' ').trim(), 1)[0];
    if (b) t = medButikk(t, b);
  }
  return t;
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

const feltForButikk = (p: Program, sats: ButikkSats | undefined, valgId: string) =>
  feltVerdi(p, sats ? gjeldendeSats(sats, IDAG).verdi : null, nivaFor(p, valgId));

/** Fyller inn butikkens satser i programmene for landet. */
function medButikk(s: Tilstand, b: Butikk): Tilstand {
  const rader = { ...s.rader };
  for (const p of data.programmer.filter((x) => x.land === s.land)) {
    rader[p.id] = { ...rader[p.id], sats: feltForButikk(p, b.satser[p.id], rader[p.id].valgId) };
  }
  return { ...s, butikk: b.navn, butikkId: b.id, rader };
}

/** Bytter land: nullstiller butikk, og kort som ikke finnes i det nye landet. */
function medLand(s: Tilstand, land: Land): Tilstand {
  const finnes = s.kortId === INGEN || s.kortId === ANNET || data.kort.some((k) => k.id === s.kortId && k.land.includes(land));
  return { ...s, land, butikk: '', butikkId: null, kortId: finnes ? s.kortId : standardKort(land) };
}

/** Én setning som viser hvordan tallet ble til. */
function utregning(land: Land, r: Resultat, kort: Kort | null): string {
  const deler: string[] = [];
  const { program } = r;
  const poengOrd = tekst(land, 'poeng');
  if (r.opptjentKr !== null && r.poengPerKrone !== null) {
    const faktor = r.butikkFaktor > 1 ? ` × ${fmtTall(r.butikkFaktor)}` : '';
    const sats = r.niva
      ? `${fmtProsent(r.butikkSats)}${faktor} + ${fmtProsent(r.nivaProsent)} ${r.niva.navn} = ${fmtProsent(r.effektivSats)}`
      : fmtProsent(r.butikkSats);
    if (program.internPoeng) {
      const poeng = r.opptjentKr * program.internPoeng.perKrone;
      deler.push(`${sats} = ${fmtPoeng(poeng)} ${program.internPoeng.navn} × ${fmtTall(r.poengPerKrone)} / ${program.internPoeng.perKrone} = ${fmtPoeng(r.programPoeng)} ${tekst(land, 'eurobonusPoeng')}`);
    } else {
      deler.push(`${sats} = ${fmtKr(r.opptjentKr)} × ${fmtTall(r.poengPerKrone)} = ${fmtPoeng(r.programPoeng)} ${poengOrd}`);
    }
  } else {
    deler.push(tekst(land, 'poengPer100Er', { sats: fmtTall(r.effektivSats), n: fmtPoeng(r.programPoeng) }));
  }
  if (kort) {
    if (program.kortlag) deler.push(tekst(land, 'fraKort', { n: fmtPoeng(r.kortPoeng), kort: kort.navn }));
    else if (kort.id === `${program.id}-kort`) deler.push(tekst(land, 'alleredeMed'));
    else deler.push(tekst(land, 'ikkeKortVia', { program: program.kortnavn }));
  }
  return deler.join(' · ');
}

export default function App() {
  const [t, setT] = useState<Tilstand>(les);
  const [rute, setRute] = useState<Rute>(() => lesSti().rute);
  const [apen, setApen] = useState<string | null>(null);
  const [visRabatt, setVisRabatt] = useState(false);
  const [visSlik, setVisSlik] = useState(false);
  const [folger, setFolger] = useState<Folger>(lesFolger);
  const forsteSti = useRef(true);

  // Språk og tallformat følger landet.
  settLocale(SPRAK[t.land].locale);
  const T = (nokkel: Nokkel, verdier?: Record<string, string | number>) => tekst(t.land, nokkel, verdier);

  useEffect(() => {
    try {
      localStorage.setItem(NOKKEL, JSON.stringify(t));
    } catch {
      /* lagring er bare en bekvemmelighet */
    }
  }, [t]);

  // Adressen følger land, visning og butikk – og tilbake-knappen i nettleseren virker.
  useEffect(() => {
    const ny = stiFor(t.land, rute, t.butikkId);
    if (window.location.pathname !== ny) {
      if (forsteSti.current) window.history.replaceState(null, '', ny);
      else window.history.pushState(null, '', ny);
    }
    forsteSti.current = false;
    document.documentElement.lang = SPRAK[t.land].kode;
    window.scrollTo(0, 0);
  }, [t.land, t.butikkId, rute]);

  useEffect(() => {
    const tilbake = () => {
      const sti = lesSti();
      setRute(sti.rute);
      setT((s) => {
        let n = sti.land && sti.land !== s.land ? medLand(s, sti.land) : s;
        const b = sti.butikkId ? data.butikker[n.land].find((x) => x.id === sti.butikkId) : undefined;
        n = b ? medButikk(n, b) : sti.rute.visning === 'kalk' ? { ...n, butikk: '', butikkId: null } : n;
        return n;
      });
    };
    window.addEventListener('popstate', tilbake);
    return () => window.removeEventListener('popstate', tilbake);
  }, []);

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
      return { id: ANNET, land: LAND, navn: T('annet').toLowerCase(), utsteder: '', poengPer100: parseTall(t.egenKortPoeng), prisPerMnd: 0, status: 'uverifisert', kilde: '', sistVerifisert: '' };
    }
    return kortListe.find((k) => k.id === t.kortId) ?? programKortListe.find((k) => k.id === t.kortId) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.kortId, t.egenKortPoeng, kortListe, programKortListe, t.land]);

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

  const velgButikk = (b: Butikk) => {
    setT((s) => medButikk(s, b));
    setRute({ visning: 'kalk', kategori: null });
  };
  const velgLand = (land: Land) => setT((s) => medLand(s, land));
  const gaaTil = (visning: Visning) => setRute({ visning, kategori: null });
  const folgerHer = folger[t.land] ?? [];
  const toggleFolg = (id: string) =>
    setFolger((f) => {
      const ny = vekslFolg(f, t.land, id);
      skrivFolger(ny);
      return ny;
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
      if (g.kampanje && sats.kampanje) merknader.push(T('kampanjeTil', { program: r.program.kortnavn, dato: fmtDato(sats.kampanje.slutt) }));
      if (sats.opptil) merknader.push(T('opptilVarierer', { program: r.program.kortnavn }));
    }
  }
  if (kort?.id === ANNET) merknader.push(T('egetKortIkkeSjekket'));
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
  // programmer der kortet gir poeng i tillegg (Trumf, SAS Shopping).
  const besteKort = kortListe.filter(kortLenke).reduce<Kort | null>((b, k) => (b === null || k.poengPer100 > b.poengPer100 ? k : b), null);
  const medKortlag = belop > 0 ? resultater.find((r) => r.program.kortlag) : undefined;
  const ekstraMedBesteKort = besteKort ? (belop / 100) * (besteKort.poengPer100 - (kort?.poengPer100 ?? 0)) : 0;
  // Vises bare når forskjellen er verdt å nevne (minst 50 poeng).
  const kortTips =
    besteKort && medKortlag && besteKort.id !== kort?.id && ekstraMedBesteKort >= 50
      ? { kort: besteKort, program: medKortlag.program, ekstra: ekstraMedBesteKort }
      : null;
  const harAnnonse = kortListe.some((k) => k.annonse);

  /** Nivåpoeng kjøpet gir: programmets (SAS Shopping) og kortets (Amex Elite, Mastercard Premium). */
  const nivaapoengFor = (r: Resultat): number => {
    let n = 0;
    const np = r.program.nivaapoeng;
    if (np && (!np.til || np.til >= IDAG)) n += r.programPoeng * np.perBonuspoeng;
    if (kort && r.program.kortlag) {
      if (kort.nivaapoengPer100) n += (belop / 100) * kort.nivaapoengPer100;
      if (kort.nivaapoengAndel) n += r.kortPoeng * kort.nivaapoengAndel;
    }
    return n;
  };
  for (const p of programmer) {
    if (p.nivaapoeng && (!p.nivaapoeng.til || p.nivaapoeng.til >= IDAG) && resultater.some((r) => r.program.id === p.id)) {
      merknader.push(T('nivaapoengTil', { dato: p.nivaapoeng.til ? fmtDato(p.nivaapoeng.til) : '' }));
    }
  }

  const bunnlenker = (
    <p className="bunnlenker">
      <a href="/utvidelse" onClick={(e) => { e.preventDefault(); gaaTil('utvidelse'); }}>{T('utvidelseLenke')}</a>
      {' · '}
      <a href="/personvern" onClick={(e) => { e.preventDefault(); gaaTil('personvern'); }}>{T('personvern')}</a>
    </p>
  );


  // Lønner nivået seg? Samme kjøp regnet med nivået over (eller under, for det høyeste).
  const nivaLinje = (() => {
    const p = programmer.find((x) => x.nivaer.length > 0);
    if (!p || belop <= 0) return null;
    const konv = p.konverteringer[0];
    if (!konv || konv.poengPerKrone === null) return null;
    const rad = t.rader[p.id];
    const valgt = nivaFor(p, rad.valgId);
    if (!valgt) return null;
    const vekslbare = p.nivaer.filter((n) => n.kanVeksle !== false);
    const grunn = rad.sats.trim() === '' ? 0 : valgt.kanVeksle === false ? parseTall(rad.sats) : butikkProsent(parseTall(rad.sats), valgt);
    const poeng = (n: Niva) => beregnProgram(p, { programId: p.id, aktiv: true, sats: grunn, nivaId: n.id }, belop, null).total;
    if (valgt.kanVeksle === false) {
      const forste = vekslbare[0];
      return forste ? T('nivaFraIngen', { niva: forste.navn, n: fmtPoeng(poeng(forste)), kr: forste.prisPerMnd }) : null;
    }
    const i = vekslbare.findIndex((n) => n.id === valgt.id);
    const opp = vekslbare[i + 1];
    const ned = vekslbare[i - 1];
    if (opp) return T('nivaOpp', { niva: opp.navn, n: fmtPoeng(poeng(opp) - poeng(valgt)), kr: opp.prisPerMnd - valgt.prisPerMnd });
    if (ned) return T('nivaNed', { niva: ned.navn, n: fmtPoeng(poeng(valgt) - poeng(ned)), kr: valgt.prisPerMnd - ned.prisPerMnd });
    return null;
  })();

  // Rabattkode eller poeng: begge tallene, så valget blir enkelt.
  const rabatt = parseTall(t.rabatt);
  const rabattLinje =
    belop > 0 && rabatt > 0 && beste
      ? `${T('rabattSparer', { kr: fmtKr((belop * rabatt) / 100), program: beste.program.kortnavn, n: fmtPoeng(beste.total) })}${beste.program.id === 'trumf' ? ` ${T('rabattTrumf')}` : ''}`
      : null;

  // Resultatet som tekst med lenke som åpner samme beregning.
  const delTekst = () => {
    const u = new URL(window.location.origin + stiFor(t.land, { visning: 'kalk', kategori: null }, t.butikkId));
    if (belop > 0) u.searchParams.set('belop', String(belop));
    if (t.kortId !== ANNET) u.searchParams.set('kort', t.kortId);
    for (const p of programmer.filter((x) => x.nivaer.length > 0)) u.searchParams.set('niva', t.rader[p.id].valgId);
    const linjer = resultater.map((r) => `${r.program.kortnavn}${r.niva && r.niva.kanVeksle !== false ? ` ${r.niva.navn}` : ''}: ${fmtPoeng(r.total)} ${T('poeng')}`);
    return `${butikk ? `${butikk.navn}, ` : ''}${fmtKr(belop)}\n${linjer.join('\n')}\n${u.toString()}`;
  };

  const topp = (
    <>
      <header className="topp">
        <div>
          <span className="merke-rad">
            <Logo />
            <span className="ordmerke">Pointmaxing</span>
          </span>
          <span className="slagord">{T('slagord')}</span>
        </div>
        <div className="topp-hoyre">
          <a
            className="knapp-chrome"
            href={utvidelseInfo.chromeWebStoreUrl || '/utvidelse'}
            target={utvidelseInfo.chromeWebStoreUrl ? '_blank' : undefined}
            rel={utvidelseInfo.chromeWebStoreUrl ? 'noreferrer' : undefined}
            onClick={(e) => {
              if (!utvidelseInfo.chromeWebStoreUrl) {
                e.preventDefault();
                gaaTil('utvidelse');
              }
            }}
          >
            {T('leggTil')}
          </a>
          <div className="flagg" role="radiogroup" aria-label={T('land')}>
            {LAND.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={t.land === l}
                aria-label={data.landInfo[l].navn}
                title={data.landInfo[l].navn}
                className={t.land === l ? 'aktiv' : undefined}
                onClick={() => velgLand(l)}
              >
                <Flagg land={l} />
              </button>
            ))}
          </div>
        </div>
      </header>
      <nav className="nav" aria-label="Sider">
        {NAV.map((n) => (
          <a
            key={n.visning}
            href={stiFor(t.land, { visning: n.visning, kategori: null }, n.visning === 'kalk' ? t.butikkId : null)}
            className={rute.visning === n.visning ? 'aktiv' : undefined}
            aria-current={rute.visning === n.visning ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              gaaTil(n.visning);
            }}
          >
            {T(n.nokkel)}
          </a>
        ))}
        {/* Kortet og Klarna-nivået kan byttes herfra på alle sider – alle tall følger med. */}
        <Kortvelger
          land={t.land}
          kortId={t.kortId}
          kortListe={kortListe}
          programmer={programmer}
          nivaFor={(p) => t.rader[p.id].valgId}
          onKort={(id) => setT((s) => ({ ...s, kortId: id }))}
          onNiva={(p, valgId) => setT((s) => endreRad({ ...s, kortId: `${p.id}-kort` }, p, { valgId }))}
        />
      </nav>
    </>
  );

  if (rute.visning === 'klarna') return <KlarnaSide data={data} idag={IDAG} />;

  if (rute.visning === 'personvern' || rute.visning === 'utvidelse') {
    return (
      <div className="app">
        {topp}
        <div className="billett">{rute.visning === 'personvern' ? <Personvern /> : <Utvidelse />}</div>
        <footer>
          {bunnlenker}
          <p className="signatur">{T('signatur')}</p>
        </footer>
      </div>
    );
  }

  if (rute.visning === 'butikker') {
    return (
      <div className="app">
        {topp}
        <div className="billett">
          <Butikkliste
            land={t.land}
            liste={butikker}
            programmer={programmer}
            idag={IDAG}
            per100={per100ForSats}
            kategori={rute.kategori}
            onKategori={(kategori) => setRute({ visning: 'butikker', kategori })}
            onVelg={velgButikk}
            onLukk={() => gaaTil('kalk')}
          />
        </div>
      </div>
    );
  }

  if (rute.visning === 'nytt') {
    return (
      <div className="app">
        {topp}
        <div className="billett">
          <Nytt
            land={t.land}
            butikker={butikker}
            programmer={programmer}
            historikk={data.historikk[t.land]}
            idag={IDAG}
            folger={folgerHer}
            partnerkampanjer={data.kampanjer.filter((k) => k.land === t.land && (!k.slutt || k.slutt >= IDAG))}
            per100={per100ForSats}
            onVelg={velgButikk}
            onUkens={() => gaaTil('ukens')}
          />
        </div>
      </div>
    );
  }

  if (rute.visning === 'reise') {
    return (
      <div className="app">
        {topp}
        <div className="billett">
          <Reise land={t.land} reise={data.reise} />
        </div>
        <footer>
          {bunnlenker}
          <p className="signatur">{T('signatur')}</p>
        </footer>
      </div>
    );
  }

  if (rute.visning === 'ukens') {
    return (
      <div className="app">
        {topp}
        <div className="billett">
          <Ukens land={t.land} butikker={butikker} programmer={programmer} historikk={data.historikk[t.land]} idag={IDAG} per100={per100ForSats} onVelg={velgButikk} />
        </div>
      </div>
    );
  }

  if (rute.visning === 'kort') {
    // På kortsiden vises Klarna Plus, Premium og Max hver for seg – de gir ulik opptjening.
    const klarnaKort = programmer.flatMap((p) =>
      p.nivaer
        .filter((n) => n.kanVeksle !== false && n.ekstraProsent > 0)
        .map((n) => kortForProgram(p, n.id))
        .filter((k): k is Kort => k !== null && k.poengPer100 > 0)
        .map((k, i) => ({ ...k, id: `${k.id}-${p.nivaer.filter((n) => n.kanVeksle !== false && n.ekstraProsent > 0)[i].id}`, navn: `${p.kortnavn} ${p.nivaer.filter((n) => n.kanVeksle !== false && n.ekstraProsent > 0)[i].navn}` })),
    );
    return (
      <div className="app">
        {topp}
        <div className="billett">
          <Kortliste
            land={t.land}
            kort={[...klarnaKort, ...kortListe]}
            lenke={kortLenke}
            kortbruk={t.kortbruk}
            onKortbruk={(kortbruk) => setT((s) => ({ ...s, kortbruk }))}
            idag={IDAG}
          />
          <Hverdag land={t.land} programmer={programmer} kort={kort && kort.id !== ANNET ? kort : null} matPerMnd={t.matPerMnd} onMatPerMnd={(matPerMnd) => setT((s) => ({ ...s, matPerMnd }))} />
        </div>
        <footer>
          {harAnnonse && <p>{T('annonseForklaring')}</p>}
          {bunnlenker}
          <p className="signatur">{T('signatur')}</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      {topp}

      <div className="billett">
        <section className="belop">
          <label className="etikett" htmlFor="belop">
            {T('kjopesum')}
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
              {T('butikk')}
            </label>
            <ButikkSok
              liste={butikker}
              verdi={t.butikk}
              onChange={(tekst) => setT((s) => ({ ...s, butikk: tekst, butikkId: tekst.trim() ? s.butikkId : null }))}
              onVelg={velgButikk}
              valgt={butikk}
              placeholder={T('sokButikk')}
            />
            <span className="rad-hoyre">
              {butikk && (
                <button
                  type="button"
                  className={`stjerne${folgerHer.includes(butikk.id) ? ' aktiv' : ''}`}
                  aria-pressed={folgerHer.includes(butikk.id)}
                  title={T(folgerHer.includes(butikk.id) ? 'folger' : 'folg', { butikk: butikk.navn })}
                  aria-label={T(folgerHer.includes(butikk.id) ? 'folger' : 'folg', { butikk: butikk.navn })}
                  onClick={() => toggleFolg(butikk.id)}
                >
                  {folgerHer.includes(butikk.id) ? '★' : '☆'}
                </button>
              )}
              <button type="button" className="lenke" onClick={() => gaaTil('butikker')}>
                {T('alle', { n: butikker.length })}
              </button>
            </span>
          </div>
          <div className="valg-rad rad-kort">
            <label className="etikett" htmlFor="kort">
              {T('kort')}
            </label>
            {t.kortId === ANNET ? (
              <span className="tall">
                <input
                  aria-label={T('egetKortPoeng')}
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
                <option value={INGEN}>{T('ingen')}</option>
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
                <option value={ANNET}>{T('annet')}</option>
              </select>
            </span>
          </div>
          {kort && kort.id !== ANNET && kortLenke(kort) && (
            <p className="kortlenke">
              <a href={kortLenke(kort)!} target="_blank" rel={kort.annonse ? 'sponsored noreferrer' : 'noreferrer'}>
                {T('sokOm', { kort: kort.navn })} <span aria-hidden="true">→</span>
              </a>
              {kort.annonse && <span className="annonse">{T('annonse')}</span>}
              <span className="muted">{T('krPerMnd', { n: fmtTall(prisPerMnd(kort, IDAG)) })}</span>
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
          {t.rabatt !== '' || visRabatt ? (
            <div className="valg-rad rad-kort">
              <label className="etikett" htmlFor="rabatt">
                {T('rabattkode')}
              </label>
              <span className="tall">
                <input
                  id="rabatt"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={t.rabatt}
                  onChange={(e) => {
                    if (TILLATT.test(e.target.value)) setT((s) => ({ ...s, rabatt: e.target.value }));
                  }}
                />
                <span className="enhet">%</span>
              </span>
              <span />
            </div>
          ) : (
            <p className="legg-til">
              <button type="button" className="lenke" onClick={() => setVisRabatt(true)}>
                {T('leggTilRabatt')}
              </button>
            </p>
          )}
        </section>

        <div className="perforering" aria-hidden="true" />

        <section className="kolonner" aria-live="polite">
          {programmer.map((p) => {
            const r = belop > 0 ? (resultater.find((x) => x.program.id === p.id) ?? null) : null;
            return (
              <ProgramKolonne
                key={p.id}
                land={t.land}
                program={p}
                tilstand={t.rader[p.id]}
                nivaNavn={p.kort ? (nivaFor(p, t.rader[p.id].valgId)?.kanVeksle === false ? null : (nivaFor(p, t.rader[p.id].valgId)?.navn ?? null)) : null}
                onSats={(sats) => setT((s) => endreRad(s, p, { sats }))}
                resultat={r}
                lenke={butikk?.satser[p.id] ? (butikk.satser[p.id].lenke ?? butikk.satser[p.id].kilde) : null}
                historikk={butikk ? (data.historikk[t.land]?.[butikk.id]?.[p.id] ?? null) : null}
                kampanjeSlutt={(() => {
                  const s = butikk?.satser[p.id];
                  return s?.kampanje && gjeldendeSats(s, IDAG).kampanje ? s.kampanje.slutt : null;
                })()}
                nivaapoeng={r ? nivaapoengFor(r) : 0}
                idag={IDAG}
                erBest={beste?.program.id === p.id && resultater.length > 1}
                apen={apen === p.id}
                onToggle={() => setApen(apen === p.id ? null : p.id)}
              />
            );
          })}
        </section>

        {apent && <p className="detaljer">{utregning(t.land, apent, kort)}</p>}

        {belop > 0 && beste && nest && (
          <p className="konklusjon">
            {diff > 0
              ? T('konklusjonMer', { a: beste.program.kortnavn, n: fmtPoeng(diff), b: nest.program.kortnavn })
              : T('konklusjonLikt', { a: beste.program.kortnavn, b: nest.program.kortnavn })}
          </p>
        )}
        {belop > 0 && resultater.length > 0 && (
          <p className="handlinger">
            <Del land={t.land} lag={delTekst} />
            {beste && (
              <>
                <span className="skille" aria-hidden="true">
                  ·
                </span>
                <button type="button" className="lenke" aria-expanded={visSlik} onClick={() => setVisSlik((v) => !v)}>
                  {T('slikFar', { program: beste.program.kortnavn })} {visSlik ? '▾' : '▸'}
                </button>
              </>
            )}
          </p>
        )}
        {visSlik && belop > 0 && beste && (
          <ol className="slik">
            {beste.program.vilkar.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ol>
        )}
        {nivaLinje && <p className="nivalinje">{nivaLinje}</p>}
        {rabattLinje && <p className="nivalinje">{rabattLinje}</p>}
        {kortTips && (
          <p className="tips">
            <span>{T('tips', { kort: kortTips.kort.navn, program: kortTips.program.kortnavn, n: fmtPoeng(kortTips.ekstra) })}</span>
            <a href={kortLenke(kortTips.kort)!} target="_blank" rel={kortTips.kort.annonse ? 'sponsored noreferrer' : 'noreferrer'}>
              {T('sokOmKortet')} <span aria-hidden="true">→</span>
            </a>
            {kortTips.kort.annonse && <span className="annonse">{T('annonse')}</span>}
          </p>
        )}
        {belop <= 0 && <p className="tom">{T('skrivBelop')}</p>}
        {belop > 0 && resultater.length === 0 && <p className="tom">{T('skrivSats')}</p>}
      </div>

      <footer>
        <details className="om">
          <summary>{T('omTallene')}</summary>
          {[...new Set(merknader)].map((m) => (
            <p key={m}>{m}</p>
          ))}
          {butikk && <p>{T('satserHentet', { butikk: butikk.navn, dato: fmtDato(data.hentet) })}</p>}
          <p>{T('forbehold', { valuta: data.landInfo[t.land].valuta, dato: fmtDato(data.sistOppdatert) })}</p>
          {harAnnonse && <p>{T('annonseForklaring')}</p>}
          <p className="signatur">{T('signatur')}</p>
          <p className="kilder-tittel">{T('kilder')}</p>
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
                    {T('hos', { butikk: butikk.navn, program: programmer.find((p) => p.id === pid)?.kortnavn ?? pid })}
                  </a>
                </li>
              ))}
          </ul>
        </details>
        {bunnlenker}
      </footer>
    </div>
  );
}
