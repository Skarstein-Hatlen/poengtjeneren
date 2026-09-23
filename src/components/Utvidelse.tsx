import { useEffect } from 'react';
import manifest from '../../extension/manifest.json';
import utvidelse from '../data/utvidelse.json';

/** Chrome-utvidelsen: hva den gjør og hvordan du legger den til. */
export default function Utvidelse() {
  useEffect(() => {
    document.title = 'Chrome-utvidelse – Pointmaxing';
  }, []);
  const butikk = utvidelse.chromeWebStoreUrl;

  return (
    <section className="utvidelse">
      <h2 className="etikett">Chrome-utvidelse · versjon {manifest.version}</h2>
      <p className="ingress">Poengene der du faktisk er, uten å åpne Pointmaxing.</p>
      <ul className="forslag">
        <li>
          <b>I Google-søk:</b> en rolig stripe øverst og en linje under treffene som er butikker vi kjenner – Trumf, Klarna og SAS Shopping side om side, med den beste
          merket.
        </li>
        <li>
          <b>I nettbutikken:</b> et lite kort nede til høyre med satsene og «Åpne via …» til siden kjøpet må starte fra for å få poengene.
        </li>
        <li>
          <b>Varsler:</b> følg en butikk her på siden, så sier utvidelsen fra når satsen går opp. Klarna-nivået ditt følger med automatisk.
        </li>
      </ul>

      {butikk ? (
        <p className="kontakt">
          <a className="knapp" href={butikk} target="_blank" rel="noreferrer">
            Legg til i Chrome →
          </a>
        </p>
      ) : (
        <>
          <p className="ingress">Utvidelsen venter på godkjenning i Chrome Web Store. Inntil da kan du legge den til selv:</p>
          <p className="kontakt">
            <a className="knapp" href={utvidelse.zip}>
              Last ned utvidelsen (zip) →
            </a>
          </p>
          <ol className="steg">
            <li>Pakk ut zip-filen til en mappe.</li>
            <li>
              Åpne <code>chrome://extensions</code> og slå på «Utviklermodus» øverst til høyre.
            </li>
            <li>Velg «Last inn upakket» og pek på mappen.</li>
          </ol>
          <p className="fotnote">
            Firefox: <a href={utvidelse.zipFirefox}>egen zip</a>, lastes inn midlertidig via <code>about:debugging</code> → «Dette Firefox» → «Last inn midlertidig
            tillegg». Ikke testet like grundig som Chrome.
          </p>
        </>
      )}

      <p className="fotnote">
        Utvidelsen sender ingenting om deg til oss eller andre – se <a href="/personvern">personvern</a>.
      </p>
    </section>
  );
}
