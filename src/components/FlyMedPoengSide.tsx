import { useEffect } from 'react';
import type { Datasett, Land, Program } from '../data/types';
import { tekst } from '../i18n';
import { gjeldendeSats } from '../lib/butikker';
import { beregnProgram } from '../lib/calc';
import { fmtDato, fmtPoeng, fmtTall } from '../lib/format';
import Logo from './Logo';

interface Props {
  data: Datasett;
  idag: string;
}

const LANDENE: Land[] = ['NO', 'SE', 'DK'];
const KONTAKT = { navn: 'Kjetil Skarstein-Hatlen', epost: 'kjetil@inora.no' };

/** EuroBonus-poeng per 100 kr for en butikksats, uten kort. */
const per100 = (p: Program, sats: number, nivaId?: string) => beregnProgram(p, { programId: p.id, aktiv: true, sats, nivaId }, 100, null).total;

/** Samarbeidsforslag til FlyMedPoeng: vi hjelper folk å tjene poengene, de hjelper dem å bruke dem. Tallene er dagens. */
export default function FlyMedPoengSide({ data, idag }: Props) {
  useEffect(() => {
    document.title = 'Pointmaxing × FlyMedPoeng';
  }, []);

  const partner = data.samarbeid;
  const butikker = LANDENE.reduce((n, land) => n + data.butikker[land].length, 0);
  const kampanjer = data.kampanjer.filter((k) => !k.slutt || k.slutt >= idag).length;

  // Klarna Max i Norden: butikkene der Klarna møter Trumf eller SAS Shopping, og hvor ofte Max gir flest poeng.
  let konkurranse = 0;
  let vinner = 0;
  for (const land of LANDENE) {
    const programmer = data.programmer.filter((p) => p.land === land);
    const klarna = programmer.find((p) => p.id.startsWith('klarna'));
    if (!klarna) continue;
    const max = klarna.nivaer.find((n) => n.id === 'max') ?? klarna.nivaer[klarna.nivaer.length - 1];
    const andre = programmer.filter((p) => p.id !== klarna.id);
    for (const b of data.butikker[land].filter((x) => x.satser[klarna.id])) {
      const konkurrenter = andre.filter((p) => b.satser[p.id]).map((p) => per100(p, gjeldendeSats(b.satser[p.id], idag).verdi));
      if (konkurrenter.length === 0) continue;
      konkurranse++;
      if (per100(klarna, gjeldendeSats(b.satser[klarna.id], idag).verdi, max.id) > Math.max(...konkurrenter)) vinner++;
    }
  }
  const klarnaNo = data.programmer.find((p) => p.id === 'klarna');
  const maxNo = klarnaNo?.nivaer.find((n) => n.id === 'max');
  const klarnaKort = klarnaNo && maxNo ? maxNo.ekstraProsent * (klarnaNo.konverteringer[0]?.poengPerKrone ?? 0) : null;
  const elite = data.kort.find((k) => k.id === 'sas-amex-elite');

  return (
    <div className="app klarna flymedpoeng">
      <header className="topp">
        <div>
          <a className="merke-rad" href="/no">
            <Logo />
            <span className="ordmerke">Pointmaxing</span>
          </a>
          <span className="slagord">Samarbeidsforslag til {partner.navn} · {fmtDato(data.hentet)}</span>
        </div>
      </header>

      <div className="billett">
        <span className="etikett">Tjene og bruke</span>
        <h1>
          Vi hjelper folk å tjene poengene. <em>Dere hjelper dem å bruke dem.</em>
        </h1>
        <p className="ingress">
          Pointmaxing viser hvor et kjøp gir flest SAS EuroBonus-poeng: Trumf, Klarna eller SAS Online Shopping, side om side. Når poengene er tjent,
          er {partner.navn} neste steg.
        </p>

        <div className="nokkeltall">
          <div>
            <span className="poeng">{fmtTall(butikker)}</span>
            <span className="per100">butikker i Norge, Sverige og Danmark, oppdatert hver natt</span>
          </div>
          <div>
            <span className="poeng">{data.kort.length}</span>
            <span className="per100">betalingskort som gir EuroBonus, sammenlignet på pris per poeng</span>
          </div>
          <div>
            <span className="poeng">{kampanjer}</span>
            <span className="per100">kampanjer og velkomstbonuser, hentet hver dag</span>
          </div>
        </div>
        <p className="fotnote">Og en Chrome-utvidelse som viser poengene rett i Google-søk og i nettbutikken.</p>

        <div className="perforering" aria-hidden="true" />

        <span className="etikett">Det vi gir {partner.navn}</span>
        <p className="ingress">To lenker der poengjegerne tar valgene sine. De er ferdig bygget og kan slås på med én gang.</p>
        <div className="plassering">
          <span className="etikett">Under resultatet i kalkulatoren</span>
          <p className="samarbeid">
            <span className="demo-lenke">
              {tekst('NO', 'brukPoengene', { navn: partner.navn })} <span aria-hidden="true">→</span>
            </span>
          </p>
        </div>
        <div className="plassering">
          <span className="etikett">På Kort-siden</span>
          <p className="samarbeid">
            <span className="demo-lenke">
              {tekst('NO', 'kortveiledning', { navn: partner.navn })} <span aria-hidden="true">→</span>
            </span>
          </p>
        </div>
        <p className="fotnote">Lenkene har sporingsparametre (utm_source=pointmaxing), så besøkene fra oss synes i statistikken deres.</p>

        <div className="perforering" aria-hidden="true" />

        <span className="etikett">Det vi ønsker oss</span>
        <ul className="forslag">
          <li>Lenker til Pointmaxing når dere gir tips om å tjene poeng: i bloggen, i kurset og på Instagram, TikTok og Facebook.</li>
          <li>Pointmaxing som verktøy i kurset, for eksempel «finn butikken som gir flest poeng».</li>
          <li>En rabattkode, for eksempel POINTMAXING. Kundene får avslag, dere ser salgene som kom via oss, og vi finner en grei deling.</li>
        </ul>

        <div className="perforering" aria-hidden="true" />

        <span className="etikett">Hvorfor nå</span>
        <p className="ingress">
          Klarna Max har endret markedet. Max gir flest poeng i {vinner} av de {konkurranse} butikkene der Klarna møter Trumf eller SAS Shopping i
          Norden
          {klarnaKort !== null && elite
            ? `, og Klarna-kortet gir ${fmtTall(klarnaKort)} poeng per 100 kr – nesten som SAS Amex Elite med ${fmtTall(elite.poengPer100)}`
            : ''}
          . Sverige og Danmark har fått like gode muligheter som Norge: flere som tjener poeng, flere som trenger hjelp til å bruke dem.
        </p>

        <p className="kontakt">
          <a className="knapp" href={`mailto:${KONTAKT.epost}?subject=Pointmaxing%20og%20${encodeURIComponent(partner.navn)}`}>
            Skriv til {KONTAKT.navn.split(' ')[0]} →
          </a>
          <span className="muted">
            {KONTAKT.navn} · {KONTAKT.epost}
          </span>
        </p>
      </div>

      <footer>
        <p>
          Tall hentet {fmtDato(data.hentet)} fra Trumf Netthandel, SAS Online Shopping og Klarna. {fmtPoeng(vinner)} av {fmtPoeng(konkurranse)} regnet med
          Klarna Max mot beste av Trumf og SAS Shopping i hver butikk.
        </p>
        <p className="signatur">Pointmaxing · pointmaxing.no</p>
      </footer>
    </div>
  );
}
