import type { Land } from '../data/types';

/** Nordiske korsflagg som små SVG-er – emoji-flagg vises ikke på Windows. */
const FLAGG: Record<Land, { bunn: string; kors: string; indre?: string }> = {
  NO: { bunn: '#ba0c2f', kors: '#ffffff', indre: '#00205b' },
  SE: { bunn: '#006aa7', kors: '#fecc02' },
  DK: { bunn: '#c8102e', kors: '#ffffff' },
};

export default function Flagg({ land }: { land: Land }) {
  const f = FLAGG[land];
  return (
    <svg viewBox="0 0 22 16" width="22" height="16" aria-hidden="true">
      <rect width="22" height="16" fill={f.bunn} />
      <rect x="6" width="4" height="16" fill={f.kors} />
      <rect y="6" width="22" height="4" fill={f.kors} />
      {f.indre && (
        <>
          <rect x="7" width="2" height="16" fill={f.indre} />
          <rect y="7" width="22" height="2" fill={f.indre} />
        </>
      )}
    </svg>
  );
}
