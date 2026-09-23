/** Flyet i merket, uten bakgrunn – til toppen av siden ved siden av ordmerket. Samme form som public/favicon.svg. */
export const FLY = 'M50 4 Q58 8 58 26 L58 40 L94 62 L94 71 L58 59 L58 78 L74 91 L74 97 L57 92 L50 95 L43 92 L26 97 L26 91 L42 78 L42 59 L6 71 L6 62 L42 40 L42 26 Q42 8 50 4 Z';

export default function Logo({ storrelse = 28 }: { storrelse?: number }) {
  return (
    <svg className="logo-merke" viewBox="0 0 100 100" width={storrelse} height={storrelse} aria-hidden="true" focusable="false">
      <path fill="currentColor" transform="translate(50 50) rotate(45) translate(-50 -50)" d={FLY} />
    </svg>
  );
}
