import type { Flyforsinkelse as Flydata, Land } from '../data/types';
import { tekst } from '../i18n';
import { fmtTall } from '../lib/format';

interface Props {
  land: Land;
  fly: Flydata;
}

/** Forsinket fly: hva EU-forordningen gir, og tjenesten som fører saken for deg. Lenken gir oss provisjon – det står rett under siden. */
export default function Flyforsinkelse({ land, fly }: Props) {
  const tjeneste = fly.tjeneste[land];
  if (!tjeneste) return null;

  return (
    <section className="kortliste fly">
      <h2 className="etikett">{tekst(land, 'navFly')}</h2>
      <p className="muted kortliste-intro">{tekst(land, 'flyIntro')}</p>
      <dl className="fly-belop">
        {fly.belop.map((b) => (
          <div key={b.id}>
            <dd>{fmtTall(b.euro)} €</dd>
            <dt>{tekst(land, b.id)}</dt>
          </div>
        ))}
      </dl>
      <ul className="med-logo">
        <li>
          <span className="fly-logo">
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
            {tekst(land, 'sendSaken')} <span aria-hidden="true">→</span>
          </a>
        </li>
      </ul>
      <p className="muted fly-forbehold">
        {tekst(land, 'kravSelvGratis')} {tekst(land, 'flyForbehold')}{' '}
        <a href={fly.kilde} target="_blank" rel="noreferrer">
          EU 261/2004
        </a>
      </p>
    </section>
  );
}
