import { Fragment } from 'react';
import type { BlackFriday as Oppsett, Butikk, ButikkSats, Land, Program } from '../data/types';
import { dagerTekst, kategoriNavn, SPRAK, tekst } from '../i18n';
import { fmtPer100, fmtTall } from '../lib/format';
import { dagerIgjen } from '../lib/nytt';
import { ButikkLogo } from './Butikkliste';

interface Props {
  land: Land;
  oppsett: Oppsett;
  butikker: Butikk[];
  programmer: Program[];
  idag: string;
  per100: (program: Program, sats: ButikkSats) => number | null;
  onVelg: (butikk: Butikk) => void;
  kampanjerHref: string;
}

interface Rad {
  b: Butikk;
  p: Program;
  v: number;
}

/** Black Friday-guiden: kjente nettbutikker per kategori med flest poeng først, kampanjer nå og tre tips. */
export default function BlackFriday({ land, oppsett, butikker, programmer, idag, per100, onVelg, kampanjerHref }: Props) {
  const gjeldende = (s: ButikkSats) => (s.kampanje && s.kampanje.slutt >= idag ? s.kampanje.verdi : s.verdi);
  const sats = (p: Program, s: ButikkSats) => (p.satsEnhet === 'prosent' ? `${s.opptil ? '≤' : ''}${fmtTall(gjeldende(s))} %` : `${fmtTall(gjeldende(s))} p`);
  const beste = (b: Butikk): Rad | null => {
    let topp: Rad | null = null;
    for (const p of programmer) {
      const s = b.satser[p.id];
      const v = s ? per100(p, s) : null;
      if (v !== null && (topp === null || v > topp.v)) topp = { b, p, v };
    }
    return topp;
  };
  const etterPoeng = (a: Rad, c: Rad) => c.v - a.v;

  const kategorier = Object.entries(oppsett.butikker[land] ?? {})
    .map(([id, ider]) => ({
      id,
      rader: ider
        .map((i) => butikker.find((b) => b.id === i))
        .filter((b): b is Butikk => Boolean(b))
        .map(beste)
        .filter((r): r is Rad => r !== null)
        .sort(etterPoeng)
        .slice(0, oppsett.perKategori),
    }))
    .filter((k) => k.rader.length);
  // Kampanjer der kampanjen også er beste vei til poeng i butikken.
  const kampanjer = butikker
    .map(beste)
    .filter((r): r is Rad => r !== null && (r.b.satser[r.p.id].kampanje?.slutt ?? '') >= idag)
    .sort(etterPoeng)
    .slice(0, 10);

  const dato = new Intl.DateTimeFormat(SPRAK[land].locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const igjen = dagerIgjen(idag, oppsett.dato);
  const nedtelling = idag > oppsett.cyberMonday ? null : igjen > 1 ? tekst(land, 'bfOm', { n: igjen }) : igjen === 1 ? tekst(land, 'bfIMorgen') : tekst(land, 'bfPagar');

  const klarna = programmer.find((p) => p.nivaer.some((n) => n.id === 'max'));
  const max = klarna?.nivaer.find((n) => n.id === 'max');
  const medKort = programmer.filter((p) => p.kortlag).map((p) => p.kortnavn);
  const tips = [
    tekst(land, 'bfTipsSjekk'),
    ...(klarna && max ? [tekst(land, 'bfTipsKlarna', { navn: klarna.kortnavn, faktor: fmtTall(max.butikkFaktor), ekstra: fmtTall(max.ekstraProsent) })] : []),
    ...(medKort.length ? [tekst(land, 'bfTipsKort', { liste: medKort.length > 1 ? `${medKort.slice(0, -1).join(', ')} ${tekst(land, 'og')} ${medKort[medKort.length - 1]}` : medKort[0] })] : []),
  ];

  const rad = (nokkel: string, { b, p, v }: Rad, under: string, klasse = '') => (
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
        <span className={`nytt-sats${klasse}`}>{fmtPer100(v)} p/100</span>
      </button>
    </li>
  );

  return (
    <section className="nytt bf">
      {nedtelling && <span className="etikett nedtelling">{nedtelling}</span>}
      <h1>Black Friday</h1>
      <p className="ingress">
        {tekst(land, 'bfDatoer', { bf: dato.format(new Date(oppsett.dato)), cm: dato.format(new Date(oppsett.cyberMonday)) })} {tekst(land, 'bfIngress')}
      </p>

      {kampanjer.length > 0 && (
        <>
          <h2 className="etikett">{tekst(land, 'kampanjerNaa')}</h2>
          <ul className="nytt-liste">{kampanjer.map((r) => rad(`k-${r.b.id}-${r.p.id}`, r, `${sats(r.p, r.b.satser[r.p.id])} · ${dagerTekst(land, dagerIgjen(idag, r.b.satser[r.p.id].kampanje!.slutt))}`, ' opp'))}</ul>
          <a className="bf-mer" href={kampanjerHref}>
            {tekst(land, 'navNytt')} →
          </a>
        </>
      )}

      {kategorier.map((k) => (
        <Fragment key={k.id}>
          <h2 className="etikett">{kategoriNavn(land, k.id)}</h2>
          <ul className="nytt-liste">{k.rader.map((r) => rad(`${k.id}-${r.b.id}`, r, sats(r.p, r.b.satser[r.p.id])))}</ul>
        </Fragment>
      ))}

      <h2 className="etikett">{tekst(land, 'bfTips')}</h2>
      <ul className="bf-tips">
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}
