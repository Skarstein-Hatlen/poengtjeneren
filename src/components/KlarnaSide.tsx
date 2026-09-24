import { useEffect } from 'react';
import type { Butikk, Datasett, Land, Program } from '../data/types';
import { gjeldendeSats } from '../lib/butikker';
import { beregnProgram, effektivProsent } from '../lib/calc';
import { fmtDato, fmtPer100, fmtTall } from '../lib/format';
import { ButikkLogo } from './Butikkliste';
import Logo from './Logo';

interface Props {
  data: Datasett;
  idag: string;
}

const LAND: Land = 'NO';
const KONTAKT = { navn: 'Kjetil Skarstein-Hatlen', epost: 'kjetil@inora.no' };
/** Butikksatsen eksemplene regner med – den Klarna-feltet starter med. */
const EKSEMPEL_SATS = 3;

interface Konkurrent {
  program: Program;
  sats: number;
  per100: number;
}

interface Rad {
  butikk: Butikk;
  /** Butikkens cashback i appen. */
  grunn: number;
  /** Satsen med Max: grunn × 4 + 1,5. */
  medMax: number;
  per100: number;
  /** Beste av Trumf og SAS Shopping i samme butikk, hvis butikken finnes der. */
  konkurrent: Konkurrent | null;
}

/** EuroBonus-poeng per 100 kr for en butikksats, uten kort. */
function per100(p: Program, sats: number, nivaId?: string): number {
  return beregnProgram(p, { programId: p.id, aktiv: true, sats, nivaId }, 100, null).total;
}

function satsTekst(p: Program, sats: number): string {
  return p.satsEnhet === 'prosent' ? `${fmtTall(sats)} %` : `${fmtTall(sats)} p/100 kr`;
}

