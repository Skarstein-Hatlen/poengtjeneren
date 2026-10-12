import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import data from './data.json';
import { F, Fly, tall } from './felles';

// «Samme kjøp, tre svar»: én butikk, 1 000 kr, programmene teller opp og vinneren kommer sist.
// 15 sekunder: krok (0–2,5 s), kortet med tallene (2,5–8 s), forskjellen (8–11 s), avslutning (11–15 s).
// Innholdet holdes mellom y 250 og 1600, unna navn, knapper og tekstfelt i Reels og TikTok.

const klamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const smal = "'Barlow Condensed', sans-serif";
const vanlig = "'Barlow', sans-serif";

export const SammeKjop = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = (start: number, damping = 14) => spring({ frame: frame - start, fps, config: { damping } });
  const { butikk, rader, belop, butikkerTotalt } = data;
  const vinner = rader[rader.length - 1];
  const nest = rader[rader.length - 2];

  // Kroken flytter seg opp og blir mindre når kortet kommer.
  const opp = interpolate(frame, [64, 86], [0, 1], { ...klamp, easing: Easing.inOut(Easing.cubic) });
  const ut = interpolate(frame, [326, 344], [1, 0], klamp);
  const flyX = interpolate(frame, [326, 372], [-260, 1340], { ...klamp, easing: Easing.inOut(Easing.quad) });

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 28%, #143272 0%, ${F.navy} 62%)`, fontFamily: vanlig }}>
      {/* Merkevaren øverst */}
      <div style={{ position: 'absolute', left: 60, top: 196, display: 'flex', alignItems: 'center', gap: 18, opacity: inn(0, 20) }}>
        <Fly storrelse={58} farge={F.krem} vinkel={45} />
        <span style={{ fontFamily: smal, fontWeight: 600, fontSize: 48, letterSpacing: '0.12em', color: F.krem }}>POINTMAXING</span>
      </div>

      {/* Krok */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: interpolate(opp, [0, 1], [700, 300]),
          transform: `scale(${interpolate(opp, [0, 1], [1, 0.56])})`,
          transformOrigin: 'left top',
          opacity: ut,
        }}
      >
        <div style={{ position: 'absolute', top: -58, whiteSpace: 'nowrap', fontWeight: 600, fontSize: 34, letterSpacing: '0.16em', color: F.gullfyll, opacity: inn(12) * (1 - opp) }}>
          {tall(belop)} KR I HANDLEKURVEN
        </div>
        {['Handler du', `på ${butikk.navn}?`].map((linje, i) => (
          <div
            key={linje}
            style={{
              fontFamily: smal,
              fontWeight: 700,
              fontSize: 156,
              lineHeight: 1,
              color: i ? F.gullfyll : F.krem,
              opacity: inn(i * 7),
              transform: `translateY(${(1 - inn(i * 7)) * 70}px)`,
            }}
          >
            {linje}
          </div>
        ))}
      </div>

      {/* Kortet med tallene */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 500,
          width: 960,
          background: F.papir,
          borderRadius: 36,
          overflow: 'hidden',
          opacity: inn(84, 16) * ut,
          transform: `translateY(${(1 - inn(84, 16)) * 140}px)`,
        }}
      >
        <div style={{ height: 12, background: F.gullfyll }} />
        <div style={{ padding: '28px 48px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 230, height: 108, background: '#fff', border: '2px solid #e4ddcc', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {butikk.logo ? <Img src={staticFile(butikk.logo)} style={{ maxWidth: 180, maxHeight: 74, objectFit: 'contain' }} /> : null}
          </div>
          <div style={{ fontWeight: 500, fontSize: 34, color: F.dempet }}>Poeng for {tall(belop)} kr</div>
        </div>
        {rader.map((r, i) => {
          const start = 104 + i * 36;
          const p = interpolate(frame, [start, start + 42], [0, 1], { ...klamp, easing: Easing.out(Easing.cubic) });
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
      </div>

      {/* Forskjellen */}
      <div style={{ position: 'absolute', left: 60, top: 1310, opacity: inn(252, 12) * ut, transform: `translateY(${(1 - inn(252, 12)) * 60}px)` }}>
        <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 140, lineHeight: 1, color: F.gullfyll }}>+{tall(vinner.poeng - nest.poeng)} poeng</div>
        <div style={{ fontWeight: 500, fontSize: 44, color: F.krem, marginTop: 10, opacity: inn(262) }}>
          med {vinner.navn} – på ett kjøp
        </div>
      </div>

      {/* Flyet krysser bildet mellom scenene */}
      <div style={{ position: 'absolute', left: flyX, top: 880, opacity: frame > 326 && frame < 372 ? 1 : 0 }}>
        <Fly storrelse={220} farge={F.gullfyll} vinkel={90} />
      </div>

      {/* Avslutning */}
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 60px', opacity: inn(350, 14) }}>
        <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 132, lineHeight: 1.02, color: F.krem, transform: `translateY(${(1 - inn(350, 14)) * 70}px)` }}>
          Sjekk butikken
          <br />
          <span style={{ color: F.gullfyll }}>før du handler</span>
        </div>
        <div style={{ marginTop: 56, background: F.papir, borderRadius: 36, overflow: 'hidden', opacity: inn(364), transform: `scale(${0.92 + 0.08 * inn(364)})`, transformOrigin: 'left center' }}>
          <div style={{ height: 12, background: F.gullfyll }} />
          <div style={{ padding: '40px 52px 46px' }}>
            <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 124, lineHeight: 1, color: F.blekk }}>pointmaxing.no</div>
            <div style={{ marginTop: 18, fontWeight: 500, fontSize: 38, color: F.dempet }}>
              Gratis · {tall(Math.floor(butikkerTotalt / 100) * 100)}+ nettbutikker
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
