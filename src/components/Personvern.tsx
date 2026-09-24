import { useEffect } from 'react';
import analyse from '../data/analyse.json';

const KONTAKT = 'kjetil@inora.no';
const DATO = '24.09.2026';

/** Personvern for nettsiden og utvidelsen. Kort, fordi det er lite å fortelle: vi samler ikke inn noe. */
export default function Personvern() {
  useEffect(() => {
    document.title = 'Personvern – Pointmaxing';
  }, []);

  return (
    <section className="personvern">
      <h2 className="etikett">Personvern</h2>
      <p className="ingress">Pointmaxing samler ikke inn personopplysninger, verken på nettsiden eller i utvidelsen. Sist oppdatert {DATO}.</p>

      <h3>Nettsiden pointmaxing.no</h3>
      <ul>
        <li>Ingen informasjonskapsler, ingen sporing, ingen analyseverktøy.</li>
        <li>Valgene dine (beløp, kort, Klarna-nivå, butikker du følger) lagres bare i nettleseren din (localStorage) og sendes ingen steder.</li>
        <li>Siden ligger på GitHub Pages og henter skrifttyper fra Google Fonts. Disse tjenestene ser IP-adressen din når siden lastes, slik alle nettsider gjør.</li>
        {analyse.cloudflareToken && (
          <li>Besøkstall telles uten informasjonskapsler med Cloudflare Web Analytics: antall besøk og hvilke sider, ingen personopplysninger.</li>
        )}
      </ul>

      <h3>Nettleserutvidelsen</h3>
      <ul>
        <li>Utvidelsen leser adressen til fanen du står i, lokalt i nettleseren, for å kjenne igjen nettbutikken. Adressen sendes ikke videre.</li>
        <li>Den henter én offentlig fil med satser fra pointmaxing.no én gang i døgnet. Ingen opplysninger om deg følger med.</li>
        <li>På Google-søk og i kjente nettbutikker leser den bare hvilke domener treffene og siden peker til – aldri skjemaer, passord eller det du skriver.</li>
        <li>Innstillinger og butikker du følger lagres i utvidelsens eget lager på din maskin. Varsler lages lokalt.</li>
        <li>Ingenting sendes til oss eller til tredjeparter. Utvidelsen har ingen konto, ingen innlogging og ingen sporing.</li>
      </ul>

      <h3>Kontakt</h3>
      <p>
        Spørsmål om personvern: <a href={`mailto:${KONTAKT}`}>{KONTAKT}</a>.
      </p>

      <h3>Privacy policy (English)</h3>
      <p>
        Pointmaxing collects no personal data. The website uses no cookies or analytics; your settings stay in your browser. The browser extension reads the URL of the
        current tab locally to recognise the store, fetches one public JSON file of rates from pointmaxing.no once a day, and stores your settings and followed stores
        locally in the extension. On Google search results and known store domains it only reads which domains the links point to. Nothing is sent to us or to any
        third party. Contact: {KONTAKT}.
      </p>
    </section>
  );
}