/** Partnersiden til Klarna: hva Klarna får ut av Pointmaxing, regnet på dagens satser. */
export default function KlarnaSide({ data, idag }: Props) {
  useEffect(() => {
    document.title = 'Pointmaxing for Klarna';
  }, []);

  const programmer = data.programmer.filter((p) => p.land === LAND);
  const klarna = programmer.find((p) => p.id === 'klarna');
  if (!klarna) return null;
  const andre = programmer.filter((p) => p.id !== klarna.id);
  const konv = klarna.konverteringer[0];
  const max = klarna.nivaer.find((n) => n.id === 'max') ?? klarna.nivaer[klarna.nivaer.length - 1];
  const butikker = data.butikker[LAND];

  const rader: Rad[] = butikker
    .filter((b) => b.satser[klarna.id])
    .map((b) => {
      const grunn = gjeldendeSats(b.satser[klarna.id], idag).verdi;
      const konkurrenter = andre
        .filter((p) => b.satser[p.id])
        .map((p) => {
          const sats = gjeldendeSats(b.satser[p.id], idag).verdi;
          return { program: p, sats, per100: per100(p, sats) };
        })
        .sort((a, b) => b.per100 - a.per100);
      return { butikk: b, grunn, medMax: effektivProsent(grunn, max), per100: per100(klarna, grunn, max.id), konkurrent: konkurrenter[0] ?? null };
    })
    .sort((a, b) => b.per100 - a.per100);

  const medKonkurranse = rader.filter((r) => r.konkurrent !== null);
  const vinnere = medKonkurranse.filter((r) => r.per100 > r.konkurrent!.per100);
  const alene = rader.length - medKonkurranse.length;
  const medDomene = Object.values(data.butikker).reduce((n, liste) => n + liste.filter((b) => b.domene).length, 0);
  const topp = vinnere.slice(0, 8);

  // Medlemskapene som egne kort, slik Kort-siden viser dem: tillegget på alle kjøp, vekslet.
  const medlemskap = klarna.nivaer
    .filter((n) => n.kanVeksle !== false && n.ekstraProsent > 0)
    .map((n) => ({ ...n, per100: n.ekstraProsent * (konv?.poengPerKrone ?? 0) }))
    .sort((a, b) => b.per100 - a.per100);

  // Eksempelet i Google-stripen: en vinner med norsk nettadresse, helst med alle tre programmene.
  const demoKandidater = [...vinnere, ...rader].filter((r) => r.butikk.domene);
  const demo =
    demoKandidater.find((r) => r.butikk.domene!.endsWith('.no') && Object.keys(r.butikk.satser).length >= 3) ??
    demoKandidater.find((r) => r.butikk.domene!.endsWith('.no')) ??
    demoKandidater[0] ??
    null;
  const demoSatser = demo
    ? [
        { navn: klarna.kortnavn, farge: klarna.farge, tekst: satsTekst(klarna, demo.grunn), per100: demo.per100 },
        ...andre
          .filter((p) => demo.butikk.satser[p.id])
          .map((p) => {
            const sats = gjeldendeSats(demo.butikk.satser[p.id], idag).verdi;
            return { navn: p.kortnavn, farge: p.farge, tekst: satsTekst(p, sats), per100: per100(p, sats) };
          }),
      ].sort((a, b) => b.per100 - a.per100)
    : [];

  return (
    <div className="app klarna">
      <header className="topp">
        <div>
          <a className="merke-rad" href="/no">
            <Logo />
            <span className="ordmerke">Pointmaxing</span>
          </a>
          <span className="slagord">Partnerforslag til Klarna · {fmtDato(data.hentet)}</span>
        </div>
      </header>

      <div className="billett">
        <span className="etikett">Hva Klarna får</span>
        <h1>
          Vi sender poengjegere til <em>Klarna Max</em>.
        </h1>
        <p className="ingress">
          Pointmaxing viser hvor et kjøp gir flest SAS EuroBonus-poeng: Trumf, Klarna eller SAS Online Shopping. Klarna-satsen vises ferdig
          regnet med medlemskapet, og med Max vinner Klarna i {vinnere.length} av de {medKonkurranse.length} butikkene der programmene
          konkurrerer.
        </p>

        <div className="nokkeltall">
          <div>
            <span className="poeng">{rader.length}</span>
            <span className="per100">Klarna-butikker i Norge på Pointmaxing</span>
          </div>
          <div>
            <span className="poeng">
              {vinnere.length}
              <sup>/{medKonkurranse.length}</sup>
            </span>
            <span className="per100">butikker med konkurranse der Max gir flest poeng</span>
          </div>
          <div>
            <span className="poeng">{medDomene}</span>
            <span className="per100">butikker merkes i Google-søk av utvidelsen</span>
          </div>
        </div>
        {alene > 0 && <p className="fotnote">I {alene} av butikkene er Klarna det eneste programmet med avtale.</p>}

        <div className="perforering" aria-hidden="true" />

        <span className="etikett">Max-effekten i hver butikk</span>
        <p className="ingress">
          Uten medlemskap kan ikke Klarna-poeng veksles til EuroBonus. Med medlemskap ganges butikkens cashback og medlemscashbacken legges på –
          i en butikk med {fmtTall(EKSEMPEL_SATS)} % ser det slik ut:
        </p>
        <div className="trinn">
          {klarna.nivaer.map((n) => {
            const kan = n.kanVeksle !== false;
            return (
              <div key={n.id} className={n.id === max.id ? 'max' : undefined}>
                <span className="etikett">{n.navn}</span>
                <span className="sats">
                  {kan ? `${fmtTall(effektivProsent(EKSEMPEL_SATS, n))} %` : `${fmtTall(EKSEMPEL_SATS)} %`}
                  {n.butikkFaktor > 1 && <small> ×{n.butikkFaktor} + {fmtTall(n.ekstraProsent)} %</small>}
                </span>
                <span className="per100">{kan ? `${fmtPer100(per100(klarna, EKSEMPEL_SATS, n.id))} p/100 kr` : 'kan ikke veksles'}</span>
              </div>
            );
          })}
        </div>

        <span className="etikett liste-etikett">Butikkene der Max gir flest poeng</span>
        <ul className="butikkrader">
          {topp.map((r) => (
            <li key={r.butikk.id}>
              <a href={`/no/${r.butikk.id}`}>
                <ButikkLogo butikk={r.butikk} />
                <span className="rad-tekst">
                  <span className="rad-navn">{r.butikk.navn}</span>
                  <span className="rad-under">
                    <i style={{ background: klarna.farge }} />
                    Klarna {fmtTall(r.grunn)} % → {fmtTall(r.medMax)} % med Max
                    {r.konkurrent && (
                      <>
                        {' · '}
                        <i style={{ background: r.konkurrent.program.farge }} />
                        {r.konkurrent.program.kortnavn} {satsTekst(r.konkurrent.program, r.konkurrent.sats)} = {fmtPer100(r.konkurrent.per100)} p
                      </>
                    )}
                  </span>
                </span>
                <span className="rad-poeng">
                  {fmtPer100(r.per100)}
                  <small>p/100 kr</small>
                </span>
              </a>
            </li>
          ))}
        </ul>
        {vinnere.length > topp.length && (
          <p className="fotnote">
            <a href="/no/butikker">… og {vinnere.length - topp.length} butikker til der Max vinner →</a>
          </p>
        )}

        <div className="perforering" aria-hidden="true" />

        <span className="etikett">Kort-siden</span>
        <p className="ingress">Plus, Premium og Max står hver for seg blant kortene som gir EuroBonus, med søknadslenke rett til Klarna.</p>
        <section className="kortliste">
          <ul>
            {medlemskap.map((n) => (
              <li key={n.id}>
                <span className="kortliste-poeng">
                  {fmtTall(n.per100)}
                  {konv?.status === 'uverifisert' && <sup>*</sup>}
                  <small>p/100 kr</small>
                </span>
                <span className="kortliste-tekst">
                  <span className="kortliste-navn">Klarna {n.navn}</span>
                  <span className="muted">
                    {n.prisPerMnd} kr/mnd · {fmtTall(n.ekstraProsent)} % på alle kjøp med Klarna-kortet
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <p className="fotnote">
          <a href="/no/kort">Se Kort-siden →</a>
        </p>

        <div className="perforering" aria-hidden="true" />

        <span className="etikett">Utvidelsen i Google-søk</span>
        <p className="ingress">
          Chrome-utvidelsen legger satsene inn i Google-søk på google.no, .se og .dk – for de {medDomene} butikkene Klarna oppgir nettadresse for.
          Slik ser det ut{demo ? ` for ${demo.butikk.navn}` : ''}:
        </p>
        {demo && (
          <div className="google-demo" role="img" aria-label={`Google-søk med Pointmaxing-stripe for ${demo.butikk.navn}`}>
            <div className="gd-stripe">
              <span className="gd-merke">
                <span className="gd-p">P</span>Pointmaxing
              </span>
              <span className="gd-butikk">
                <b>{demo.butikk.navn}</b>
                {demoSatser.map((s, i) => (
                  <span key={s.navn} className={`gd-sats${i === 0 ? ' gd-best' : ''}`}>
                    <i style={{ background: s.farge }} />
                    {s.navn} {s.tekst}
                    {i === 0 && <small>flest poeng</small>}
                  </span>
                ))}
              </span>
              <span className="gd-lukk">×</span>
            </div>
            <div className="gd-treff">
              <span className="gd-site">
                <span className="gd-fav" aria-hidden="true">
                  {demo.butikk.navn.charAt(0)}
                </span>
                <span>
                  {demo.butikk.navn}
                  <small>https://www.{demo.butikk.domene}</small>
                </span>
              </span>
              <span className="gd-tittel">{demo.butikk.navn}</span>
              <span className="gd-linje">
                <span className="gd-p">P</span>
                {demoSatser.map((s, i) => (
                  <span key={s.navn} className={`gd-sats${i === 0 ? ' gd-best' : ''}`}>
                    <i style={{ background: s.farge }} />
                    {s.navn} {s.tekst}
                    {i === 0 && <small>flest poeng</small>}
                  </span>
                ))}
                <span className="gd-regn">Regn ut →</span>
              </span>
              <span className="gd-snipp" aria-hidden="true" />
              <span className="gd-snipp kort" aria-hidden="true" />
            </div>
          </div>
        )}

        <div className="perforering" aria-hidden="true" />

        <span className="etikett">Det vi foreslår</span>
        <ul className="forslag">
          <li>Fast beløp per aktivert Plus, Premium og Max via sporbar lenke.</li>
          <li>Lenkene står der valget tas: «Handle via Klarna» i hver butikk, søknadslenkene på Kort-siden og linjen i Google-søk.</li>
        </ul>
        <p className="kontakt">
          <a className="knapp" href={`mailto:${KONTAKT.epost}?subject=Pointmaxing%20og%20Klarna`}>
            Skriv til {KONTAKT.navn.split(' ')[0]} →
          </a>
          <span className="muted">
            {KONTAKT.navn} · {KONTAKT.epost}
          </span>
        </p>
      </div>

      <footer>
        <p>Satser hentet {fmtDato(data.hentet)} fra Klarna-appen, Trumf Netthandel og SAS Online Shopping. Trumf med automatisk overføring.</p>
        {konv && (
          <p>
            {konv.status === 'uverifisert' ? '* ' : ''}
            {fmtTall(konv.poengPerKrone ?? 0)} EuroBonus-poeng per 100 Klarna-poeng ifølge{' '}
            {konv.kilde.startsWith('http') ? (
              <a href={konv.kilde} target="_blank" rel="noreferrer">
                klarna.com
              </a>
            ) : (
              konv.kilde.toLowerCase()
            )}
            , sjekket {fmtDato(konv.sistVerifisert)}.{konv.merknad ? ` ${konv.merknad}` : ''}
          </p>
        )}
        <p className="signatur">Pointmaxing · pointmaxing.no</p>
      </footer>
    </div>
  );
}
