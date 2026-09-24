import type { Land, Reisedata } from '../data/types';
import { tekst } from '../i18n';
import { fmtTall } from '../lib/format';

interface Props {
  land: Land;
  reise: Reisedata;
}

const Pil = () => <span aria-hidden="true">→</span>;

/** Reise: leiebil som gir EuroBonus-poeng, og erstatning for forsinket fly. */
export default function Reise({ land, reise }: Props) {
  const fly = reise.flyforsinkelse;
  const tjeneste = fly.tjeneste[land];

  return (
    <section className="kortliste reise">
      <h2 className="etikett">{tekst(land, 'leiebil')}</h2>
      <ul className="med-logo">
        {reise.leiebil.map((p) => (
          <li key={p.id}>
            <span className="reise-logo">
              <img src={p.logo} alt={p.navn} loading="lazy" />
            </span>
            <span className="kortliste-poeng">
              {fmtTall(p.poeng)}
              <small>{tekst(land, 'perLeie')}</small>
            </span>
            <span className="kortliste-tekst">
              <span className="kortliste-navn">{p.navn}</span>
              <span className="muted">{p.detaljer[land]}</span>
            </span>
            <a href={p.lenke[land]} target="_blank" rel={p.annonse ? 'sponsored noreferrer' : 'noreferrer'}>
              {tekst(land, 'bestillHos', { navn: p.navn })} <Pil />
              {p.annonse && <span className="annonse">{tekst(land, 'annonse')}</span>}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="etikett reise-fly">{tekst(land, 'forsinketFly')}</h2>
      <p className="muted kortliste-intro">{tekst(land, 'flyIntro')}</p>
      <dl className="reise-belop">
        {fly.belop.map((b) => (
          <div key={b.id}>
            <dd>{fmtTall(b.euro)} €</dd>
            <dt>{tekst(land, b.id)}</dt>
          </div>
        ))}
      </dl>
      <ul className="med-logo">
        <li>
          <span className="reise-logo">
            <img src="/logos/reise/sas.webp" alt="SAS" loading="lazy" />
          </span>
          <span className="kortliste-poeng">
            0 %<small>{tekst(land, 'honorar')}</small>
          </span>
          <span className="kortliste-tekst">
            <span className="kortliste-navn">{tekst(land, 'kravSelv')}</span>
          </span>
          <a href={fly.selv[land]} target="_blank" rel="noreferrer">
            {tekst(land, 'tilSkjemaet')} <Pil />
          </a>
        </li>
        {tjeneste && (
          <li>
            <span className="reise-logo">
              <img src={tjeneste.logo} alt={tjeneste.navn} loading="lazy" />
            </span>
            <span className="kortliste-poeng">
              {fmtTall(tjeneste.honorar)} %<small>{tekst(land, 'honorar')}</small>
            </span>
            <span className="kortliste-tekst">
              <span className="kortliste-navn">{tjeneste.navn}</span>
              <span className="muted">{tekst(land, 'bareVedSeier')}</span>
            </span>
            <a href={tjeneste.lenke} target="_blank" rel={tjeneste.annonse ? 'sponsored noreferrer' : 'noreferrer'}>
              {tekst(land, 'sendSaken')} <Pil />
              {tjeneste.annonse && <span className="annonse">{tekst(land, 'annonse')}</span>}
            </a>
          </li>
        )}
      </ul>
      <p className="muted reise-forbehold">
        {tekst(land, 'flyForbehold')}{' '}
        <a className="lenke" href={fly.kilde} target="_blank" rel="noreferrer">
          EU 261/2004
        </a>
      </p>
    </section>
  );
}
