import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Avslutning, F, FlyOvergang, Krok, Ramme, klamp, smal, tall, useFrem, useInn } from './felles';

// «Kortduellen»: to kort side om side ved samme kortbruk – poeng i året, pris i året og pris per poeng teller opp,
// og kortet som er billigst per poeng får gul ramme. 16 sekunder.

export type KortProps = {
  kortbruk: number;
  vinner: string;
  kort: { id: string; navn: string; per100: number; prisPerMnd: number; poeng: number; ore: number | null; bilde: string | null }[];
  butikkerTotalt: number;
};

const STAT_FRA = [128, 172, 216];

export const Kortduell = ({ kortbruk, vinner, kort }: KortProps) => {
  const frame = useCurrentFrame();
  const inn = useInn();
  const frem = useFrem();
  const ut = interpolate(frame, [348, 366], [1, 0], klamp);
  const seier = inn(262, 11);
  const vinnerKort = kort.find((k) => k.id === vinner) ?? kort[0];

  const stat = (etikett: string, verdi: string, i: number, vant: boolean) => (
    <div style={{ marginTop: 22, opacity: inn(STAT_FRA[i] - 6) }}>
      <div style={{ fontWeight: 600, fontSize: 22, letterSpacing: '0.16em', color: F.dempet }}>{etikett.toUpperCase()}</div>
      <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 70, lineHeight: 1.05, color: i === 2 && seier > 0.5 ? (vant ? F.blekk : F.dempet) : F.blekk, fontVariantNumeric: 'tabular-nums' }}>{verdi}</div>
    </div>
  );

  return (
    <Ramme>
      <Krok etikett="Kortduellen" linjer={['Hvilket kort gir', 'mest for pengene?']} oppFra={66} utFra={348} />

      <div style={{ position: 'absolute', left: 60, top: 500, width: 960, display: 'flex', gap: 30, opacity: ut }}>
        {kort.map((k, i) => {
          const synlig = inn(88 + i * 10, 16);
          const vant = k.id === vinner;
          const pris = k.prisPerMnd * 12;
          return (
            <div
              key={k.id}
              style={{
                position: 'relative',
                flex: 1,
                background: F.papir,
                borderRadius: 32,
                padding: '26px 26px 30px',
                opacity: synlig,
                transform: `translateY(${(1 - synlig) * 140}px)`,
                boxShadow: vant ? `0 0 0 ${8 * seier}px ${F.gullfyll}` : 'none',
              }}
            >
              <div style={{ height: 262, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {k.bilde ? <Img src={staticFile(k.bilde.replace(/^\//, ''))} style={{ width: '100%', maxHeight: 262, objectFit: 'contain', borderRadius: 14 }} /> : null}
              </div>
              <div style={{ marginTop: 18, fontWeight: 600, fontSize: 40, lineHeight: 1.15, color: F.blekk, minHeight: 92 }}>{k.navn}</div>
              {stat('Poeng i året', tall(Math.round(k.poeng * frem(STAT_FRA[0], 40))), 0, vant)}
              {stat('Pris i året', pris ? `${tall(Math.round(pris * frem(STAT_FRA[1], 40)))} kr` : 'Gratis', 1, vant)}
              {stat('Pris per poeng', k.ore === null ? '–' : k.ore === 0 ? '0 øre' : `${tall(k.ore * frem(STAT_FRA[2], 40), 1)} øre`, 2, vant)}
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', left: 60, right: 60, top: 1352, opacity: ut }}>
        <div style={{ fontWeight: 500, fontSize: 34, color: F.lys, opacity: inn(120) }}>Ved {tall(kortbruk)} kr i kortbruk i året</div>
        <div style={{ marginTop: 14, fontWeight: 600, fontSize: 52, color: F.gullfyll, opacity: seier, transform: `translateY(${(1 - seier) * 30}px)` }}>
          Mest for pengene: {vinnerKort.navn}
        </div>
      </div>

      <FlyOvergang fra={348} />
      <Avslutning fra={372} linjer={['Finn kortet', 'som passer deg']} under="Poeng i året og pris per poeng for alle kortene" />
    </Ramme>
  );
};
