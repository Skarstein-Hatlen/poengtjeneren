import { useCurrentFrame } from 'remotion';
import { Avslutning, F, FlyOvergang, Kort, Krok, Logo, Ramme, smal, tall, useFrem, useInn } from './felles';

// «Samme kjøp, tre svar»: én butikk, 1 000 kr, programmene teller opp og vinneren kommer sist.
// Brukes både til butikkduellen (ukens butikk) og eksempelet med Lyko. 15 sekunder.

export type ButikkProps = {
  butikk: { id: string; navn: string; logo: string | null };
  rader: { navn: string; farge: string; poeng: number; opptil: boolean }[];
  belop: number;
  butikkerTotalt: number;
};

export const SammeKjop = ({ butikk, rader, belop, butikkerTotalt }: ButikkProps) => {
  const frame = useCurrentFrame();
  const inn = useInn();
  const frem = useFrem();
  const vinner = rader[rader.length - 1];
  const nest = rader[rader.length - 2];
  const ut = frame < 326 ? 1 : Math.max(0, 1 - (frame - 326) / 18);

  return (
    <Ramme>
      <Krok etikett={`${tall(belop)} kr i handlekurven`} linjer={['Handler du', `på ${butikk.navn}?`]} oppFra={64} utFra={326} />

      <Kort top={500} style={{ opacity: inn(84, 16) * ut, transform: `translateY(${(1 - inn(84, 16)) * 140}px)` }}>
        <div style={{ padding: '28px 48px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo src={butikk.logo} navn={butikk.navn} b={230} h={108} />
          <div style={{ fontWeight: 500, fontSize: 34, color: F.dempet }}>Poeng for {tall(belop)} kr</div>
        </div>
        {rader.map((r, i) => {
          const start = 104 + i * 36;
          const p = frem(start, 42);
          const synlig = inn(start - 6);
          const erVinner = i === rader.length - 1;
          const seier = erVinner ? inn(start + 50, 10) : 0;
          return (
            <div key={r.navn} style={{ padding: '18px 48px 26px', borderTop: `2px solid ${F.strek}`, opacity: synlig, transform: `translateX(${(1 - synlig) * -50}px)` }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 14 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 12, background: r.farge }} />
                  <span style={{ fontWeight: 600, fontSize: 50, color: F.blekk }}>{r.navn}</span>
                  {erVinner ? (
                    <span style={{ fontWeight: 600, fontSize: 26, letterSpacing: '0.16em', color: F.gull, opacity: seier, transform: `scale(${0.6 + 0.4 * seier})`, transformOrigin: 'left center' }}>
                      FLEST POENG
                    </span>
                  ) : null}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.opptil ? <div style={{ fontWeight: 600, fontSize: 22, letterSpacing: '0.16em', color: F.dempet }}>OPPTIL</div> : null}
                  <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 112, lineHeight: 1, color: erVinner ? F.blekk : F.dempet, fontVariantNumeric: 'tabular-nums' }}>
                    {tall(Math.round(r.poeng * p))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14, height: 30, borderRadius: 15, background: '#efe9db' }}>
                <div style={{ height: '100%', width: `${(r.poeng / vinner.poeng) * 100 * p}%`, borderRadius: 15, background: seier > 0.5 ? F.gullfyll : r.farge }} />
              </div>
            </div>
          );
        })}
      </Kort>

      <div style={{ position: 'absolute', left: 60, top: 500 + 170 + rader.length * 200 + 40, opacity: inn(252, 12) * ut, transform: `translateY(${(1 - inn(252, 12)) * 60}px)` }}>
        <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 140, lineHeight: 1, color: F.gullfyll }}>+{tall(vinner.poeng - nest.poeng)} poeng</div>
        <div style={{ fontWeight: 500, fontSize: 44, color: F.krem, marginTop: 10, opacity: inn(262) }}>med {vinner.navn} – på ett kjøp</div>
      </div>

      <FlyOvergang fra={326} />
      <Avslutning fra={350} linjer={['Sjekk butikken', 'før du handler']} under={`Gratis · ${tall(Math.floor(butikkerTotalt / 100) * 100)}+ nettbutikker`} />
    </Ramme>
  );
};
