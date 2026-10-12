import { interpolate, useCurrentFrame } from 'remotion';
import { Avslutning, F, FlyOvergang, Kort, Krok, Logo, Ramme, klamp, per100Tekst, smal, tall, useFrem, useInn } from './felles';

// «Ukens beste»: topp 5 akkurat nå, det som gikk opp siste 7 dager og største velkomstbonus. 20 sekunder.

export type UkensProps = {
  uke: number;
  topp: { id: string; navn: string; logo: string | null; program: string; farge: string; per100: number }[];
  opp: { id: string; navn: string; logo: string | null; program: string; farge: string; fra: number; til: number; enhet: string }[];
  bonuser: { navn: string; tekst: string; poeng: number; logo: string | null }[];
  butikkerTotalt: number;
};

/** Lengden i bilder: scenene som finnes, pluss avslutningen. */
export const ukensLengde = ({ opp, bonuser }: Pick<UkensProps, 'opp' | 'bonuser'>) => (opp.length ? 420 : 300) + (bonuser.length ? 96 : 0) + 24 + 96;

const sats = (v: number, enhet: string) => (enhet === '%' ? `${tall(v, 1)} %` : `${tall(v)} p`);

export const UkensBeste = ({ uke, topp, opp, bonuser, butikkerTotalt }: UkensProps) => {
  const frame = useCurrentFrame();
  const inn = useInn();
  const frem = useFrem();
  const scene = (fra: number, til: number) => interpolate(frame, [til - 16, til], [1, 0], klamp) * inn(fra, 16);
  const harOpp = opp.length > 0;
  const harBonus = bonuser.length > 0;
  // Scenene: topp 5 (90–300), gikk opp (300–420), velkomstbonus (420–510), avslutning.
  const oppFra = 300;
  const bonusFra = harOpp ? 420 : 300;
  const slutt = harBonus ? bonusFra + 96 : bonusFra;

  return (
    <Ramme>
      <Krok etikett={`Ukens beste · uke ${uke}`} linjer={['Flest EuroBonus-', 'poeng denne uken']} oppFra={66} utFra={slutt} />

      {/* Topp 5 */}
      <Kort top={500} style={{ opacity: scene(88, oppFra), transform: `translateY(${(1 - inn(88, 16)) * 140}px)` }}>
        <div style={{ padding: '26px 48px 6px', fontWeight: 600, fontSize: 26, letterSpacing: '0.16em', color: F.dempet }}>FLEST POENG NÅ · PER 100 KR</div>
        {topp.slice(0, 5).map((t, i) => {
          const start = 104 + i * 30;
          const synlig = inn(start - 4);
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '18px 48px', borderTop: i ? `2px solid ${F.strek}` : 'none', opacity: synlig, transform: `translateX(${(1 - synlig) * -50}px)` }}>
              <Logo src={t.logo} navn={t.navn} b={150} h={74} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 44, color: F.blekk, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.navn}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 28, color: F.dempet }}>
                  <i style={{ width: 16, height: 16, borderRadius: 8, background: t.farge }} />
                  via {t.program}
                </div>
              </div>
              <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 96, lineHeight: 1, color: i === 0 ? F.blekk : F.dempet, fontVariantNumeric: 'tabular-nums' }}>
                {per100Tekst(t.per100 * frem(start, 36))}
              </div>
            </div>
          );
        })}
      </Kort>

      {/* Gikk opp */}
      {harOpp ? (
        <Kort top={500} style={{ opacity: scene(oppFra + 4, bonusFra), transform: `translateY(${(1 - inn(oppFra + 4, 16)) * 120}px)` }}>
          <div style={{ padding: '26px 48px 6px', fontWeight: 600, fontSize: 26, letterSpacing: '0.16em', color: F.dempet }}>GIKK OPP SISTE 7 DAGER</div>
          {opp.slice(0, 3).map((o, i) => {
            const synlig = inn(oppFra + 14 + i * 16);
            return (
              <div key={`${o.id}-${o.program}`} style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '20px 48px', borderTop: i ? `2px solid ${F.strek}` : 'none', opacity: synlig }}>
                <Logo src={o.logo} navn={o.navn} b={150} h={74} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 44, color: F.blekk, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.navn}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 28, color: F.dempet }}>
                    <i style={{ width: 16, height: 16, borderRadius: 8, background: o.farge }} />
                    {o.program} · fra {sats(o.fra, o.enhet)}
                  </div>
                </div>
                <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 84, lineHeight: 1, color: F.gull }}>{sats(o.til, o.enhet)}</div>
              </div>
            );
          })}
        </Kort>
      ) : null}

      {/* Største velkomstbonus */}
      {harBonus ? (
        <div style={{ position: 'absolute', left: 60, right: 60, top: 560, opacity: scene(bonusFra + 4, slutt) }}>
          <div style={{ fontWeight: 600, fontSize: 30, letterSpacing: '0.16em', color: F.gullfyll }}>STØRSTE VELKOMSTBONUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 28 }}>
            <Logo src={bonuser[0].logo} navn={bonuser[0].navn} b={200} h={100} />
            <div style={{ fontWeight: 600, fontSize: 56, color: F.krem }}>{bonuser[0].navn}</div>
          </div>
          <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 240, lineHeight: 1, color: F.gullfyll, marginTop: 24, fontVariantNumeric: 'tabular-nums' }}>
            {tall(Math.round(bonuser[0].poeng * frem(bonusFra + 10, 34)))}
          </div>
          <div style={{ fontWeight: 500, fontSize: 44, color: F.krem }}>EuroBonus-poeng</div>
          <div style={{ marginTop: 26, fontSize: 34, lineHeight: 1.35, color: F.lys, maxWidth: 900 }}>{bonuser[0].tekst}</div>
        </div>
      ) : null}

      <FlyOvergang fra={slutt} />
      <Avslutning fra={slutt + 24} linjer={['Sjekk butikken', 'før du handler']} under={`Gratis · ${tall(Math.floor(butikkerTotalt / 100) * 100)}+ nettbutikker`} />
    </Ramme>
  );
};
