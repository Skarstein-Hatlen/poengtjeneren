import type { Kort, Land } from '../data/types';
import { tekst } from '../i18n';
import { fmtPoeng, fmtTall, parseTall } from '../lib/format';

interface Props {
  land: Land;
  kort: Kort[];
  lenke: (k: Kort) => string | null;
  /** Kortforbruk per år som tekst – styrer poeng per år og kostnad per poeng. */
  kortbruk: string;
  onKortbruk: (verdi: string) => void;
  idag: string;
}

const TILLATT = /^[\d\s.,]*$/;

/** Årsavgiften som gjelder i dag. undefined = ukjent. */
function avgift(k: Kort, idag: string): number | undefined {
  if (k.arsavgiftFra && idag >= k.arsavgiftFra.dato) return k.arsavgiftFra.kr;
  return k.arsavgift;
}

/** Poeng per år, kostnad per poeng (øre) og det samme første året med velkomstbonus. */
function regn(k: Kort, kortbruk: number, idag: string) {
  const poengAr = (Math.min(kortbruk, k.tak ?? Infinity) * k.poengPer100) / 100;
  const a = avgift(k, idag);
  const ore = a === undefined || poengAr <= 0 ? null : (a / poengAr) * 100;
  const velkomst = k.velkomst && (kortbruk * k.velkomst.mnd) / 12 >= k.velkomst.krav ? k.velkomst.poeng : 0;
  const aForste = k.arsavgiftForsteAr ?? a;
  const oreForste = aForste === undefined || poengAr + velkomst <= 0 || (velkomst === 0 && k.arsavgiftForsteAr === undefined) ? null : (aForste / (poengAr + velkomst)) * 100;
  return { poengAr, ore, velkomst, oreForste };
}

/** Alle kort i landet som gir EuroBonus-poeng, med søknadslenke – og hva poengene koster. */
export default function Kortliste({ land, kort, lenke, kortbruk, onKortbruk, idag }: Props) {
  const bruk = parseTall(kortbruk);
  const rader = kort.map((k) => ({ k, ...regn(k, bruk, idag) }));
  // Med et kortforbruk sorteres det på hva poengene koster; kort uten kjent avgift sist.
  rader.sort((a, b) => {
    if (bruk > 0 && (a.ore !== null || b.ore !== null)) {
      if (a.ore === null) return 1;
      if (b.ore === null) return -1;
      return a.ore - b.ore || b.k.poengPer100 - a.k.poengPer100;
    }
    return b.k.poengPer100 - a.k.poengPer100;
  });

  return (
    <section className="kortliste">
      <h2 className="etikett">{tekst(land, 'kortTittel')}</h2>
      <p className="muted kortliste-intro">{tekst(land, 'kortForklaring')}</p>
      <div className="valg-rad rad-kort kortbruk">
        <label className="etikett" htmlFor="kortbruk">
          {tekst(land, 'kortbrukPerAr')}
        </label>
        <span className="tall">
          <input
            id="kortbruk"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={kortbruk}
            onChange={(e) => {
              if (TILLATT.test(e.target.value)) onKortbruk(e.target.value);
            }}
          />
          <span className="enhet">kr</span>
        </span>
        <span />
      </div>
      <ul>
        {rader.map(({ k, poengAr, ore, velkomst, oreForste }) => {
          const url = lenke(k);
          const a = avgift(k, idag);
          return (
            <li key={k.id}>
              <span className="kortliste-poeng">
                {fmtTall(k.poengPer100)}
                {k.status === 'uverifisert' && <sup>*</sup>}
              </span>
              <span className="kortliste-tekst">
                <span className="kortliste-navn">{k.navn}</span>
                <span className="muted">
                  {k.pris}
                  {k.merknad ? ` · ${k.merknad}` : ''}
                </span>
                {bruk > 0 && (
                  <span className="kortliste-netto">
                    {tekst(land, 'poengPerAr', { n: fmtPoeng(poengAr) })}
                    {ore !== null && ` · ${a === 0 ? tekst(land, 'ingenArsavgift') : tekst(land, 'orePerPoeng', { n: fmtTall(ore) })}`}
                    {oreForste !== null && oreForste !== ore && ` · ${velkomst > 0 ? tekst(land, 'forsteArMedVelkomst', { n: fmtTall(oreForste), v: fmtPoeng(velkomst) }) : tekst(land, 'forsteAr', { n: fmtTall(oreForste) })}`}
                  </span>
                )}
              </span>
              {url && (
                <a href={url} target="_blank" rel={k.annonse ? 'sponsored noreferrer' : 'noreferrer'}>
                  {tekst(land, 'sokOmKortet')} <span aria-hidden="true">→</span>
                  {k.annonse && <span className="annonse">{tekst(land, 'annonse')}</span>}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
