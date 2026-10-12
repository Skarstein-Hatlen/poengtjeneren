import { loadFont } from '@remotion/fonts';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

// Barlow fra nettsiden (OFL), lastet fra public/fonter så videoene ser like ut overalt.
for (const [fil, family, weight] of [
  ['Barlow-Regular.ttf', 'Barlow', '400'],
  ['Barlow-Medium.ttf', 'Barlow', '500'],
  ['Barlow-SemiBold.ttf', 'Barlow', '600'],
  ['BarlowCondensed-SemiBold.ttf', 'Barlow Condensed', '600'],
  ['BarlowCondensed-Bold.ttf', 'Barlow Condensed', '700'],
] as const) {
  loadFont({ family, url: staticFile(`fonter/${fil}`), weight });
}

export const F = {
  navy: '#0b1f4b',
  krem: '#faf7f0',
  papir: '#faf7f0',
  blekk: '#13203d',
  dempet: '#6d7385',
  strek: '#d8d1c0',
  gull: '#a5780b',
  gullfyll: '#f0c14b',
  lys: '#8ea0c4',
};
export const smal = "'Barlow Condensed', sans-serif";
export const vanlig = "'Barlow', sans-serif";
export const klamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const fmt = (des: number) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: des, minimumFractionDigits: 0 });
export const tall = (n: number, des = 0) => fmt(des).format(n);
/** Poeng per 100 kr som på siden: én desimal under 100. */
export const per100Tekst = (v: number) => tall(v, v >= 100 ? 0 : 1);

/** Fjærende inngang fra et gitt bilde (0 → 1). */
export function useInn() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (start: number, damping = 14) => spring({ frame: frame - start, fps, config: { damping } });
}
/** Lineær fremdrift mellom to bilder, med myk slutt. */
export function useFrem() {
  const frame = useCurrentFrame();
  return (start: number, lengde: number) => interpolate(frame, [start, start + lengde], [0, 1], { ...klamp, easing: Easing.out(Easing.cubic) });
}

/** Flyet fra logoen. */
export const Fly = ({ storrelse, farge, vinkel = 45 }: { storrelse: number; farge: string; vinkel?: number }) => (
  <svg width={storrelse} height={storrelse} viewBox="0 0 100 100" style={{ display: 'block' }}>
    <path
      d="M50 4 Q58 8 58 26 L58 40 L94 62 L94 71 L58 59 L58 78 L74 91 L74 97 L57 92 L50 95 L43 92 L26 97 L26 91 L42 78 L42 59 L6 71 L6 62 L42 40 L42 26 Q42 8 50 4 Z"
      fill={farge}
      transform={`rotate(${vinkel} 50 50)`}
    />
  </svg>
);

/** Bakgrunn og merkevaren øverst. Innholdet holdes mellom y 250 og 1600 (Reels og TikTok legger knapper og tekst utenfor). */
export const Ramme = ({ children }: { children: ReactNode }) => {
  const inn = useInn();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 28%, #143272 0%, ${F.navy} 62%)`, fontFamily: vanlig }}>
      <div style={{ position: 'absolute', left: 60, top: 196, display: 'flex', alignItems: 'center', gap: 18, opacity: inn(0, 20) }}>
        <Fly storrelse={58} farge={F.krem} />
        <span style={{ fontFamily: smal, fontWeight: 600, fontSize: 48, letterSpacing: '0.12em', color: F.krem }}>POINTMAXING</span>
      </div>
      {children}
    </AbsoluteFill>
  );
};

/** Kroken: etikett og to store linjer midt på, som glir opp og blir mindre fra `oppFra`. Forsvinner fra `utFra`. */
export const Krok = ({ etikett, linjer, oppFra, utFra }: { etikett: string; linjer: [string, string]; oppFra: number; utFra: number }) => {
  const frame = useCurrentFrame();
  const inn = useInn();
  const opp = interpolate(frame, [oppFra, oppFra + 22], [0, 1], { ...klamp, easing: Easing.inOut(Easing.cubic) });
  const ut = interpolate(frame, [utFra, utFra + 18], [1, 0], klamp);
  const str = linjer.some((l) => l.length > 13) ? 132 : 156;
  return (
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
        {etikett.toUpperCase()}
      </div>
      {linjer.map((linje, i) => (
        <div
          key={linje}
          style={{ fontFamily: smal, fontWeight: 700, fontSize: str, lineHeight: 1, whiteSpace: 'nowrap', color: i ? F.gullfyll : F.krem, opacity: inn(i * 7), transform: `translateY(${(1 - inn(i * 7)) * 70}px)` }}
        >
          {linje}
        </div>
      ))}
    </div>
  );
};

/** Lyst kort med gul stripe øverst, som på bildene. */
export const Kort = ({ top, children, style }: { top: number; children: ReactNode; style?: CSSProperties }) => (
  <div style={{ position: 'absolute', left: 60, top, width: 960, background: F.papir, borderRadius: 36, overflow: 'hidden', ...style }}>
    <div style={{ height: 12, background: F.gullfyll }} />
    {children}
  </div>
);

/** Hvit logoflis. */
export const Logo = ({ src, navn, b, h }: { src: string | null; navn: string; b: number; h: number }) => (
  <div style={{ width: b, height: h, flex: 'none', background: '#fff', border: '2px solid #e4ddcc', borderRadius: h * 0.18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {src ? (
      <Img src={staticFile(src.replace(/^\//, ''))} style={{ maxWidth: b - h * 0.36, maxHeight: h * 0.68, objectFit: 'contain' }} />
    ) : (
      <span style={{ fontFamily: smal, fontWeight: 700, fontSize: h * 0.55, color: F.blekk }}>{navn.charAt(0).toUpperCase()}</span>
    )}
  </div>
);

/** Flyet krysser bildet som overgang. */
export const FlyOvergang = ({ fra, lengde = 46 }: { fra: number; lengde?: number }) => {
  const frame = useCurrentFrame();
  if (frame < fra || frame > fra + lengde) return null;
  const x = interpolate(frame, [fra, fra + lengde], [-260, 1340], { ...klamp, easing: Easing.inOut(Easing.quad) });
  return (
    <div style={{ position: 'absolute', left: x, top: 880 }}>
      <Fly storrelse={220} farge={F.gullfyll} vinkel={90} />
    </div>
  );
};

/** Avslutning: to linjer og kortet med pointmaxing.no. */
export const Avslutning = ({ fra, linjer, under }: { fra: number; linjer: [string, string]; under: string }) => {
  const inn = useInn();
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 60px', opacity: inn(fra, 14) }}>
      <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 132, lineHeight: 1.02, color: F.krem, transform: `translateY(${(1 - inn(fra, 14)) * 70}px)` }}>
        {linjer[0]}
        <br />
        <span style={{ color: F.gullfyll }}>{linjer[1]}</span>
      </div>
      <div style={{ marginTop: 56, background: F.papir, borderRadius: 36, overflow: 'hidden', opacity: inn(fra + 14), transform: `scale(${0.92 + 0.08 * inn(fra + 14)})`, transformOrigin: 'left center' }}>
        <div style={{ height: 12, background: F.gullfyll }} />
        <div style={{ padding: '40px 52px 46px' }}>
          <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 124, lineHeight: 1, color: F.blekk }}>pointmaxing.no</div>
          <div style={{ marginTop: 18, fontWeight: 500, fontSize: 38, color: F.dempet }}>{under}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
