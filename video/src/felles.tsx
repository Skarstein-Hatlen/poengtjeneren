import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Barlow fra nettsiden (OFL), lastet fra public/fonter så videoen ser lik ut overalt.
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

export const tall = (n: number) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(n);

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
